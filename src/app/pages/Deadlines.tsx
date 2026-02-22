import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Plus, Users, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

interface Assignment {
  id: string;
  course: string;
  name: string;
  dueTime: string;
  dueDate: string;
  done: boolean;
}

const todayAssignments: Assignment[] = [
  { id: "t1", course: "IME 223", name: 'Term Project | "5S Analysis"', dueTime: "8:10 AM", dueDate: "Today", done: false },
  { id: "t2", course: "IME 223", name: 'Lab | "Assembly Line Data Collection"', dueTime: "11:00 AM", dueDate: "Today", done: false },
];

const weekAssignments: Assignment[] = [
  { id: "w1", course: "CSC 357", name: "Lab 5: Signals & Pipes", dueTime: "11:59 PM", dueDate: "Wed Feb 26", done: false },
  { id: "w2", course: "ENGL 149", name: "Research Paper Draft 2", dueTime: "5:00 PM", dueDate: "Thu Feb 27", done: false },
  { id: "w3", course: "IME 223", name: "Homework 7", dueTime: "8:10 AM", dueDate: "Fri Feb 28", done: false },
];

export function Deadlines() {
  const navigate = useNavigate();
  const [today, setToday] = useState(todayAssignments);
  const [week, setWeek] = useState(weekAssignments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", course: "", time: "" });

  const markDone = (id: string, isToday: boolean) => {
    if (isToday) {
      setToday(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
    } else {
      setWeek(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
    }
    toast.success("Nice work!");
  };

  const removeTask = (id: string, isToday: boolean) => {
    if (isToday) {
      setToday(prev => prev.filter(a => a.id !== id));
    } else {
      setWeek(prev => prev.filter(a => a.id !== id));
    }
  };

  const addTask = () => {
    if (!newTask.name.trim()) return;
    const task: Assignment = {
      id: Date.now().toString(),
      course: newTask.course || "General",
      name: newTask.name,
      dueTime: newTask.time || "No time",
      dueDate: "Today",
      done: false,
    };
    setToday([...today, task]);
    setNewTask({ name: "", course: "", time: "" });
    setShowAddModal(false);
    toast.success("Task added!");
  };

  const allTodayDone = today.length > 0 && today.every(a => a.done);
  const todayRemaining = today.filter(a => !a.done).length;

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      <PageHeader />

      {/* Header */}
      <div className="bg-gradient-to-b from-[#8BC34A]/10 to-transparent px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#8BC34A] text-[10px] font-semibold capitalize tracking-wider">Lock-in Mode</p>
            <h1 className="text-2xl font-bold text-white tracking-tight capitalize">Deadlines</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-white/10 rounded-full text-white/40 active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-[#8BC34A] rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${today.length > 0 ? ((today.filter(a => a.done).length / today.length) * 100) : 0}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-white/25 text-xs mt-2 font-bold">
          {todayRemaining === 0 ? "ALL DONE TODAY!" : `${todayRemaining} REMAINING TODAY`}
        </p>
      </div>

      <div className="px-5 -mt-2 space-y-6">
        {/* TODAY */}
        <div>
          <h2 className="text-[10px] font-semibold text-[#8BC34A] capitalize tracking-wider mb-3 flex items-center gap-1.5">
            <AlertCircle size={12} /> Due Today
          </h2>

          {today.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-6 text-center border border-white/5">
              <p className="text-white/25 font-bold">No tasks due today!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {today.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`bg-white/8 backdrop-blur-sm rounded-xl border p-4 flex items-center gap-3 ${
                      task.done ? "border-[#8BC34A]/20 opacity-50" : "border-white/10"
                    }`}
                  >
                    <button
                      onClick={() => markDone(task.id, true)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.done ? "bg-[#8BC34A] border-[#8BC34A] text-[#233216]" : "border-white/20 text-transparent hover:border-[#8BC34A]"
                      }`}
                    >
                      <Check size={14} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-white ${task.done ? "line-through opacity-50" : ""}`}>
                        {task.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold bg-white/10 text-white/40 px-2 py-0.5 rounded">{task.course}</span>
                        <span className="text-[10px] text-[#8BC34A] font-bold flex items-center gap-0.5">
                          <Clock size={9} /> {task.dueTime}
                        </span>
                      </div>
                    </div>

                    <button onClick={() => removeTask(task.id, true)} className="p-1 text-white/10 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* THIS WEEK */}
        <div>
          <h2 className="text-[10px] font-semibold text-white/20 capitalize tracking-wider mb-3">This Week</h2>
          <div className="space-y-2">
            {week.map(task => (
              <div
                key={task.id}
                className={`bg-white/5 rounded-xl border border-white/5 p-3 flex items-center gap-3 ${
                  task.done ? "opacity-30" : ""
                }`}
              >
                <button
                  onClick={() => markDone(task.id, false)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    task.done ? "bg-[#8BC34A] border-[#8BC34A] text-[#233216]" : "border-white/15 text-transparent"
                  }`}
                >
                  <Check size={12} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold text-white/60 ${task.done ? "line-through" : ""}`}>{task.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-white/20">{task.course}</span>
                    <span className="text-[9px] text-white/20">{task.dueDate} · {task.dueTime}</span>
                  </div>
                </div>
                <button onClick={() => removeTask(task.id, false)} className="p-1 text-white/10 hover:text-red-400">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Study with friends */}
        <Link to="/groups">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 active:bg-white/8 transition-colors">
            <div className="bg-[#8BC34A]/15 p-2 rounded-lg"><Users size={18} className="text-[#8BC34A]" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">STUDY WITH FRIENDS?</p>
              <p className="text-xs text-white/25">Invite your group to lock in together</p>
            </div>
            <ArrowRight size={16} className="text-white/15" />
          </div>
        </Link>

        {/* Exit Lock-In */}
        <button
          onClick={() => navigate("/dashboard")}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all ${
            allTodayDone
              ? "bg-[#8BC34A] text-[#233216] shadow-lg shadow-[#8BC34A]/25"
              : "bg-white/8 text-white/30 border border-white/10"
          }`}
        >
          {allTodayDone ? "ALL DONE! EXIT LOCK-IN →" : "EXIT LOCK-IN MODE"}
        </button>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-[#0a0f07]/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 shadow-2xl"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-white mb-4">Add Task</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Task name *" value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#8BC34A]/40"
                />
                <input type="text" placeholder="Course (e.g. CSC 357)" value={newTask.course} onChange={e => setNewTask({ ...newTask, course: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#8BC34A]/40"
                />
                <input type="time" value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })}
                  className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs sm:text-sm text-white outline-none focus:border-[#8BC34A]/40 [color-scheme:dark]"
                />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-white/25 font-bold">CANCEL</button>
                  <button onClick={addTask} className="flex-1 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold shadow-md">ADD</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
