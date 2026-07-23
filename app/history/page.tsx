"use client";

import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionPage } from "@/components/section-page";

const MEETINGS = [
  {
    id: "1",
    title: "Startup Idea · Product discovery",
    when: "Today · 2:14 PM",
    experts: "Host, Software Architect, Startup Mentor",
    summary: "Scoped MVP and listed three launch risks.",
    tag: "Active workspace",
  },
  {
    id: "2",
    title: "Q3 Strategy · Priority lock",
    when: "Jul 18 · 11:02 AM",
    experts: "Host, Marketing Strategist, Accountant",
    summary: "Chose two bets and deferred international expansion.",
    tag: "Strategy",
  },
  {
    id: "3",
    title: "Legal Review · Vendor contract",
    when: "Jul 12 · 4:40 PM",
    experts: "Host, Legal Advisor",
    summary: "Flagged indemnity language and privacy addendum gaps.",
    tag: "Legal",
  },
  {
    id: "4",
    title: "Design critique · Onboarding flow",
    when: "Jul 9 · 9:20 AM",
    experts: "Host, Product Designer, Psychologist",
    summary: "Simplified first-run steps and cut two modal prompts.",
    tag: "Product",
  },
];

export default function HistoryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const meetings = useMemo(() => {
    return MEETINGS.filter((meeting) => {
      const haystack = `${meeting.title} ${meeting.summary} ${meeting.experts}`.toLowerCase();
      const matchesQuery = haystack.includes(query.trim().toLowerCase());
      const matchesFilter =
        filter === "all" ||
        meeting.tag.toLowerCase().includes(filter.toLowerCase());
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <SectionPage
      kicker="Archive"
      title="Meeting history"
      description="Browse past rooms, search transcripts by topic, and reopen decisions from earlier sessions."
    >
      <div className="section-toolbar">
        <label className="section-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search meetings, experts, or topics"
          />
        </label>
        <label className="section-filter">
          <Filter aria-hidden="true" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter meetings"
          >
            <option value="all">All rooms</option>
            <option value="strategy">Strategy</option>
            <option value="legal">Legal</option>
            <option value="product">Product</option>
            <option value="active">Active workspace</option>
          </select>
        </label>
      </div>

      <div className="section-list">
        {meetings.map((meeting) => (
          <article key={meeting.id} className="section-card">
            <div className="section-card-head">
              <strong>{meeting.title}</strong>
              <span>{meeting.tag}</span>
            </div>
            <p>{meeting.summary}</p>
            <footer>
              <small>{meeting.when}</small>
              <small>{meeting.experts}</small>
            </footer>
          </article>
        ))}
        {meetings.length === 0 && (
          <p className="section-empty">No meetings match that search.</p>
        )}
      </div>
    </SectionPage>
  );
}
