import { useEffect, useState } from "react";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  const loadGroups = async () => {
    const data = await apiFetch("/api/groups");
    setGroups(data.groups || []);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const createGroup = async (event) => {
    event.preventDefault();
    const data = await apiFetch("/api/groups", { method: "POST", body: { name } });
    setName("");
    setStatus(`Created group ${data.group.name}`);
    loadGroups();
  };

  const addDemoMember = async (groupId) => {
    await apiFetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: { display_name: "Study Buddy", email: "buddy@example.com" }
    });
    setStatus("Added member.");
    loadGroups();
  };

  return (
    <AppShell title="Groups" subtitle="Manage people and named groups for invites">
      <form onSubmit={createGroup} className="glass-card p-4">
        <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Group name" className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm" />
        <button className="chip chip-active mt-2 w-full py-3 text-sm">Create group</button>
      </form>

      {groups.map((group) => (
        <section key={group.id} className="row-pill">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">{group.name}</h2>
            <button onClick={() => addDemoMember(group.id)} className="chip chip-idle text-xs">Add member</button>
          </div>
          <p className="mt-2 text-xs text-soft">Members: {group.members?.length || 0}</p>
        </section>
      ))}

      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
