import { For, onCleanup, onMount, type JSX } from "solid-js";
import "./landing.css";

type Card = {
  title: string;
  body: string;
};

type Metric = {
  value: string;
  label: string;
  body: string;
};

const problemCards: Card[] = [
  {
    title: "Vendor Lock-in",
    body: "Proprietary platforms chain your business to their ecosystems, slowing agility and innovation.",
  },
  {
    title: "The Transaction Tax",
    body: "Every data flow incurs scaling costs, impacting your bottom line with unseen charges.",
  },
  {
    title: "Exorbitant Exit Costs",
    body: "Migrating away can cost over 1.2M, as your critical transformation logic is embedded and unowned.",
  },
];

const solutionCards: Card[] = [
  {
    title: "The language is free to use.",
    body: "No expiration dates, no runtime lockouts, and no per-flow license tax.",
  },
  {
    title: "You own 100% of your transformation logic.",
    body: "Keep mappings and integrations in your own systems and deployment flow.",
  },
  {
    title: "Commercial value shifts to support.",
    body: "Pay for onboarding, implementation, and support when you need it.",
  },
];

const rustAdvantageCards: Card[] = [
  {
    title: "Bare Metal Speed",
    body: "Leveraging Rust, DataMorph executes transformations at native machine speeds.",
  },
  {
    title: "Memory Efficiency",
    body: "Experience up to 90% cost reduction in memory consumption compared to Java or .NET based solutions.",
  },
  {
    title: "Rock-Solid Reliability",
    body: "Rust memory safety features ensure robust, error-free operations and reduced downtime.",
  },
];

const impactMetrics: Metric[] = [
  {
    value: "PS1.2M",
    label: "iPaaS Exit Cost",
    body: "The typical price of migrating off proprietary platforms.",
  },
  {
    value: "PS120K",
    label: "DataMorph Migration",
    body: "A major reduction in migration expenditure.",
  },
  {
    value: "2 Years",
    label: "iPaaS Migration Time",
    body: "The practical timelines often seen in complex exits.",
  },
  {
    value: "3x",
    label: "Time-to-Value",
    body: "Accelerate delivery while reducing operational friction.",
  },
];

const futureCards: Card[] = [
  {
    title: "Agility and Control",
    body: "Empower your teams with flexibility to adapt and innovate without vendor constraints.",
  },
  {
    title: "Unmatched Cost Efficiency",
    body: "Dramatically reduce operational expenses and unlock budget for strategic initiatives.",
  },
  {
    title: "Future-Proof Architecture",
    body: "Built on modern, high-performance Rust foundations for long-term scalability.",
  },
];

export default function LandingPage(): JSX.Element {
  let previousHtmlOverflow = "";
  let previousBodyOverflow = "";

  onMount(() => {
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
  });

  onCleanup(() => {
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.overflow = previousBodyOverflow;
  });

  return (
    <div class="dm-landing-root">
      <header class="dm-hero">
        <div class="dm-hero-overlay" />
        <nav class="dm-nav container">
          <div class="dm-brand">DataMorph</div>
          <div class="dm-nav-actions">
            <a class="dm-nav-cta dm-nav-cta-secondary" href="/DataMorph-Docs/">
              Docs
            </a>
            <a class="dm-nav-cta" href="/DataMorph-Playground/">
              Open Playground
            </a>
          </div>
        </nav>

        <div class="container dm-hero-content">
          <h1>Unlocking Digital Sovereignty: DataMorph for Enterprise Transformation</h1>
          <p class="dm-hero-subtitle">
            A free-to-use multi-format transformation runtime for teams that want control, portability, and optional paid support.
          </p>
          <p class="dm-author">By WorkerAnt AB</p>
        </div>
      </header>

      <main class="dm-main">
        <section class="container dm-section">
          <p class="dm-section-kicker">THE PROBLEM</p>
          <div class="dm-card-grid dm-card-grid-3">
            <For each={problemCards}>
              {(card) => (
                <article class="dm-card dm-card-bordered">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="container dm-section">
          <p class="dm-section-kicker">THE SOLUTION</p>
          <h2>DataMorph SDK: Reclaim Your Code, Own Your Future</h2>
          <p class="dm-section-copy">
            DataMorph is free to use. The business model is support and implementation help, not charging license fees for the language runtime.
          </p>
          <div class="dm-card-grid dm-card-grid-3 dm-card-soft">
            <For each={solutionCards}>
              {(card) => (
                <article class="dm-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="container dm-section">
          <p class="dm-section-kicker">THE RUST ADVANTAGE</p>
          <h2>Unparalleled Performance: Built on Rust</h2>
          <div class="dm-card-grid dm-card-grid-3 dm-card-icons">
            <For each={rustAdvantageCards}>
              {(card) => (
                <article class="dm-card">
                  <span class="dm-card-icon" aria-hidden="true" />
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              )}
            </For>
          </div>
          <div class="dm-note">
            Crucially, no prior Rust expertise is required for your teams to use DataMorph effectively.
          </div>
        </section>

        <section class="container dm-section">
          <h2>Quantifiable Impact: Significant Savings and Speed</h2>
          <div class="dm-metrics-grid">
            <For each={impactMetrics}>
              {(metric) => (
                <article class="dm-metric">
                  <div class="dm-metric-value">{metric.value}</div>
                  <h3>{metric.label}</h3>
                  <p>{metric.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="container dm-section">
          <h2>Infrastructure Costs Slashed by 70%</h2>
          <p class="dm-section-copy">
            Our Rust-powered engine reduces your cloud infrastructure spend while improving throughput and resilience.
          </p>
          <div class="dm-card-grid dm-card-grid-3">
            <article class="dm-card dm-card-bordered">
              <h3>Lower compute demands.</h3>
            </article>
            <article class="dm-card dm-card-bordered">
              <h3>Optimized memory footprint.</h3>
            </article>
            <article class="dm-card dm-card-bordered">
              <h3>Directly impacts your operational expenditure.</h3>
            </article>
          </div>
        </section>

        <section class="container dm-section">
          <h2>Black Box vs. Open Architecture</h2>
          <div class="dm-compare-grid">
            <article class="dm-compare-col">
              <h3>Proprietary iPaaS</h3>
              <ul>
                <li>Opaque code, hidden logic.</li>
                <li>Vendor-controlled deployments.</li>
                <li>Steep learning curves for specific platforms.</li>
                <li>Limited portability, complex migrations.</li>
              </ul>
            </article>
            <article class="dm-compare-col">
              <h3>DataMorph SDK</h3>
              <ul>
                <li>Transparent, owned code in your Git.</li>
                <li>Deploy anywhere: any cloud or on-prem.</li>
                <li>Standard development practices, no platform lock-in.</li>
                <li>Ultimate portability and future-proofing.</li>
              </ul>
            </article>
          </div>
        </section>

        <section class="container dm-section">
          <h2>DataMorph: The Future of Enterprise Integration</h2>
          <p class="dm-section-copy">
            Do not just migrate; transform. DataMorph offers a superior pathway to efficiency, control, and strategic advantage.
          </p>
          <div class="dm-card-grid dm-card-grid-3 dm-card-icons">
            <For each={futureCards}>
              {(card) => (
                <article class="dm-card">
                  <span class="dm-card-icon" aria-hidden="true" />
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="container dm-section dm-cta-section">
          <div class="dm-cta-copy">
            <h2>Ready to Reclaim Your Digital Future?</h2>
            <p>Use DataMorph freely today, and reach out if you want paid support, onboarding, or implementation help.</p>
            <p>
              Request a Demo: <a href="mailto:workerantlab@gmail.com">workerantlab@gmail.com</a>
            </p>
            <div class="dm-cta-actions">
              <a class="dm-nav-cta dm-nav-cta-secondary" href="/DataMorph-Docs/">
                Read The Docs
              </a>
              <a class="dm-nav-cta" href="/DataMorph-Playground/">
                Launch DataMorph Playground
              </a>
            </div>
          </div>
          <div class="dm-cta-visual" aria-hidden="true" />
        </section>
      </main>
    </div>
  );
}
