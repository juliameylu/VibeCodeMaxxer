import { useEffect, useState } from "react";
import MobileShell from "../../components/MobileShell";
import SectionHeader from "../../components/ui/SectionHeader";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import {
  createGroup,
  createGroupMember,
  fetchEventRsvps,
  fetchGroups
} from "../../lib/api/workflow";

export default function GroupsPage() {
  const [groupsState, setGroupsState] = useState({ loading: true, items: [], error: "" });
  const [newGroupName, setNewGroupName] = useState("");
  const [memberDraft, setMemberDraft] = useState({});
  const [rsvpEventId, setRsvpEventId] = useState("event:campus-live-001");
  const [rsvpState, setRsvpState] = useState({ loading: false, data: null });

  async function loadGroups() {
    setGroupsState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await fetchGroups();
      setGroupsState({ loading: false, items: data.items || [], error: "" });
    } catch (error) {
      setGroupsState({ loading: false, items: [], error: error.message || "Failed to load groups" });
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function addGroup() {
    if (!newGroupName.trim()) return;
    await createGroup({ name: newGroupName.trim() });
    setNewGroupName("");
    await loadGroups();
  }

  async function addMember(groupId) {
    const draft = memberDraft[groupId] || {};
    if (!draft.name) return;
    await createGroupMember(groupId, {
      name: draft.name,
      email: draft.email || null,
      phone: draft.phone || null
    });
    setMemberDraft((prev) => ({ ...prev, [groupId]: { name: "", email: "", phone: "" } }));
    await loadGroups();
  }

  async function loadRsvps() {
    setRsvpState({ loading: true, data: null });
    try {
      const data = await fetchEventRsvps(rsvpEventId);
      setRsvpState({ loading: false, data });
    } catch {
      setRsvpState({ loading: false, data: null });
    }
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader title="Groups" subtitle="Manage people, groups, and RSVP tracking" />
      <PageShell>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Create Group</p>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Study Group, Roommates, etc."
            />
            <button className="chip chip-active text-xs" onClick={addGroup}>Add</button>
          </div>
        </Card>

        {groupsState.error ? <Card>{groupsState.error}</Card> : null}
        {groupsState.loading ? <Card>Loading groups...</Card> : null}

        {groupsState.items.map((group) => (
          <Card key={group.group_id}>
            <h3 className="font-bold">{group.name}</h3>
            <p className="text-xs text-soft">{group.members.length} member(s)</p>
            <div className="mt-3 space-y-2">
              {group.members.map((member) => (
                <div key={member.group_member_id} className="row-pill">
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-soft">{member.email || member.phone || "No contact yet"}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
                placeholder="Name"
                value={memberDraft[group.group_id]?.name || ""}
                onChange={(event) => setMemberDraft((prev) => ({
                  ...prev,
                  [group.group_id]: { ...(prev[group.group_id] || {}), name: event.target.value }
                }))}
              />
              <input
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
                placeholder="Email"
                value={memberDraft[group.group_id]?.email || ""}
                onChange={(event) => setMemberDraft((prev) => ({
                  ...prev,
                  [group.group_id]: { ...(prev[group.group_id] || {}), email: event.target.value }
                }))}
              />
              <input
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
                placeholder="Phone"
                value={memberDraft[group.group_id]?.phone || ""}
                onChange={(event) => setMemberDraft((prev) => ({
                  ...prev,
                  [group.group_id]: { ...(prev[group.group_id] || {}), phone: event.target.value }
                }))}
              />
              <button className="chip chip-idle text-xs" onClick={() => addMember(group.group_id)}>Add Member</button>
            </div>
          </Card>
        ))}

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">RSVP Tracking</p>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
              value={rsvpEventId}
              onChange={(event) => setRsvpEventId(event.target.value)}
              placeholder="event:..."
            />
            <button className="chip chip-active text-xs" onClick={loadRsvps}>Load</button>
          </div>
          {rsvpState.loading ? <p className="mt-2 text-sm text-soft">Loading...</p> : null}
          {rsvpState.data ? (
            <div className="mt-3 text-sm">
              <p>Yes: {rsvpState.data.counts.yes} · No: {rsvpState.data.counts.no} · Maybe: {rsvpState.data.counts.maybe}</p>
              <div className="mt-2 space-y-2">
                {rsvpState.data.items.map((row) => (
                  <div key={row.rsvp_id} className="row-pill">
                    <p className="font-semibold">{row.user_id} · {row.vote}</p>
                    {row.comment ? <p className="text-xs text-soft">{row.comment}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </PageShell>
    </MobileShell>
  );
}
