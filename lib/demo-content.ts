export const DEMO_CONTENT = `<p>We migrated the checkout service from our monolith to a gRPC microservice running on k8s last quarter. The new service handles tokenization via our PCI-compliant vault and falls back to the legacy REST gateway if the circuit breaker trips. P99 latency dropped from 820ms to 210ms after we moved to connection pooling with PgBouncer.</p><p>As part of this effort, the SRE team updated our SLOs to reflect the new architecture. The error budget for the checkout flow is now 99.95% over a 30-day rolling window, measured via synthetic probes hitting the canary deployment. If burn rate exceeds 6x, PagerDuty escalates to the on-call using our custom runbook automation built on Temporal workflows.</p><p>Next steps: the platform team is planning to decompose the order aggregate into event-sourced projections using CDC from the primary Postgres cluster. This will let downstream consumers (e.g., the analytics pipeline and the billing reconciliation job) subscribe to domain events via Kafka instead of polling the read replicas. ETA is Q3 pending headcount approval from the PMO.</p>`;

export const DEMO_FLAGS = [
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
      "\"k8s\" is an abbreviation for Kubernetes that is common inside infrastructure teams but opaque to many engineers and non-technical stakeholders.",
    suggestion:
      "Write out \"Kubernetes (k8s)\" on first use, or link to your internal infrastructure guide.",
  },
  {
    exact_phrase: "circuit breaker",
    reason:
      "Circuit breaker is a software resilience pattern. Readers unfamiliar with distributed systems patterns won't understand what \"trips\" means in this context.",
    suggestion:
      "Add a brief parenthetical: \"the circuit breaker (a failsafe that redirects traffic when the new service is unhealthy).\"",
  },
  {
    exact_phrase: "P99 latency",
    reason:
      "P99 refers to the 99th-percentile response time. This is a common performance metric inside SRE teams but is not universally understood.",
    suggestion:
      "Define on first use: \"P99 latency (the response time that 99% of requests are faster than).\"",
  },
  {
    exact_phrase: "PgBouncer",
    reason:
      "PgBouncer is a specific connection pooling tool for PostgreSQL. Naming it without context assumes the reader knows the Postgres ecosystem tooling.",
    suggestion:
      "Introduce it with context: \"connection pooling with PgBouncer, a lightweight proxy for PostgreSQL.\"",
  },
  {
    exact_phrase: "SLOs",
    reason:
      "SLO (Service Level Objective) is an SRE concept. Readers from product, design, or frontend teams may not know the distinction between SLO, SLA, and SLI.",
    suggestion:
      "Expand the acronym on first use: \"Service Level Objectives (SLOs).\"",
  },
  {
    exact_phrase: "burn rate exceeds 6x",
    reason:
      "\"Burn rate\" in the context of error budgets is a specialized SRE concept. The \"6x\" multiplier is meaningless without explaining what baseline it refers to.",
    suggestion:
      "Explain that burn rate measures how quickly the error budget is being consumed, and what 6x means relative to the allowed threshold.",
  },
  {
    exact_phrase: "CDC",
    reason:
      "CDC (Change Data Capture) is a data engineering pattern that is not common knowledge outside data platform teams.",
    suggestion:
      "Expand the acronym and provide a one-line explanation: \"Change Data Capture (CDC) — a pattern that streams database changes as events.\"",
  },
];
