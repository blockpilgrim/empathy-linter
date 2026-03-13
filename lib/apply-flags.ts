import type { Editor as TipTapEditor } from "@tiptap/react";

/**
 * Input shape for an empathy flag — matches the LLM output schema.
 * The `id` is generated internally by `applyFlags`, not provided by the caller.
 */
export interface EmpathyFlagInput {
  exact_phrase: string;
  reason: string;
  suggestion: string;
}

/**
 * Find the document position range for a plain-text substring.
 *
 * ProseMirror documents have a position system where structural nodes
 * (paragraphs, etc.) consume positions alongside text characters. This
 * function walks the document tree, accumulating a plain-text offset,
 * and returns the document-level `from`/`to` positions when the target
 * phrase is found.
 *
 * Returns `null` if the phrase is not found in the document text.
 */
function findPhrasePosition(
  editor: TipTapEditor,
  phrase: string
): { from: number; to: number } | null {
  const doc = editor.state.doc;
  const fullText = doc.textContent;

  const textIndex = fullText.indexOf(phrase);
  if (textIndex === -1) return null;

  // Walk the document to map the plain-text offset to document positions.
  // Each text node contributes its length to the running text offset.
  // Non-text nodes (paragraph boundaries, etc.) contribute 0 text characters
  // but DO consume document positions.
  let textOffset = 0;
  let from: number | null = null;
  let to: number | null = null;
  const targetEnd = textIndex + phrase.length;

  doc.descendants((node, pos) => {
    // Short-circuit if we already found both positions
    if (from !== null && to !== null) return false;

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
 * Edge cases:
 * - If `exact_phrase` appears multiple times, only the first occurrence is flagged.
 * - If `exact_phrase` is not found (e.g., LLM hallucinated), it is silently skipped.
 */
export function applyFlags(
  editor: TipTapEditor,
  flags: EmpathyFlagInput[]
): void {
  // Step 1: Remove all existing empathyFlag marks from the entire document.
  // We walk the document tree and remove marks via a transaction rather than
  // using editor.chain().unsetAllMarks(), which only operates on the selection.
  const { doc } = editor.state;
  const markType = editor.schema.marks.empathyFlag;
  const { tr } = editor.state;
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
  editor.view.dispatch(tr);

  // Step 2: Apply new flags
  if (flags.length === 0) return;

  // Build a single transaction for all new marks
  const applyTr = editor.state.tr;
  let appliedAny = false;

  for (const flag of flags) {
    if (!flag.exact_phrase) continue;

    const range = findPhrasePosition(editor, flag.exact_phrase);
    if (!range) continue;

    const mark = markType.create({
      id: crypto.randomUUID(),
      reason: flag.reason,
      suggestion: flag.suggestion,
    });

    applyTr.addMark(range.from, range.to, mark);
    appliedAny = true;
  }

  if (appliedAny) {
    editor.view.dispatch(applyTr);
  }
}
