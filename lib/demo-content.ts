import type { EmpathyFlagInput } from "@/lib/schemas";

export interface Demo {
  content: string;
  flags: EmpathyFlagInput[];
}

// ---------------------------------------------------------------------------
// Demo 1 — DevOps / Infrastructure
// ---------------------------------------------------------------------------

const INFRA_CONTENT = `<p>We migrated the checkout service from our monolith to a gRPC microservice running on k8s last quarter. The new service handles tokenization via our PCI-compliant vault and falls back to the legacy REST gateway if the circuit breaker trips. P99 latency dropped from 820ms to 210ms after we moved to connection pooling with PgBouncer.</p><p>As part of this effort, the SRE team updated our SLOs to reflect the new architecture. The error budget for the checkout flow is now 99.95% over a 30-day rolling window, measured via synthetic probes hitting the canary deployment. If burn rate exceeds 6x, PagerDuty escalates to the on-call using our custom runbook automation built on Temporal workflows.</p><p>Next steps: the platform team is planning to decompose the order aggregate into event-sourced projections using CDC from the primary Postgres cluster. This will let downstream consumers (e.g., the analytics pipeline and the billing reconciliation job) subscribe to domain events via Kafka instead of polling the read replicas. ETA is Q3 pending headcount approval from the PMO.</p>`;

const INFRA_FLAGS: EmpathyFlagInput[] = [
  {
    exact_phrase: "gRPC",
    reason:
      "gRPC is a specific remote procedure call framework. Readers outside backend infrastructure may not know what it is or why it matters compared to REST.",
    suggestion:
      "Briefly explain that gRPC is a high-performance communication protocol between services, or link to documentation.",
  },
  {
    exact_phrase: "k8s",
    reason:
      '"k8s" is an abbreviation for Kubernetes that is common inside infrastructure teams but opaque to many engineers and non-technical stakeholders.',
    suggestion:
      'Write out "Kubernetes (k8s)" on first use, or link to your internal infrastructure guide.',
  },
  {
    exact_phrase: "circuit breaker",
    reason:
      'Circuit breaker is a software resilience pattern. Readers unfamiliar with distributed systems patterns won\'t understand what "trips" means in this context.',
    suggestion:
      'Add a brief parenthetical: "the circuit breaker (a failsafe that redirects traffic when the new service is unhealthy)."',
  },
  {
    exact_phrase: "P99 latency",
    reason:
      "P99 refers to the 99th-percentile response time. This is a common performance metric inside SRE teams but is not universally understood.",
    suggestion:
      'Define on first use: "P99 latency (the response time that 99% of requests are faster than)."',
  },
  {
    exact_phrase: "PgBouncer",
    reason:
      "PgBouncer is a specific connection pooling tool for PostgreSQL. Naming it without context assumes the reader knows the Postgres ecosystem tooling.",
    suggestion:
      'Introduce it with context: "connection pooling with PgBouncer, a lightweight proxy for PostgreSQL."',
  },
  {
    exact_phrase: "SLOs",
    reason:
      "SLO (Service Level Objective) is an SRE concept. Readers from product, design, or frontend teams may not know the distinction between SLO, SLA, and SLI.",
    suggestion:
      'Expand the acronym on first use: "Service Level Objectives (SLOs)."',
  },
  {
    exact_phrase: "burn rate exceeds 6x",
    reason:
      '"Burn rate" in the context of error budgets is a specialized SRE concept. The "6x" multiplier is meaningless without explaining what baseline it refers to.',
    suggestion:
      "Explain that burn rate measures how quickly the error budget is being consumed, and what 6x means relative to the allowed threshold.",
  },
  {
    exact_phrase: "CDC",
    reason:
      "CDC (Change Data Capture) is a data engineering pattern that is not common knowledge outside data platform teams.",
    suggestion:
      'Expand the acronym and provide a one-line explanation: "Change Data Capture (CDC) — a pattern that streams database changes as events."',
  },
];

// ---------------------------------------------------------------------------
// Demo 2 — Product / Strategy
// ---------------------------------------------------------------------------

const PRODUCT_CONTENT = `<p>We're shifting our north star metric from MAU to weekly active usage after the JTBD research surfaced that our power users follow a land-and-expand pattern. The current RICE scores for Q3 are skewed because we haven't weighted reach against our revised TAM since the mid-market pivot.</p><p>Product and growth are aligned on a PLG motion for the self-serve tier, which means we need to deprecate the MQL-to-SQL handoff in the current funnel and replace it with a PQL-based activation model. The CS team flagged that our NRR dipped below 110% last quarter, partly because churn in the SMB cohort is masking expansion revenue in mid-market.</p><p>For the roadmap, I've used MoSCoW prioritization to triage the backlog. The P0 items map to our enterprise OKR around reducing time-to-value, which ELT approved in the last QBR. We'll validate direction with a painted-door test before committing engineering resources to the full build.</p>`;

const PRODUCT_FLAGS: EmpathyFlagInput[] = [
  {
    exact_phrase: "north star metric",
    reason:
      "\"North star metric\" is a product strategy term for the single KPI a team optimizes around. Engineers and designers may not know which metric it refers to or why it's privileged over others.",
    suggestion:
      "Name the actual metric and briefly explain why it was chosen: \"our primary success metric (weekly active usage).\"",
  },
  {
    exact_phrase: "JTBD",
    reason:
      "JTBD (Jobs To Be Done) is a product research framework. Team members outside product management may not recognize the acronym or the methodology behind it.",
    suggestion:
      "Expand on first use: \"Jobs To Be Done (JTBD) research\" and consider linking to the research findings.",
  },
  {
    exact_phrase: "RICE scores",
    reason:
      "RICE (Reach, Impact, Confidence, Effort) is a prioritization framework used by some product teams. Not everyone on the team will know what the letters stand for or how scoring works.",
    suggestion:
      "Expand the acronym on first use and briefly explain what a high or low score means for prioritization.",
  },
  {
    exact_phrase: "TAM",
    reason:
      "TAM (Total Addressable Market) is a business strategy term. Engineers and designers are unlikely to know the current TAM figure or why it changed after the pivot.",
    suggestion:
      "Write out \"Total Addressable Market (TAM)\" and include the relevant figure or link to the market analysis.",
  },
  {
    exact_phrase: "PLG",
    reason:
      "PLG (Product-Led Growth) is a go-to-market strategy where the product itself drives acquisition and conversion. This concept may be unfamiliar outside product and growth teams.",
    suggestion:
      "Expand to \"Product-Led Growth (PLG)\" and add a one-line explanation of what it means for the team's work.",
  },
  {
    exact_phrase: "MQL-to-SQL handoff",
    reason:
      "MQL (Marketing Qualified Lead) and SQL (Sales Qualified Lead) are sales funnel stages. This terminology is standard in revenue ops but opaque to engineering and design.",
    suggestion:
      "Spell out the acronyms and briefly describe the handoff process being replaced.",
  },
  {
    exact_phrase: "NRR",
    reason:
      "NRR (Net Revenue Retention) is a SaaS metric that measures revenue kept from existing customers including expansion and churn. Most of the team won't know the benchmark or why 110% matters.",
    suggestion:
      "Expand to \"Net Revenue Retention (NRR)\" and explain what the 110% threshold means for the business.",
  },
  {
    exact_phrase: "painted-door test",
    reason:
      "A painted-door test (also called a fake-door test) is a validation technique where you present a feature entry point that doesn't exist yet to gauge interest. This is not widely known outside product and growth.",
    suggestion:
      "Briefly explain the technique: \"a painted-door test (a mock feature entry point that measures user interest before we build it).\"",
  },
];

// ---------------------------------------------------------------------------
// Demo 3 — Design / UX
// ---------------------------------------------------------------------------

const DESIGN_CONTENT = `<p>The audit flagged several Gestalt violations in the dashboard redesign — the proximity grouping between the filter bar and the data table creates a false affordance that suggests they're a single interactive unit. We need to revisit the information architecture and introduce a clear visual hierarchy using our spacing tokens from the design system.</p><p>During the heuristic evaluation, we found that the onboarding flow violates the recognition-over-recall principle. Users are expected to remember configuration choices from three steps prior with no persistent wayfinding. The cognitive load is compounded by a lack of progressive disclosure — we're front-loading every option instead of surfacing them contextually.</p><p>I've updated the hi-fi mocks in Figma to address the critical usability issues. The revised flow uses a stepper pattern with microcopy at each decision point, and I've adjusted the type ramp to improve scannability. Next step is a moderated think-aloud study with 5–7 participants to validate the updated IA before we hand off redlines to engineering.</p>`;

const DESIGN_FLAGS: EmpathyFlagInput[] = [
  {
    exact_phrase: "Gestalt violations",
    reason:
      "Gestalt principles (proximity, similarity, closure, etc.) come from perceptual psychology. Engineers and PMs are unlikely to know which specific principle is being violated or why it matters for usability.",
    suggestion:
      "Name the specific principle: \"the layout breaks the Gestalt principle of proximity — related controls should be grouped together visually.\"",
  },
  {
    exact_phrase: "affordance",
    reason:
      "\"Affordance\" is a term from interaction design (originally cognitive psychology) for the perceived action an element invites. Non-designers may confuse it with general \"functionality.\"",
    suggestion:
      "Replace with a plain description: \"creates a misleading visual cue that suggests they can be interacted with as one unit.\"",
  },
  {
    exact_phrase: "information architecture",
    reason:
      "Information architecture (IA) is a UX discipline focused on organizing and labeling content. Readers outside design may not know how it differs from UI layout or navigation.",
    suggestion:
      "Add a brief parenthetical: \"the information architecture (how content and navigation are organized).\"",
  },
  {
    exact_phrase: "spacing tokens",
    reason:
      "Design tokens are named values (spacing, color, typography) that encode design decisions for reuse across platforms. Engineers not using the design system directly may not know what tokens are or where to find them.",
    suggestion:
      "Link to the design system and explain: \"spacing tokens (the standardized spacing values defined in our design system).\"",
  },
  {
    exact_phrase: "heuristic evaluation",
    reason:
      "A heuristic evaluation is a UX inspection method where reviewers assess an interface against established usability principles. This is a specialized UX research technique.",
    suggestion:
      "Briefly explain: \"a heuristic evaluation (a structured review of the interface against established usability best practices).\"",
  },
  {
    exact_phrase: "recognition-over-recall",
    reason:
      "Recognition over recall is one of Jakob Nielsen's 10 usability heuristics. Non-designers won't know the heuristic by name or its implications for interface design.",
    suggestion:
      "Explain the principle in context: \"users should be able to see their options rather than having to remember them from earlier steps.\"",
  },
  {
    exact_phrase: "progressive disclosure",
    reason:
      "Progressive disclosure is a UX pattern where complexity is revealed gradually. The term is standard in design but not widely known in engineering or product management.",
    suggestion:
      "Describe the pattern: \"progressive disclosure (showing only the most relevant options first and revealing advanced settings as needed).\"",
  },
  {
    exact_phrase: "redlines",
    reason:
      "Redlines (or redline specs) are annotated design documents showing exact measurements, colors, and spacing for engineering handoff. This term is specific to the design-to-development workflow.",
    suggestion:
      "Use a more widely understood term: \"annotated design specs\" or \"detailed implementation specs.\"",
  },
];

// ---------------------------------------------------------------------------
// Demo 4 — Frontend / Web Engineering
// ---------------------------------------------------------------------------

const FRONTEND_CONTENT = `<p>We're migrating the dashboard from client-side rendering to RSCs to cut the bundle size by around 40%. The main blocker is the analytics widget — it relies on useEffect for data fetching on mount, which won't work in a server component. We'll refactor it into a server component with a Suspense boundary wrapping a client island for the interactive chart.</p><p>Build performance is another concern. Our current Webpack config does aggressive tree-shaking, but switching to Turbopack means we lose the custom loader pipeline that handles our SVG sprite system. We're also hitting hydration mismatches in staging because the i18n provider renders different locale strings on server vs. client. ISR with a 60-second revalidation window should fix the stale content without blowing up our edge function cold starts.</p><p>For state management, we're replacing Redux with React context for UI state and TanStack Query for server state. The current selector pattern causes unnecessary re-renders because the store isn't normalized — components subscribe to the entire slice instead of derived values. We'll also add optimistic updates on mutations so the UI feels instant even on high-latency connections.</p>`;

const FRONTEND_FLAGS: EmpathyFlagInput[] = [
  {
    exact_phrase: "RSCs",
    reason:
      "RSC (React Server Component) is a React architecture concept that changes where components render. Designers, PMs, and even backend engineers may not know what RSCs are or why they reduce bundle size.",
    suggestion:
      "Expand on first use: \"React Server Components (RSCs)\" and briefly explain the benefit in plain terms.",
  },
  {
    exact_phrase: "Suspense boundary",
    reason:
      "Suspense is a React concurrent rendering feature that manages loading states declaratively. The term \"boundary\" implies knowledge of React's component tree model.",
    suggestion:
      "Explain briefly: \"a Suspense boundary (a React wrapper that shows a loading state while the content inside it is still being fetched).\"",
  },
  {
    exact_phrase: "client island",
    reason:
      "\"Client island\" (or \"island of interactivity\") is an architecture pattern where most of the page is static HTML and only specific interactive sections load JavaScript. This concept is not widely known outside frontend.",
    suggestion:
      "Describe the pattern: \"a small interactive section (client island) that loads JavaScript only for the chart.\"",
  },
  {
    exact_phrase: "tree-shaking",
    reason:
      "Tree-shaking is a build optimization that removes unused code from the final bundle. Non-frontend engineers and designers won't know the term or why it matters for performance.",
    suggestion:
      "Explain in context: \"tree-shaking (automatically removing unused code from the final bundle).\"",
  },
  {
    exact_phrase: "hydration mismatches",
    reason:
      "Hydration is the process where client-side JavaScript takes over server-rendered HTML. A \"mismatch\" means the server and client produced different output, causing visual glitches. This is a nuanced frontend concept.",
    suggestion:
      "Explain the issue: \"hydration mismatches (the server-rendered HTML doesn't match what the client expects, causing visual bugs).\"",
  },
  {
    exact_phrase: "ISR",
    reason:
      "ISR (Incremental Static Regeneration) is a Next.js feature that regenerates static pages in the background. This is framework-specific terminology.",
    suggestion:
      "Expand the acronym: \"Incremental Static Regeneration (ISR)\" and briefly explain that it refreshes cached pages without a full rebuild.",
  },
  {
    exact_phrase: "edge function cold starts",
    reason:
      "Edge functions run at CDN nodes close to users, and \"cold starts\" refers to the latency penalty when a function hasn't been invoked recently. Both concepts assume familiarity with serverless deployment models.",
    suggestion:
      "Explain: \"edge function cold starts (the delay when a serverless function at the CDN needs to initialize from scratch).\"",
  },
  {
    exact_phrase: "optimistic updates",
    reason:
      "Optimistic updates is a UI pattern where the interface immediately reflects a change before the server confirms it. Non-frontend team members may not know the term or the tradeoffs involved.",
    suggestion:
      "Describe the technique: \"optimistic updates (immediately showing the change in the UI while the server processes it in the background).\"",
  },
];

// ---------------------------------------------------------------------------
// Assembled demo set
// ---------------------------------------------------------------------------

export const DEMOS: Demo[] = [
  { content: INFRA_CONTENT, flags: INFRA_FLAGS },
  { content: PRODUCT_CONTENT, flags: PRODUCT_FLAGS },
  { content: DESIGN_CONTENT, flags: DESIGN_FLAGS },
  { content: FRONTEND_CONTENT, flags: FRONTEND_FLAGS },
];

// Backward-compatible named exports (used by tests)
export const DEMO_CONTENT = DEMOS[0].content;
export const DEMO_FLAGS = DEMOS[0].flags;
