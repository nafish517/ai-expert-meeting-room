import Link from "next/link";
import { SectionPage } from "@/components/section-page";

const TOPICS = [
  {
    title: "Seat an AI expert",
    detail: "Open Active Meeting, choose Add AI expert, then pick a specialist or create a custom one.",
  },
  {
    title: "Share a room",
    detail: "Use Add people to copy the room link. Everyone shares the same meeting context.",
  },
  {
    title: "Capture decisions",
    detail: "Turn on AI notes in the meeting header to collect goals, decisions, and open questions.",
  },
  {
    title: "Need support?",
    detail: "Email support@thinkroom.app or open an issue with your room code and a short repro.",
  },
];

export default function HelpPage() {
  return (
    <SectionPage
      kicker="Support"
      title="Help & documentation"
      description="Guides, FAQs, and support for running sharper AI meetings in ThinkRoom."
      actions={
        <Link href="/room" className="section-action-link">
          Back to meeting
        </Link>
      }
    >
      <div className="section-list">
        {TOPICS.map((topic) => (
          <article key={topic.title} className="section-card">
            <div className="section-card-head">
              <strong>{topic.title}</strong>
            </div>
            <p>{topic.detail}</p>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
