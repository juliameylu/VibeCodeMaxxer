import AppShell from "../../lib/pageshell/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Account and app settings">
      <section className="row-pill">
        <p className="font-semibold text-ink">Notifications</p>
        <p className="text-xs text-soft">Invite updates, plan reminders, and due-date alerts.</p>
      </section>
      <section className="row-pill">
        <p className="font-semibold text-ink">Privacy</p>
        <p className="text-xs text-soft">Invite links are token-based and expire after 7 days.</p>
      </section>
      <section className="row-pill">
        <p className="font-semibold text-ink">Billing / Payments</p>
        <p className="text-xs text-soft">Apple Pay is configured as v1 stub; real processing ships next phase.</p>
      </section>
    </AppShell>
  );
}
