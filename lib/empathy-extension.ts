import { Mark, mergeAttributes } from "@tiptap/core";

export const EmpathyFlag = Mark.create({
  name: "empathyFlag",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { "data-id": attributes.id };
        },
      },
      reason: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-reason"),
        renderHTML: (attributes) => {
          if (!attributes.reason) return {};
          return { "data-reason": attributes.reason };
        },
      },
      suggestion: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-suggestion"),
        renderHTML: (attributes) => {
          if (!attributes.suggestion) return {};
          return { "data-suggestion": attributes.suggestion };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-empathy-flag]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-empathy-flag": "",
          class: "empathy-highlight",
        },
        HTMLAttributes
      ),
      0,
    ];
  },
});

export default EmpathyFlag;
