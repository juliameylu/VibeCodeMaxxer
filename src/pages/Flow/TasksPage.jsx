import { CheckCircle2, Circle, Calendar } from "lucide-react";
import { useState } from "react";
import MobileShell from "../../components/MobileShell";

const FLOW_TASKS = [
  { id: 1, title: "Finalize bio slides", time: "Today 4:30 PM", done: false },
  { id: 2, title: "Submit physics set", time: "Tonight 11:59 PM", done: false },
  { id: 3, title: "Pack gym bag", time: "After class", done: true },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState(FLOW_TASKS);

  const toggle = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  return (
    <MobileShell>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">My Day</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <Calendar size={24} className="text-amberSoft" />
          Task Flow
        </h1>
        <p className="mt-1 text-sm text-soft">A quick, friendly view of what matters next.</p>
      </section>

      <section className="mt-5 space-y-3">
        {tasks.map((task) => (
          <button key={task.id} onClick={() => toggle(task.id)} className="row-pill flex w-full items-center gap-3 text-left">
            {task.done ? <CheckCircle2 className="text-amberSoft" size={20} /> : <Circle className="text-ink/35" size={20} />}
            <div>
              <p className={`font-semibold ${task.done ? "text-ink/45 line-through" : "text-ink"}`}>{task.title}</p>
              <p className="text-xs text-soft">{task.time}</p>
            </div>
          </button>
        ))}
      </section>
    </MobileShell>
  );
}
