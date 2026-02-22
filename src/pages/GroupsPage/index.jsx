import { useEffect, useState } from "react";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [name, setName] = useState("");
  const [selectedByGroup, setSelectedByGroup] = useState({});
  const [status, setStatus] = useState("");

  const loadGroups = async () => {
    const data = await apiFetch("/api/groups");
    setGroups(data.groups || []);
  };

  const loadDirectory = async () => {
    const data = await apiFetch("/api/users/directory");
    setDirectory(data.users || []);
  };

  useEffect(() => {
    loadGroups();
    loadDirectory();
  }, []);

  const createGroup = async (event) => {
    event.preventDefault();
    const data = await apiFetch("/api/groups", { method: "POST", body: { name } });
    setName("");
    setStatus(`Created group ${data.group.name}`);
    loadGroups();
  };

  const addMemberFromDirectory = async (groupId) => {
    const userId = selectedByGroup[groupId];
    if (!userId) return;
    await apiFetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: { user_id: userId }
    });
    setStatus("Added account member.");
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
            <div className="flex items-center gap-2">
              <select
                value={selectedByGroup[group.id] || ""}
                onChange={(event) => setSelectedByGroup((prev) => ({ ...prev, [group.id]: event.target.value }))}
                className="rounded-xl border border-black/10 bg-white/70 px-2 py-1 text-xs"
              >
                <option value="">Select user</option>
                {directory.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name} · {user.phone || "no phone"}
                  </option>
                ))}
              </select>
              <button onClick={() => addMemberFromDirectory(group.id)} className="chip chip-idle text-xs">Add member</button>
            </div>
          </div>
          <p className="mt-2 text-xs text-soft">Members: {group.members?.length || 0}</p>
          <div className="mt-2 space-y-1">
            {(group.members || []).map((member) => (
              <p key={member.id} className="text-xs text-soft">
                {member.display_name} · {member.phone || "no phone"}
              </p>
            ))}
          </div>
        </section>
      ))}

      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
