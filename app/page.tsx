import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThinkRoom | AI Expert Meeting",
  description:
    "One continuous meeting with every AI expert you need — shared context, live notes, clear decisions.",
};

const EXPERTS = [
  { mark: "SA", name: "Software Architect", tone: "teal" as const },
  { mark: "LA", name: "Legal Advisor", tone: "rust" as const },
  { mark: "SM", name: "Startup Mentor", tone: "teal" as const },
  { mark: "MS", name: "Marketing Strategist", tone: "rust" as const },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/" className="landing-nav-brand" aria-label="ThinkRoom home">
          <span aria-hidden="true">TR</span>
          ThinkRoom
        </Link>
        <nav className="landing-nav-links" aria-label="Landing">
          <a href="#how">How it works</a>
          <a href="#experts">Experts</a>
          <Link href="/room" className="landing-nav-cta">
            Enter room
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-label="ThinkRoom">
          <div className="landing-hero-copy">
            <p className="landing-brand">ThinkRoom</p>
            <h1>One room. Every expert. Shared memory.</h1>
            <p className="landing-lede">
              Run a real meeting with AI specialists who hear the same conversation —
              then leave with decisions, not chat threads.
            </p>
            <div className="landing-cta-row">
              <Link href="/room" className="landing-cta-primary">
                Start a meeting
              </Link>
              <a href="#how" className="landing-cta-ghost">
                See how it works
              </a>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-stage">
              <div className="landing-stage-glow" />
              <div className="landing-stage-table" />
              <div className="landing-seat landing-seat-you">
                <span className="landing-seat-mark">Y</span>
                <span className="landing-seat-label">You</span>
              </div>
              {EXPERTS.slice(0, 3).map((expert, index) => (
                <div
                  key={expert.name}
                  className={`landing-seat landing-seat-${index + 1} tone-${expert.tone} ${index === 1 ? "is-speaking" : ""}`}
                >
                  <span className="landing-seat-mark">{expert.mark}</span>
                  <span className="landing-seat-label">{expert.name}</span>
                  {index === 1 && (
                    <span className="landing-speak-pulse">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </div>
              ))}
              <p className="landing-stage-caption">Live session · shared context</p>
            </div>
          </div>
        </section>

        <section className="landing-section" id="how">
          <p className="landing-kicker">How it works</p>
          <h2>Seat experts. Keep one thread. Capture the outcome.</h2>
          <ol className="landing-steps">
            <li>
              <strong>Open a room</strong>
              <span>Invite AI specialists into one continuous meeting.</span>
            </li>
            <li>
              <strong>Talk in context</strong>
              <span>Every expert hears what was already decided — no re-explaining.</span>
            </li>
            <li>
              <strong>Leave with notes</strong>
              <span>Summarize goals, decisions, and next steps when you&apos;re done.</span>
            </li>
          </ol>
        </section>

        <section className="landing-section landing-section-experts" id="experts">
          <p className="landing-kicker">The roster</p>
          <h2>Specialists ready when you are.</h2>
          <p className="landing-section-lede">
            Bring in architecture, legal, strategy, and more — or create your own custom expert.
          </p>
          <ul className="landing-expert-list">
            {EXPERTS.map((expert) => (
              <li key={expert.name} className={`tone-${expert.tone}`}>
                <span aria-hidden="true">{expert.mark}</span>
                {expert.name}
              </li>
            ))}
          </ul>
          <Link href="/room" className="landing-cta-primary landing-cta-inline">
            Enter the meeting room
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <strong>ThinkRoom</strong>
        <span>AI expert meetings with shared context.</span>
      </footer>
    </div>
  );
}
