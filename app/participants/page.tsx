import Link from "next/link";
import { SectionPage } from "@/components/section-page";

const PEOPLE = [
  { name: "You", role: "Meeting host", access: "Owner" },
  { name: "Amina Rahman", role: "Product lead", access: "Editor" },
  { name: "Jonah Park", role: "Engineering", access: "Viewer" },
];

export default function ParticipantsPage() {
  return (
    <SectionPage
      kicker="Team"
      title="Participants & permissions"
      description="Manage team members, invite links, and who can speak, invite experts, or export notes."
      actions={
        <Link href="/?invite=1" className="section-action-link">
          Copy invite link
        </Link>
      }
    >
      <div className="section-list">
        {PEOPLE.map((person) => (
          <article key={person.name} className="section-card person-card">
            <div className="section-card-head">
              <strong>{person.name}</strong>
              <span>{person.access}</span>
            </div>
            <p>{person.role}</p>
          </article>
        ))}
      </div>
      <aside className="section-note">
        <strong>Room permissions</strong>
        <p>
          Owners can manage experts and exports. Editors can invite people.
          Viewers can follow the conversation and read notes.
        </p>
      </aside>
    </SectionPage>
  );
}
