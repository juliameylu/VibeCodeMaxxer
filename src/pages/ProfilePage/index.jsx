import { Calendar, MapPin, Settings, Circle } from "lucide-react";
import MobileShell from "../../components/MobileShell";

export default function ProfilePage() {
  return (
    <MobileShell showFab={false}>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">Profile</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <Circle size={24} className="text-amberSoft" />
          Faith Johnson
        </h1>
        <p className="mt-1 text-sm text-soft">Computer Science, Year 2</p>
      </section>

      <section className="glass-card mt-5 p-4">
        <div className="space-y-3">
          <button className="row-pill flex w-full items-center gap-3 text-left text-ink">
            <Calendar size={18} className="text-amberSoft" />
            <span className="font-semibold">Academic Preferences</span>
          </button>
          <button className="row-pill flex w-full items-center gap-3 text-left text-ink">
            <MapPin size={18} className="text-amberSoft" />
            <span className="font-semibold">Reminder Settings</span>
          </button>
          <button className="row-pill flex w-full items-center gap-3 text-left text-ink">
            <Settings size={18} className="text-amberSoft" />
            <span className="font-semibold">App Settings</span>
          </button>
        </div>
      </section>
    </MobileShell>
  );
}
