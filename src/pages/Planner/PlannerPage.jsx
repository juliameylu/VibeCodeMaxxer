import { Link } from "react-router-dom";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

const DUMMY_TASKS = [
  {
    id: 1,
    title: "Physics Problem Set 5",
    dueDate: "2026-02-20",
    dueTime: "11:59 PM",
    priority: "high",
    completed: false,
  },
  {
    id: 2,
    title: "Group Project Presentation",
    dueDate: "2026-02-22",
    dueTime: "2:00 PM",
    priority: "high",
    completed: false,
  },
  {
    id: 3,
    title: "Read Chapter 8 (Bio)",
    dueDate: "2026-02-21",
    dueTime: "9:00 AM",
    priority: "medium",
    completed: false,
  },
  {
    id: 4,
    title: "Email professor about midterm",
    dueDate: "2026-02-20",
    dueTime: "5:00 PM",
    priority: "low",
    completed: true,
  },
];

function PriorityColor({ priority }) {
  const colors = {
    high: "text-red-600 bg-red-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-green-600 bg-green-50",
  };
  return (
    <span
      className={`text-xs font-bold px-2 py-1 rounded-full ${colors[priority]}`}
    >
      {priority}
    </span>
  );
}

export default function PlannerPage() {
  const [tasks, setTasks] = useState(DUMMY_TASKS);
  const [newTask, setNewTask] = useState("");

  const toggleTask = (id) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            📍 SLO Day
          </Link>
          <nav className="flex gap-3">
            <Link
              to="/"
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Tasks</h1>
          <p className="text-slate-600 mb-6">
            Manage all your tasks and deadlines in one place.
          </p>

          {/* Add Task */}
          <div className="flex gap-2 mb-8">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none"
            />
            <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2">
              <Plus size={18} />
              Add
            </button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition ${
                  task.completed
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white border-slate-300 hover:border-primary/30"
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="text-slate-400 hover:text-primary transition"
                >
                  {task.completed ? (
                    <CheckCircle2 size={24} className="text-green-500" />
                  ) : (
                    <Circle size={24} />
                  )}
                </button>

                <div className="flex-1">
                  <h3
                    className={`font-semibold ${task.completed ? "line-through text-slate-500" : "text-slate-900"}`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex gap-3 mt-2 text-sm text-slate-600">
                    <span>📅 {task.dueDate}</span>
                    <span>🕐 {task.dueTime}</span>
                    <PriorityColor priority={task.priority} />
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-slate-400 hover:text-red-600 transition"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {tasks.filter((t) => !t.completed).length}
                </p>
                <p className="text-xs text-slate-600">Pending Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter((t) => t.completed).length}
                </p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{tasks.length}</p>
                <p className="text-xs text-slate-600">Total Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
