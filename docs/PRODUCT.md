### PRODUCT.md: Empathy Linter

## Vision

To eliminate the "curse of knowledge" in technical documentation by providing an authoring environment that proactively advocates for the reader's context and comprehension.

## Problem Statement

Engineers and technical writers frequently document complex systems while suffering from expert blind spots. They unknowingly use dense jargon, internal acronyms, or assume prerequisite knowledge that the target reader does not possess. Traditional authoring tools check for spelling, grammar, and markdown syntax, but they fail to check for reader empathy. This results in documentation that is technically accurate but functionally unhelpful, leading to user friction, support tickets, and decreased product adoption.

## Personas

**The Feature Engineer (Primary)**

* **Background:** Deeply technical, understands the system architecture intimately, and moves fast.
* **Goal:** Write a technical proposal, API reference, or release note quickly so they can get back to coding.
* **Pain Point:** Struggles to step back and view their own writing from the perspective of a new user or a junior developer. Often receives feedback that their docs are "too dense" or "assume too much."

**The Technical Writer (Secondary)**

* **Background:** Focused on clarity, structure, and maintaining documentation standards across a wide platform.
* **Goal:** Ensure all documentation is accessible, consistent, and useful to the end-user.
* **Pain Point:** Spends too much time manually reviewing engineering drafts to hunt down unexplained acronyms and missing context links.

## Features

### MVP (Minimum Viable Product)

**1. Ambient Context Scanning**

* **Description:** As the user writes or pastes content into the editor, the system automatically evaluates the text for assumed knowledge, specialized jargon, and missing prerequisites without requiring manual triggers.
* **User Story:** As an author, I want my text evaluated quietly in the background so my writing flow is not interrupted.
* **Acceptance Criteria:** * Text is evaluated automatically.
* Problematic terms or phrases are visually distinguished with a subtle, non-disruptive inline highlight.

**2. Empathy Provocations**

* **Description:** When a user interacts with a flagged term, the system provides a specific reason why the text might alienate the reader and offers a constructive path forward.
* **User Story:** As an author, I want to understand *why* a term was flagged so I can learn to communicate more effectively with my audience.
* **Acceptance Criteria:**
* Clicking a highlighted phrase opens a contextual popover.
* The popover clearly states the risk (e.g., "Assumes knowledge of internal data models").
* The popover provides an actionable suggestion (e.g., "Provide a brief definition or link to the architecture guide").
* The popover can be easily dismissed.

### Post-MVP

**1. Target Audience Selector**

* **Description:** A toggle that adjusts the strictness of the empathy scanning based on the intended reader (e.g., "New Onboarding User" vs. "Senior Infrastructure Engineer").
* **User Story:** As an author, I want to calibrate the feedback based on who will actually be reading this specific document.

**2. Auto-linking Suggestions**

* **Description:** Instead of just suggesting a definition, the system recommends linking the flagged jargon directly to an existing page in the company's documentation knowledge base.
* **User Story:** As a technical writer, I want to effortlessly create interconnected documentation webs without hunting for URLs.

## User Flows

**The Demo Experience Flow**

1. **Entry:** The user lands on the application.
2. **Initial State:** The editor is pre-populated with a highly technical, jargon-dense paragraph. The ambient scanning has already run, and several terms are already highlighted.
3. **Discovery:** The user clicks on a highlighted acronym.
4. **Intervention:** A popover appears, explaining that the acronym is undefined and suggesting a plain-language alternative.
5. **Resolution:** The user edits the text to clarify the term. The highlight disappears, rewarding the empathetic edit.
6. **Exploration:** The user clicks a "Clear Editor" button, pastes their own draft documentation, and watches the system highlight new empathy gaps in real-time.

## Success Metrics

* **Interaction Rate:** The percentage of users who click on at least one highlighted term after loading the demo.
* **Resolution Rate:** The percentage of highlighted terms that are edited or clarified by the user.
* **Time to Value:** The number of seconds between the page loading and the first piece of contextual feedback being displayed.
