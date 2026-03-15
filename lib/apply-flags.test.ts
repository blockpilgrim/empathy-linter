/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import EmpathyFlag from "./empathy-extension";
import { applyFlags } from "./apply-flags";
import type { EmpathyFlagInput } from "./schemas";

/** Create a minimal TipTap editor with the empathy flag extension. */
function createTestEditor(content: string): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
      }),
      EmpathyFlag,
    ],
    content,
  });
}

/** Count empathyFlag marks in the document. */
function countMarks(editor: Editor): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.isText) {
      count += node.marks.filter((m) => m.type.name === "empathyFlag").length;
    }
  });
  return count;
}

/** Collect all empathyFlag marks with their text and attributes. */
function collectMarks(
  editor: Editor
): Array<{ text: string; reason: string; suggestion: string }> {
  const marks: Array<{ text: string; reason: string; suggestion: string }> = [];
  editor.state.doc.descendants((node) => {
    if (node.isText) {
      const mark = node.marks.find((m) => m.type.name === "empathyFlag");
      if (mark) {
        marks.push({
          text: node.text!,
          reason: mark.attrs.reason,
          suggestion: mark.attrs.suggestion,
        });
      }
    }
  });
  return marks;
}

describe("applyFlags", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("applies a single flag to matching text", () => {
    editor = createTestEditor("<p>Deploy the canary build to staging.</p>");
    const flags: EmpathyFlagInput[] = [
      {
        exact_phrase: "canary build",
        reason: "Assumes deployment knowledge",
        suggestion: "Explain canary deployments",
      },
    ];

    applyFlags(editor, flags);

    const marks = collectMarks(editor);
    expect(marks).toHaveLength(1);
    expect(marks[0].text).toBe("canary build");
    expect(marks[0].reason).toBe("Assumes deployment knowledge");
    expect(marks[0].suggestion).toBe("Explain canary deployments");
  });

  it("applies multiple flags in a single pass", () => {
    editor = createTestEditor(
      "<p>Deploy the canary build to the staging cluster.</p>"
    );

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "r1", suggestion: "s1" },
      { exact_phrase: "staging cluster", reason: "r2", suggestion: "s2" },
    ]);

    expect(countMarks(editor)).toBe(2);
  });

  it("removes existing marks before applying new ones", () => {
    editor = createTestEditor("<p>Deploy the canary build to staging.</p>");

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "old", suggestion: "old" },
    ]);
    expect(countMarks(editor)).toBe(1);

    applyFlags(editor, [
      { exact_phrase: "staging", reason: "new", suggestion: "new" },
    ]);

    const marks = collectMarks(editor);
    expect(marks).toHaveLength(1);
    expect(marks[0].text).toBe("staging");
    expect(marks[0].reason).toBe("new");
  });

  it("silently skips phrases not found in the document", () => {
    editor = createTestEditor("<p>Simple text here.</p>");

    applyFlags(editor, [
      { exact_phrase: "nonexistent phrase", reason: "r", suggestion: "s" },
    ]);

    expect(countMarks(editor)).toBe(0);
  });

  it("skips flags with empty exact_phrase", () => {
    editor = createTestEditor("<p>Some text.</p>");

    applyFlags(editor, [
      { exact_phrase: "", reason: "r", suggestion: "s" },
    ]);

    expect(countMarks(editor)).toBe(0);
  });

  it("handles empty flags array without error", () => {
    editor = createTestEditor("<p>Some text.</p>");

    expect(() => applyFlags(editor, [])).not.toThrow();
    expect(editor.getText()).toBe("Some text.");
  });

  it("only flags the first occurrence of a repeated phrase", () => {
    editor = createTestEditor(
      "<p>The API connects to the API gateway via the API proxy.</p>"
    );

    applyFlags(editor, [
      { exact_phrase: "API", reason: "r", suggestion: "s" },
    ]);

    expect(countMarks(editor)).toBe(1);
  });

  it("does not match phrases across paragraph boundaries", () => {
    editor = createTestEditor(
      "<p>Deploy the canary</p><p>build to staging.</p>"
    );

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "r", suggestion: "s" },
    ]);

    expect(countMarks(editor)).toBe(0);
  });

  it("assigns unique ids to each mark", () => {
    editor = createTestEditor(
      "<p>The canary build uses a staging cluster.</p>"
    );

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "r1", suggestion: "s1" },
      { exact_phrase: "staging cluster", reason: "r2", suggestion: "s2" },
    ]);

    const ids: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.isText) {
        const mark = node.marks.find((m) => m.type.name === "empathyFlag");
        if (mark) ids.push(mark.attrs.id);
      }
    });

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("preserves document text content after applying flags", () => {
    editor = createTestEditor("<p>Deploy the canary build to staging.</p>");
    const textBefore = editor.getText();

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "r", suggestion: "s" },
    ]);

    expect(editor.getText()).toBe(textBefore);
  });

  it("handles multi-paragraph documents", () => {
    editor = createTestEditor(
      "<p>First paragraph with jargon.</p><p>Second paragraph with acronym.</p>"
    );

    applyFlags(editor, [
      { exact_phrase: "jargon", reason: "r1", suggestion: "s1" },
      { exact_phrase: "acronym", reason: "r2", suggestion: "s2" },
    ]);

    expect(countMarks(editor)).toBe(2);
  });

  it("clears all marks when called with empty array after flagged state", () => {
    editor = createTestEditor("<p>Deploy the canary build to staging.</p>");

    applyFlags(editor, [
      { exact_phrase: "canary build", reason: "r", suggestion: "s" },
    ]);
    expect(countMarks(editor)).toBe(1);

    applyFlags(editor, []);
    expect(countMarks(editor)).toBe(0);
  });
});
