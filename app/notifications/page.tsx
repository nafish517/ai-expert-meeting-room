import { SectionPage } from "@/components/section-page";

const CONTROLS = [
  {
    title: "Expert replies",
    detail: "Notify when a specialist finishes a spoken or chat response.",
    defaultChecked: true,
  },
  {
    title: "Decision captures",
    detail: "Alert when AI notes detect a decision or action item.",
    defaultChecked: true,
  },
  {
    title: "Invite activity",
    detail: "Get notified when someone joins via your room link.",
    defaultChecked: false,
  },
  {
    title: "Weekly digest",
    detail: "Summary of meetings, insights, and AI usage every Monday.",
    defaultChecked: true,
  },
];

export default function NotificationsPage() {
  return (
    <SectionPage
      kicker="Alerts"
      title="Notifications"
      description="Control which meeting events and digests reach you."
    >
      <div className="section-list">
        {CONTROLS.map((control) => (
          <label key={control.title} className="section-card notify-row">
            <div>
              <strong>{control.title}</strong>
              <p>{control.detail}</p>
            </div>
            <input type="checkbox" defaultChecked={control.defaultChecked} />
          </label>
        ))}
      </div>
    </SectionPage>
  );
}
