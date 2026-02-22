import AppShell from "../../lib/pageshell/AppShell";
import useNotifications from "../../lib/hooks/useNotifications";

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications({ pollMs: 15000 });

  return (
    <AppShell title="Notifications" subtitle="Jam activity and invite updates">
      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Unread</p>
          <span className="chip chip-active text-xs">{unreadCount}</span>
        </div>

        <button onClick={markAllRead} className="chip chip-idle mt-3 text-xs">
          Mark all as read
        </button>
      </section>

      <section className="space-y-2">
        {notifications.map((notification) => (
          <article key={notification.id} className="row-pill">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{notification.title}</p>
                <p className="mt-1 text-xs text-soft">{notification.message}</p>
                <p className="mt-2 text-[11px] text-white/55">{new Date(notification.created_at).toLocaleString()}</p>
              </div>
              {!notification.read ? (
                <button onClick={() => markRead(notification.id)} className="chip chip-active px-3 py-1 text-[11px]">
                  Read
                </button>
              ) : (
                <span className="chip chip-idle px-3 py-1 text-[11px]">Read</span>
              )}
            </div>
          </article>
        ))}

        {!loading && notifications.length === 0 ? <p className="text-sm text-soft">No notifications yet.</p> : null}
      </section>
    </AppShell>
  );
}
