"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionPage } from "@/components/section-page";
import { LIBRARY_AGENTS } from "@/lib/agents";
import { loadCustomExperts } from "@/lib/customExperts";
import type { Agent } from "@/lib/types";

export default function ExpertsPage() {
  const [customExperts, setCustomExperts] = useState<Agent[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCustomExperts(loadCustomExperts());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <SectionPage
      kicker="Roster"
      title="AI experts library"
      description="Browse built-in specialists and manage custom experts you created for this workspace."
      actions={
        <Link href="/room" className="section-action-link">
          Open active meeting
        </Link>
      }
    >
      {customExperts.length > 0 && (
        <section className="section-block">
          <h2>Custom experts</h2>
          <div className="section-list compact">
            {customExperts.map((agent) => (
              <article key={agent.id} className="section-card">
                <div className="section-card-head">
                  <strong>
                    <span className="inline-emoji" aria-hidden="true">
                      {agent.emoji ?? "🧠"}
                    </span>{" "}
                    {agent.name}
                  </strong>
                  <span>Custom</span>
                </div>
                <p>{agent.role}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <h2>Built-in specialists</h2>
        <div className="section-list compact">
          {LIBRARY_AGENTS.map((agent) => (
            <article key={agent.id} className="section-card">
              <div className="section-card-head">
                <strong>{agent.name}</strong>
                <span>Library</span>
              </div>
              <p>{agent.role}</p>
            </article>
          ))}
        </div>
      </section>
    </SectionPage>
  );
}
