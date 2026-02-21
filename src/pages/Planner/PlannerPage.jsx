import { Link } from "react-router-dom";
import { Plus, Trash2, CheckCircle2, Circle, Calendar } from "lucide-react";
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
  const icons = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors[priority]}`}
    >
      {icons[priority]} {priority}
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

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completionRate = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-sm">
                📍
              </div>
              <span className="text-xl font-bold text-primary hidden sm:block">
                SLO Day
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className="text-slate-700 hover:text-primary transition font-medium text-sm"
              >
                Home
              </Link>
              <Link
                to="/planner"
                className="text-primary font-bold text-sm border-b-2 border-primary pb-2"
              >
                My Tasks
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={32} className="text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
              <p className="text-slate-600">Manage your assignments and deadlines</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="card-shadow p-5 mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-slate-900">Progress</p>
              <p className="text-sm font-bold text-primary">{completionRate}%</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-2">
              {completedCount} of {tasks.length} tasks complete
            </p>
          </div>
        </div>

        {/* Add Task */}
        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition"
            />
            <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 font-medium hover:shadow-md">
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-8">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">No tasks yet!</p>
              <p className="text-slate-500 text-sm">Add one above to get started</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`card-shadow p-5 transition hover-scale ${
                  task.completed ? "bg-slate-50" : "bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 hover:border-primary transition flex items-center justify-center flex-shrink-0"
                  >
                    {task.completed && (
                      <span className="text-primary text-sm">✓</span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold leading-tight ${
                        task.completed
                          ? "line-through text-slate-500"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar size={14} />
                        <span>{task.dueDate}</span>
                      </div>
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-xs text-slate-600">{task.dueTime}</span>
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      <PriorityColor priority={task.priority} />
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-400 hover:text-red-600 transition flex-shrink-0"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Cards */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card-shadow p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-slate-600 mt-1">Pending</p>
            </div>
            <div className="card-shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-slate-600 mt-1">Complete</p>
            </div>
            <div className="card-shadow p-4 text-center">
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
              <p className="text-xs text-slate-600 mt-1">Total</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
