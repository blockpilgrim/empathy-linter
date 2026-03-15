import type { Editor as TipTapEditor } from "@tiptap/react";
import type { EmpathyFlagInput } from "./schemas";

/**
 * Block separator inserted between paragraphs when building the searchable
 * text representation. Using newline so that `indexOf` cannot match a phrase
 * that straddles a paragraph boundary (since LLM-returned phrases never
 * contain newlines).
 */
const BLOCK_SEPARATOR = "\n";

/**
 * Pre-built mapping from plain-text offsets to ProseMirror document positions.
 * Built once via a single doc.descendants() walk, then reused for all phrase
 * lookups — eliminates redundant traversals when applying multiple flags.
 */
interface TextMapping {
  /** Full searchable text with block separators between paragraphs. */
  text: string;
  /** Text node entries for offset-to-position translation. */
  nodes: Array<{ textStart: number; textEnd: number; docPos: number }>;
}

/**
 * Walk the document once and build a mapping from plain-text offsets to
 * ProseMirror document positions. Also builds the searchable text string
 * as a byproduct, avoiding a separate doc.textBetween() call.
 */
function buildTextMapping(editor: TipTapEditor): TextMapping {
  const doc = editor.state.doc;
  const nodes: TextMapping["nodes"] = [];
  const textParts: string[] = [];
  let textOffset = 0;
  let isFirstBlock = true;

  doc.descendants((node, pos) => {
    if (node.isBlock && node.isTextblock) {
      if (!isFirstBlock) {
        textParts.push(BLOCK_SEPARATOR);
        textOffset += BLOCK_SEPARATOR.length;
      }
      isFirstBlock = false;
    }

    if (node.isText && node.text) {
      nodes.push({
        textStart: textOffset,
        textEnd: textOffset + node.text.length,
        docPos: pos,
      });
      textParts.push(node.text);
      textOffset += node.text.length;
    }

    return !node.isText;
  });

  return { text: textParts.join(""), nodes };
}

/**
 * Find the document position range for a plain-text substring using
 * a pre-built text mapping. Avoids redundant doc traversals when
 * looking up multiple phrases in the same call.
 *
 * Returns `null` if the phrase is not found.
 */
function findPhraseInMapping(
  mapping: TextMapping,
  phrase: string
): { from: number; to: number } | null {
  const textIndex = mapping.text.indexOf(phrase);
  if (textIndex === -1) return null;

  const targetEnd = textIndex + phrase.length;
  let from: number | null = null;
  let to: number | null = null;

  for (const node of mapping.nodes) {
    if (from === null && textIndex >= node.textStart && textIndex < node.textEnd) {
      from = node.docPos + (textIndex - node.textStart);
    }
    if (to === null && targetEnd > node.textStart && targetEnd <= node.textEnd) {
      to = node.docPos + (targetEnd - node.textStart);
    }
    if (from !== null && to !== null) break;
  }

  if (from !== null && to !== null) {
    return { from, to };
  }
  return null;
}

/**
 * Apply empathy flags to the editor as inline marks.
 *
 * 1. Removes all existing `empathyFlag` marks from the document.
 * 2. For each flag, searches the document text for the `exact_phrase`.
 * 3. If found, applies the `empathyFlag` mark with `id`, `reason`, `suggestion`.
 *
 * All operations are batched into a single ProseMirror transaction to avoid
 * multiple editor re-renders. Uses a pre-built text mapping to avoid redundant
 * document traversals — one walk for all flags instead of two per flag.
 *
 * Edge cases:
 * - If `exact_phrase` appears multiple times, only the first occurrence is flagged.
 * - If `exact_phrase` is not found (e.g., LLM hallucinated), it is silently skipped.
 * - Phrases that would span paragraph boundaries are not matched (by design).
 */
export function applyFlags(
  editor: TipTapEditor,
  flags: EmpathyFlagInput[]
): void {
  const { doc } = editor.state;
  const markType = editor.schema.marks.empathyFlag;
  const { tr } = editor.state;
  const mapping = buildTextMapping(editor);

  // Step 1: Remove all existing empathyFlag marks from the entire document.
  // We walk the document tree and remove marks via a transaction rather than
  // using editor.chain().unsetAllMarks(), which only operates on the selection.
  // removeMark does not change document structure or positions, so all positions
  // remain valid for the subsequent addMark calls in the same transaction.
  let hasChanges = false;

  doc.descendants((node, pos) => {
    if (node.isText) {
      const marks = node.marks.filter((m) => m.type === markType);
      if (marks.length > 0) {
        hasChanges = true;
        marks.forEach((mark) => {
          tr.removeMark(pos, pos + node.nodeSize, mark);
        });
      }
    }
  });

  // Step 2: Apply new flags using the pre-built mapping
  for (const flag of flags) {
    if (!flag.exact_phrase) continue;

    const range = findPhraseInMapping(mapping, flag.exact_phrase);
    if (!range) continue;

    const mark = markType.create({
      id: crypto.randomUUID(),
      reason: flag.reason,
      suggestion: flag.suggestion,
    });

    tr.addMark(range.from, range.to, mark);
    hasChanges = true;
  }

  // Dispatch once — handles both removal and application.
  // Skip if nothing changed to avoid unnecessary re-renders.
  if (hasChanges) {
    editor.view.dispatch(tr);
  }
}
