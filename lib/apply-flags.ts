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
 * Find the document position range for a plain-text substring.
 *
 * ProseMirror documents have a position system where structural nodes
 * (paragraphs, etc.) consume positions alongside text characters. This
 * function walks the document tree, accumulating a plain-text offset
 * (with block separators between paragraphs), and returns the document-level
 * `from`/`to` positions when the target phrase is found.
 *
 * Phrases must exist entirely within a single paragraph — cross-paragraph
 * matches are prevented by the block separator in the searchable text.
 *
 * Returns `null` if the phrase is not found in the document text.
 */
function findPhrasePosition(
  editor: TipTapEditor,
  phrase: string
): { from: number; to: number } | null {
  const doc = editor.state.doc;

  // Build a searchable text string with block separators between paragraphs.
  // doc.textBetween inserts `blockSeparator` between block nodes, giving us
  // a faithful representation that prevents cross-paragraph false matches.
  const fullText = doc.textBetween(0, doc.content.size, BLOCK_SEPARATOR);

  const textIndex = fullText.indexOf(phrase);
  if (textIndex === -1) return null;

  // Walk the document to map the plain-text offset to document positions.
  // Each text node contributes its length to the running text offset.
  // Block boundaries contribute the separator length to the text offset
  // but are not counted in document positions (they have their own position cost).
  let textOffset = 0;
  let from: number | null = null;
  let to: number | null = null;
  const targetEnd = textIndex + phrase.length;
  let isFirstBlock = true;

  doc.descendants((node, pos) => {
    // Short-circuit if we already found both positions
    if (from !== null && to !== null) return false;

    // Account for block separators between paragraphs
    if (node.isBlock && node.isTextblock) {
      if (!isFirstBlock) {
        textOffset += BLOCK_SEPARATOR.length;
      }
      isFirstBlock = false;
    }

    if (node.isText && node.text) {
      const nodeTextStart = textOffset;
      const nodeTextEnd = textOffset + node.text.length;

      // Check if the phrase start falls within this text node
      if (from === null && textIndex >= nodeTextStart && textIndex < nodeTextEnd) {
        // pos is the document position of the start of this text node.
        // Add the offset within the node to get the exact `from` position.
        from = pos + (textIndex - nodeTextStart);
      }

      // Check if the phrase end falls within this text node
      if (to === null && targetEnd > nodeTextStart && targetEnd <= nodeTextEnd) {
        to = pos + (targetEnd - nodeTextStart);
      }

      textOffset += node.text.length;
    }

    // Don't descend into text nodes (they have no children anyway)
    return !node.isText;
  });

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
 * multiple editor re-renders. This is safe because `removeMark` does not alter
 * document structure or positions — only mark metadata on text nodes.
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

  // Step 1: Remove all existing empathyFlag marks from the entire document.
  // We walk the document tree and remove marks via a transaction rather than
  // using editor.chain().unsetAllMarks(), which only operates on the selection.
  // removeMark does not change document structure or positions, so all positions
  // remain valid for the subsequent addMark calls in the same transaction.
  doc.descendants((node, pos) => {
    if (node.isText) {
      const marks = node.marks.filter((m) => m.type === markType);
      if (marks.length > 0) {
        marks.forEach((mark) => {
          tr.removeMark(pos, pos + node.nodeSize, mark);
        });
      }
    }
  });

  // Step 2: Apply new flags in the same transaction
  for (const flag of flags) {
    if (!flag.exact_phrase) continue;

    const range = findPhrasePosition(editor, flag.exact_phrase);
    if (!range) continue;

    const mark = markType.create({
      id: crypto.randomUUID(),
      reason: flag.reason,
      suggestion: flag.suggestion,
    });

    tr.addMark(range.from, range.to, mark);
  }

  // Dispatch once — handles both removal and application
  editor.view.dispatch(tr);
}
