import { SectionPage } from "@/components/section-page";

const METRICS = [
  { label: "Meetings this month", value: "12" },
  { label: "AI replies generated", value: "184" },
  { label: "Avg. experts / room", value: "3.4" },
  { label: "Decisions captured", value: "27" },
];

const BARS = [
  { label: "Strategy", value: 78 },
  { label: "Product", value: 64 },
  { label: "Legal", value: 42 },
  { label: "Finance", value: 36 },
];

export default function AnalyticsPage() {
  return (
    <SectionPage
      kicker="Dashboard"
      title="Data & analytics"
      description="Meeting metrics, AI usage, and visual summaries across your ThinkRoom workspaces."
    >
      <div className="metrics-grid">
        {METRICS.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <section className="chart-panel">
        <header>
          <h2>Topic mix</h2>
          <p>Share of discussion time by theme this month.</p>
        </header>
        <div className="bar-chart">
          {BARS.map((bar) => (
            <div key={bar.label} className="bar-row">
              <span>{bar.label}</span>
              <div className="bar-track" aria-hidden="true">
                <i style={{ width: `${bar.value}%` }} />
              </div>
              <small>{bar.value}%</small>
            </div>
          ))}
        </div>
      </section>
    </SectionPage>
  );
}
