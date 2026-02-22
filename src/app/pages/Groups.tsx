import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Users, User, Mail, Phone, Trash2, Edit2, X, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

interface Person {
  id: string;
  name: string;
  contact: string; // email or phone
  contactType: "email" | "sms";
}

interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

const initialPeople: Person[] = [
  { id: "p1", name: "Alex M.", contact: "alex@calpoly.edu", contactType: "email" },
  { id: "p2", name: "Emma R.", contact: "(805) 555-0123", contactType: "sms" },
  { id: "p3", name: "Sarah K.", contact: "sarah@calpoly.edu", contactType: "email" },
  { id: "p4", name: "Jake T.", contact: "(805) 555-0456", contactType: "sms" },
];

const initialGroups: Group[] = [
  { id: "g1", name: "Beach Crew", memberIds: ["p1", "p2", "p3"] },
  { id: "g2", name: "Study Group", memberIds: ["p1", "p4"] },
];

export function Groups() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [view, setView] = useState<"list" | "addPerson" | "addGroup" | "groupDetail">("list");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Forms
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newContactType, setNewContactType] = useState<"email" | "sms">("sms");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const addPerson = () => {
    if (!newName.trim() || !newContact.trim()) return;
    const person: Person = {
      id: Date.now().toString(),
      name: newName,
      contact: newContact,
      contactType: newContactType,
    };
    setPeople([...people, person]);
    setNewName(""); setNewContact(""); setNewContactType("sms");
    setView("list");
    toast.success(`${person.name} added!`);
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
    setGroups(groups.map(g => ({ ...g, memberIds: g.memberIds.filter(m => m !== id) })));
    toast.success("Person removed");
  };

  const addGroup = () => {
    if (!groupName.trim()) return;
    const group: Group = {
      id: Date.now().toString(),
      name: groupName,
      memberIds: selectedMembers,
    };
    setGroups([...groups, group]);
    setGroupName(""); setSelectedMembers([]);
    setView("list");
    toast.success(`"${group.name}" group created!`);
  };

  const deleteGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
    setSelectedGroup(null);
    setView("list");
    toast.success("Group deleted");
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const sendGroupInvite = (group: Group, eventName?: string) => {
    const members = people.filter(p => group.memberIds.includes(p.id));
    const msg = eventName
      ? `Hey! Join us for "${eventName}" — RSVP on PolyJarvis!`
      : `Hey! Check out PolyJarvis for SLO events!`;

    // In a real app, this would send emails/SMS via backend
    members.forEach(m => {
      console.log(`Sending to ${m.name} (${m.contactType}): ${m.contact}`);
    });

    if (navigator.share) {
      navigator.share({ title: "PolyJarvis Invite", text: msg }).catch(() => {
        window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
      });
    } else {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    }
    toast.success(`Invite sent to ${members.length} people!`);
  };

  return (
    <div className="min-h-full bg-transparent text-white pb-24">
      <PageHeader />
      {/* Header */}
      <div className="px-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button onClick={() => { setView("list"); setSelectedGroup(null); }} className="p-1 -ml-1 text-white/30">
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              {view === "list" ? "GROUPS" : view === "addPerson" ? "ADD PERSON" : view === "addGroup" ? "NEW GROUP" : selectedGroup?.name?.toUpperCase()}
            </h1>
            {view === "list" && <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider">MANAGE YOUR PEOPLE & INVITE THEM TO EVENTS</p>}
          </div>
          {view === "list" && (
            <div className="flex gap-2">
              <button onClick={() => setView("addPerson")} className="p-2 bg-white/8 rounded-full text-white/40 active:scale-90 transition-transform">
                <User size={18} />
              </button>
              <button onClick={() => setView("addGroup")} className="p-2 bg-[#8BC34A] rounded-full text-[#233216] active:scale-90 transition-transform">
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {view === "list" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">MY GROUPS</h2>
              {groups.length === 0 ? (
                <div className="bg-white/3 rounded-xl p-6 text-center border border-dashed border-white/10">
                  <p className="text-white/25 text-sm font-bold">NO GROUPS YET</p>
                  <button onClick={() => setView("addGroup")} className="text-[#8BC34A] text-sm font-bold mt-2">CREATE ONE</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => {
                    const memberCount = group.memberIds.length;
                    const memberNames = people.filter(p => group.memberIds.includes(p.id)).map(p => p.name).join(", ");
                    return (
                      <div
                        key={group.id}
                        onClick={() => { setSelectedGroup(group); setView("groupDetail"); }}
                        className="bg-white/5 rounded-xl border border-white/8 p-4 flex items-center gap-3 active:bg-white/8 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#8BC34A]/10 flex items-center justify-center">
                          <Users size={18} className="text-[#8BC34A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm">{group.name}</h3>
                          <p className="text-[11px] text-white/30 truncate">{memberCount} people · {memberNames}</p>
                        </div>
                        <ChevronRight size={16} className="text-white/15" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">ALL PEOPLE ({people.length})</h2>
              <div className="space-y-2">
                {people.map(person => (
                  <div key={person.id} className="bg-white/5 rounded-xl border border-white/8 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/40">
                      {person.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{person.name}</p>
                      <p className="text-[11px] text-white/30 flex items-center gap-1">
                        {person.contactType === "email" ? <Mail size={9} /> : <Phone size={9} />}
                        {person.contact}
                      </p>
                    </div>
                    <button onClick={() => removePerson(person.id)} className="p-1.5 text-white/10 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "addPerson" && (
          <div className="space-y-4 max-w-sm">
            <input type="text" placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#8BC34A]/40 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewContactType("sms")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${
                  newContactType === "sms" ? "bg-[#8BC34A] text-[#233216]" : "bg-white/8 text-white/30"
                }`}
              >
                <Phone size={14} /> TEXT
              </button>
              <button
                onClick={() => setNewContactType("email")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${
                  newContactType === "email" ? "bg-[#8BC34A] text-[#233216]" : "bg-white/8 text-white/30"
                }`}
              >
                <Mail size={14} /> EMAIL
              </button>
            </div>
            <input
              type={newContactType === "email" ? "email" : "tel"}
              placeholder={newContactType === "email" ? "email@calpoly.edu" : "(805) 555-0000"}
              value={newContact} onChange={e => setNewContact(e.target.value)}
              className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#8BC34A]/40 outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setView("list")} className="flex-1 py-3 text-white/30 font-bold rounded-xl">CANCEL</button>
              <button onClick={addPerson} className="flex-1 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold shadow-md">ADD PERSON</button>
            </div>
          </div>
        )}

        {view === "addGroup" && (
          <div className="space-y-4 max-w-sm">
            <input type="text" placeholder='Group name (e.g. "Beach Crew")' value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#8BC34A]/40 outline-none"
            />
            <div>
              <p className="text-[10px] text-white/25 font-black uppercase tracking-widest mb-2">SELECT MEMBERS</p>
              <div className="space-y-2">
                {people.map(person => (
                  <button
                    key={person.id}
                    onClick={() => toggleMember(person.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedMembers.includes(person.id)
                        ? "border-[#8BC34A] bg-[#8BC34A]/10"
                        : "border-white/8 bg-white/5"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                      selectedMembers.includes(person.id) ? "bg-[#8BC34A] border-[#8BC34A] text-[#233216]" : "border-white/20"
                    }`}>
                      {selectedMembers.includes(person.id) && "✓"}
                    </div>
                    <span className="text-sm font-bold text-white">{person.name}</span>
                    <span className="text-xs text-white/25 ml-auto">{person.contact}</span>
                  </button>
                ))}
              </div>
              {people.length === 0 && (
                <div className="text-center py-4 text-white/25 text-sm">
                  No people yet. <button onClick={() => setView("addPerson")} className="text-[#8BC34A] font-bold">ADD SOMEONE FIRST</button>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setView("list")} className="flex-1 py-3 text-white/30 font-bold rounded-xl">CANCEL</button>
              <button onClick={addGroup} className="flex-1 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold shadow-md">
                CREATE ({selectedMembers.length} SELECTED)
              </button>
            </div>
          </div>
        )}

        {view === "groupDetail" && selectedGroup && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-[#8BC34A]/10 flex items-center justify-center">
                <Users size={26} className="text-[#8BC34A]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
                <p className="text-xs text-white/30">{selectedGroup.memberIds.length} members</p>
              </div>
            </div>

            <div className="space-y-2">
              {people.filter(p => selectedGroup.memberIds.includes(p.id)).map(person => (
                <div key={person.id} className="bg-white/5 rounded-xl border border-white/8 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/40">
                    {person.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{person.name}</p>
                    <p className="text-[11px] text-white/30">{person.contact}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => sendGroupInvite(selectedGroup)}
              className="w-full py-3.5 bg-[#8BC34A] text-[#233216] rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
            >
              <Send size={16} /> SEND GROUP INVITE
            </button>

            <button
              onClick={() => deleteGroup(selectedGroup.id)}
              className="w-full py-3 text-red-400/60 font-bold text-sm flex items-center justify-center gap-1"
            >
              <Trash2 size={14} /> DELETE GROUP
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}