import { SectionPage } from "@/components/section-page";

const INSIGHTS = [
  {
    title: "Ship a guided onboarding MVP",
    kind: "Decision",
    detail: "Focus the first release on one workflow instead of a full suite.",
    source: "Startup Idea · Jul 23",
  },
  {
    title: "Review indemnity clause before signing",
    kind: "Action item",
    detail: "Legal Advisor flagged uncapped liability in the vendor draft.",
    source: "Legal Review · Jul 12",
  },
  {
    title: "Budget ceiling: $18k for launch creatives",
    kind: "Takeaway",
    detail: "Accountant recommended a channel test before scaling paid ads.",
    source: "Q3 Strategy · Jul 18",
  },
];

export default function InsightsPage() {
  return (
    <SectionPage
      kicker="Memory"
      title="Saved insights & decisions"
      description="A centralized hub for AI-generated summaries, key takeaways, and action items across meetings."
    >
      <div className="section-list">
        {INSIGHTS.map((insight) => (
          <article key={insight.title} className="section-card">
            <div className="section-card-head">
              <strong>{insight.title}</strong>
              <span>{insight.kind}</span>
            </div>
            <p>{insight.detail}</p>
            <footer>
              <small>{insight.source}</small>
            </footer>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
