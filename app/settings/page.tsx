import { SectionPage } from "@/components/section-page";

export default function SettingsPage() {
  return (
    <SectionPage
      kicker="Account"
      title="Profile settings"
      description="Manage your account details, avatar, and ThinkRoom preferences."
    >
      <form className="settings-form">
        <label>
          <span>Display name</span>
          <input defaultValue="You" />
        </label>
        <label>
          <span>Email</span>
          <input type="email" defaultValue="host@thinkroom.app" />
        </label>
        <label>
          <span>Default response language</span>
          <select defaultValue="auto">
            <option value="auto">Match conversation</option>
            <option value="en">English</option>
            <option value="bn">Bangla</option>
          </select>
        </label>
        <label className="settings-check">
          <input type="checkbox" defaultChecked />
          <span>Auto-capture meeting notes after each AI reply</span>
        </label>
        <button type="button" className="section-action-link">
          Save preferences
        </button>
      </form>
    </SectionPage>
  );
}
