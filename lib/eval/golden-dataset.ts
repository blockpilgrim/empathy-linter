/**
 * Golden dataset for evaluating empathy linter prompt quality.
 *
 * Each sample is a jargon-heavy paragraph drawn from realistic technical
 * documentation scenarios. The `expectedFlags` annotate which phrases a
 * competent empathy linter SHOULD catch, with the reason each is
 * problematic. The `shouldNotFlag` list captures terms that look
 * technical but are standard enough that flagging them would be a false
 * positive.
 *
 * Evaluation criteria per sample:
 *   - Recall: did the LLM flag every expectedFlags entry?
 *   - Precision: did it avoid flagging shouldNotFlag entries?
 *   - exact_phrase fidelity: does each returned phrase appear verbatim
 *     in the source text?
 *   - Suggestion quality: are suggestions constructive (not rewrites)?
 */

export interface ExpectedFlag {
  /** The exact phrase that should be flagged (verbatim substring of text). */
  exact_phrase: string;
  /** Why this phrase is problematic for non-specialist readers. */
  why: string;
}

export interface GoldenSample {
  /** Short label for identification in evaluation logs. */
  id: string;
  /** The domain this sample represents. */
  domain: string;
  /** The raw text to feed through the linter. */
  text: string;
  /** Phrases a good linter MUST flag. Used to measure recall. */
  expectedFlags: ExpectedFlag[];
  /** Phrases that should NOT be flagged (standard terms). Used to measure precision. */
  shouldNotFlag: string[];
}

// ---------------------------------------------------------------------------
// Sample 1: Kubernetes / Infrastructure Operations
// ---------------------------------------------------------------------------
const kubernetesOps: GoldenSample = {
  id: "k8s-ops",
  domain: "Kubernetes / Infrastructure",
  text: `The CRD controller reconciles the desired state via a level-triggered approach, with exponential backoff on 429s from the API server. When a Pod enters CrashLoopBackOff, the operator emits a Kubernetes Event and increments the restart counter on the StatefulSet status subresource. We use Helm charts managed by ArgoCD for GitOps-style continuous delivery to our EKS clusters.`,
  expectedFlags: [
    {
      exact_phrase: "CRD controller",
      why: "CRD (Custom Resource Definition) is Kubernetes-specific. Readers outside the k8s ecosystem won't know what a CRD controller does.",
    },
    {
      exact_phrase: "level-triggered",
      why: "Level-triggered vs. edge-triggered is a systems programming concept borrowed from interrupt handling. Most readers won't understand the reconciliation model this implies.",
    },
    {
      exact_phrase: "exponential backoff",
      why: "A retry strategy concept common in distributed systems but not universally understood, especially the implications for rate limiting.",
    },
    {
      exact_phrase: "429s",
      why: "HTTP 429 (Too Many Requests) is a specific status code. Written as '429s' it reads as insider shorthand.",
    },
    {
      exact_phrase: "CrashLoopBackOff",
      why: "A Kubernetes-specific Pod state. Readers unfamiliar with k8s won't know what this means or why it matters.",
    },
    {
      exact_phrase: "StatefulSet",
      why: "A Kubernetes workload resource type. Assumes the reader knows the difference between Deployments, StatefulSets, and DaemonSets.",
    },
    {
      exact_phrase: "status subresource",
      why: "A Kubernetes API concept (the /status subresource endpoint). Very niche even among k8s users.",
    },
    {
      exact_phrase: "Helm charts",
      why: "Helm is a Kubernetes package manager. Readers outside infrastructure won't know what charts are.",
    },
    {
      exact_phrase: "ArgoCD",
      why: "A specific GitOps tool. Named without explanation of what it does.",
    },
    {
      exact_phrase: "GitOps",
      why: "A deployment methodology that uses Git as the source of truth. Not universally known outside DevOps circles.",
    },
    {
      exact_phrase: "EKS",
      why: "Amazon Elastic Kubernetes Service -- an AWS-specific acronym not expanded in the text.",
    },
  ],
  shouldNotFlag: ["API server", "Pod", "clusters"],
};

// ---------------------------------------------------------------------------
// Sample 2: SRE / Observability
// ---------------------------------------------------------------------------
const sreObservability: GoldenSample = {
  id: "sre-observability",
  domain: "SRE / Observability",
  text: `When the burn rate exceeds 6x, PagerDuty fires an alert to the on-call SRE. Check the P99 latency in the Grafana SLO dashboard before acknowledging. Our SLIs are scraped from Prometheus exporters running as sidecars in each service mesh pod, and the data feeds into Thanos for long-term retention. If the error budget is exhausted, the team enters a reliability sprint and halts all feature work until MTTR drops below the SLA threshold.`,
  expectedFlags: [
    {
      exact_phrase: "burn rate exceeds 6x",
      why: "Burn rate is a specialized SRE concept measuring error budget consumption speed. The '6x' multiplier is meaningless without context.",
    },
    {
      exact_phrase: "PagerDuty",
      why: "An incident management tool. Named without explaining what it does or why an alert from it matters.",
    },
    {
      exact_phrase: "on-call SRE",
      why: "SRE (Site Reliability Engineer) is a role title not all readers will know. Combined with 'on-call' it assumes familiarity with incident response rotation.",
    },
    {
      exact_phrase: "P99 latency",
      why: "99th-percentile latency is a performance metric common in SRE but not universally understood.",
    },
    {
      exact_phrase: "SLO dashboard",
      why: "SLO (Service Level Objective) is unexpanded. Readers may not know the SLO/SLA/SLI distinction.",
    },
    {
      exact_phrase: "SLIs",
      why: "Service Level Indicators -- another unexpanded SRE acronym.",
    },
    {
      exact_phrase: "Prometheus exporters",
      why: "Prometheus is a monitoring system; exporters are components that expose metrics. Naming them without context assumes familiarity.",
    },
    {
      exact_phrase: "sidecars",
      why: "The sidecar pattern (a helper container running alongside the main container) is a Kubernetes/microservices concept.",
    },
    {
      exact_phrase: "service mesh",
      why: "A networking infrastructure layer (e.g., Istio, Linkerd). Assumes knowledge of microservice networking.",
    },
    {
      exact_phrase: "Thanos",
      why: "A Prometheus companion for long-term storage. Named without explanation.",
    },
    {
      exact_phrase: "error budget",
      why: "An SRE concept representing the acceptable amount of unreliability. Not self-explanatory.",
    },
    {
      exact_phrase: "MTTR",
      why: "Mean Time To Recovery -- an unexpanded acronym.",
    },
    {
      exact_phrase: "SLA threshold",
      why: "SLA (Service Level Agreement) is used without expansion here.",
    },
  ],
  shouldNotFlag: ["alert", "team", "feature work", "dashboard"],
};

// ---------------------------------------------------------------------------
// Sample 3: Internal Engineering Process / Governance
// ---------------------------------------------------------------------------
const engineeringProcess: GoldenSample = {
  id: "eng-process",
  domain: "Engineering Process / Governance",
  text: `Submit the RFC to the ADR repo. Once the TL;DR gets LGTM'd by the TLM, the PMO will schedule it for the next PI planning increment. All proposals must include a DACI matrix and an ADR conforming to the Nygard template. The TC reviews architectural fitness functions quarterly, and any proposal that increases the blast radius of a service beyond its bounded context must go through a full ATAM evaluation.`,
  expectedFlags: [
    {
      exact_phrase: "RFC",
      why: "Request for Comments -- a process document type. Not expanded.",
    },
    {
      exact_phrase: "ADR repo",
      why: "ADR (Architecture Decision Record) is unexpanded. 'Repo' assumes the reader knows it's a Git repository.",
    },
    {
      exact_phrase: "LGTM'd",
      why: "'Looks Good To Me' turned into a verb. Insider slang.",
    },
    {
      exact_phrase: "TLM",
      why: "Tech Lead Manager -- an unexpanded role acronym not universal across organizations.",
    },
    {
      exact_phrase: "PMO",
      why: "Project Management Office -- unexpanded organizational acronym.",
    },
    {
      exact_phrase: "PI planning",
      why: "Program Increment planning is a SAFe (Scaled Agile Framework) ceremony. Assumes familiarity with SAFe methodology.",
    },
    {
      exact_phrase: "DACI matrix",
      why: "A decision-making framework (Driver, Approver, Contributor, Informed). Not self-explanatory.",
    },
    {
      exact_phrase: "Nygard template",
      why: "Refers to Michael Nygard's ADR template format. A proper noun that assumes specific knowledge.",
    },
    {
      exact_phrase: "TC",
      why: "Technology Council or Technical Committee -- ambiguous unexpanded acronym.",
    },
    {
      exact_phrase: "fitness functions",
      why: "An evolutionary architecture concept for measurable architectural characteristics. Not widely known.",
    },
    {
      exact_phrase: "blast radius",
      why: "A metaphor from incident response meaning the scope of impact of a failure. Not obvious to all readers.",
    },
    {
      exact_phrase: "bounded context",
      why: "A Domain-Driven Design concept defining service boundaries. Assumes DDD knowledge.",
    },
    {
      exact_phrase: "ATAM",
      why: "Architecture Tradeoff Analysis Method -- a specialized evaluation framework, unexpanded.",
    },
  ],
  shouldNotFlag: ["service", "proposal", "quarterly"],
};

// ---------------------------------------------------------------------------
// Sample 4: Frontend / Build Tooling
// ---------------------------------------------------------------------------
const frontendTooling: GoldenSample = {
  id: "frontend-tooling",
  domain: "Frontend / Build Tooling",
  text: `The migration from Webpack to Vite reduced our HMR time from 12s to under 200ms. Tree-shaking now eliminates dead code from barrel exports, and code-splitting at route boundaries keeps the initial bundle under 150kB gzipped. We use SWC for transpilation instead of Babel, and our Storybook stories are co-located with each component. The CI pipeline runs Lighthouse audits on every PR, enforcing a TBT budget of 300ms and a CLS threshold below 0.1.`,
  expectedFlags: [
    {
      exact_phrase: "HMR",
      why: "Hot Module Replacement -- unexpanded acronym. Not all developers know what it means.",
    },
    {
      exact_phrase: "Tree-shaking",
      why: "A build optimization that removes unused code. The metaphor is not self-explanatory.",
    },
    {
      exact_phrase: "barrel exports",
      why: "A JavaScript module pattern (re-exporting from index files). Niche even among frontend developers.",
    },
    {
      exact_phrase: "code-splitting",
      why: "A performance optimization that loads JavaScript on demand. Assumes bundler knowledge.",
    },
    {
      exact_phrase: "SWC",
      why: "A Rust-based JavaScript compiler. Named without explanation.",
    },
    {
      exact_phrase: "transpilation",
      why: "Source-to-source compilation. Not all readers know what this means or why Babel/SWC do it.",
    },
    {
      exact_phrase: "Storybook",
      why: "A UI component development tool. Named without explanation of its purpose.",
    },
    {
      exact_phrase: "Lighthouse audits",
      why: "Google Lighthouse is a web performance auditing tool. Assumes familiarity.",
    },
    {
      exact_phrase: "TBT",
      why: "Total Blocking Time -- a Core Web Vital metric. Unexpanded acronym.",
    },
    {
      exact_phrase: "CLS",
      why: "Cumulative Layout Shift -- another Core Web Vital. Unexpanded.",
    },
  ],
  shouldNotFlag: ["bundle", "component", "PR", "CI pipeline"],
};

// ---------------------------------------------------------------------------
// Sample 5: Database / Data Engineering
// ---------------------------------------------------------------------------
const dataEngineering: GoldenSample = {
  id: "data-engineering",
  domain: "Database / Data Engineering",
  text: `The OLTP workload runs on a Vitess-sharded MySQL cluster with GTID-based replication. For analytical queries, we replicate via Debezium CDC into a Snowflake data warehouse, with dbt models running incremental materializations nightly. The ETL pipeline uses Airflow DAGs with backfill support, and our data catalog is managed in DataHub with column-level lineage tracking. Schema migrations go through gh-ost to avoid locking production tables during ALTER TABLE operations.`,
  expectedFlags: [
    {
      exact_phrase: "OLTP",
      why: "Online Transaction Processing -- a database workload category. Unexpanded.",
    },
    {
      exact_phrase: "Vitess-sharded",
      why: "Vitess is a database clustering system for MySQL. 'Sharded' assumes knowledge of horizontal partitioning.",
    },
    {
      exact_phrase: "GTID-based replication",
      why: "Global Transaction ID replication is a MySQL-specific concept. Very niche.",
    },
    {
      exact_phrase: "Debezium CDC",
      why: "Debezium is a Change Data Capture platform. Both the tool name and the acronym need context.",
    },
    {
      exact_phrase: "dbt models",
      why: "dbt (data build tool) is a transformation framework. Named without explanation.",
    },
    {
      exact_phrase: "incremental materializations",
      why: "A dbt concept where only new/changed data is processed. Assumes familiarity with data modeling patterns.",
    },
    {
      exact_phrase: "ETL pipeline",
      why: "Extract, Transform, Load -- while common in data engineering, it is jargon to many software engineers.",
    },
    {
      exact_phrase: "Airflow DAGs",
      why: "Apache Airflow uses Directed Acyclic Graphs to define workflows. Both the tool and the concept need explanation.",
    },
    {
      exact_phrase: "backfill",
      why: "Re-processing historical data. A data engineering concept that is not self-explanatory.",
    },
    {
      exact_phrase: "DataHub",
      why: "A metadata platform. Named without explaining what it does.",
    },
    {
      exact_phrase: "column-level lineage",
      why: "Tracking data transformations at the column level. A data governance concept.",
    },
    {
      exact_phrase: "gh-ost",
      why: "GitHub's online schema migration tool for MySQL. Very niche tool name.",
    },
  ],
  shouldNotFlag: ["MySQL", "queries", "production tables", "Schema"],
};

// ---------------------------------------------------------------------------
// Edge-case samples for calibration testing
// ---------------------------------------------------------------------------

/** Plain English with no jargon -- should produce zero or near-zero flags. */
export const CLEAR_TEXT_SAMPLE: GoldenSample = {
  id: "clear-text",
  domain: "None (plain English)",
  text: `Our team meets every Monday to review progress on current projects. Each person shares what they completed last week, what they plan to work on this week, and any blockers they need help with. Notes are shared in a document after the meeting so everyone can reference them later.`,
  expectedFlags: [],
  shouldNotFlag: [
    "team",
    "projects",
    "blockers",
    "document",
    "meeting",
  ],
};

/** Very short text -- should not crash or produce hallucinated flags. */
export const MINIMAL_TEXT_SAMPLE: GoldenSample = {
  id: "minimal-text",
  domain: "None",
  text: `Update the readme file.`,
  expectedFlags: [],
  shouldNotFlag: ["readme", "file"],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const GOLDEN_SAMPLES: GoldenSample[] = [
  kubernetesOps,
  sreObservability,
  engineeringProcess,
  frontendTooling,
  dataEngineering,
];

export const EDGE_CASE_SAMPLES: GoldenSample[] = [
  CLEAR_TEXT_SAMPLE,
  MINIMAL_TEXT_SAMPLE,
];

export const ALL_SAMPLES: GoldenSample[] = [
  ...GOLDEN_SAMPLES,
  ...EDGE_CASE_SAMPLES,
];
