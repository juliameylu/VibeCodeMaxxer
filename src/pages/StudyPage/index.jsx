import { useEffect, useState } from "react";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function StudyPage() {
  const [tasks, setTasks] = useState([]);
  const [studyLoad, setStudyLoad] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [showHowTo, setShowHowTo] = useState(false);

  const [manualTitle, setManualTitle] = useState("");
  const [manualCourse, setManualCourse] = useState("General");
  const [manualDueAt, setManualDueAt] = useState("");
  const [manualDuration, setManualDuration] = useState(60);

  const [canvasToken, setCanvasToken] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const data = await apiFetch("/api/study/tasks");
    setTasks(data.tasks || []);
    setStudyLoad(data.study_load || null);
  };

  useEffect(() => {
    refresh();
  }, []);

  const addManualAssignment = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      await apiFetch("/api/study/tasks", {
        method: "POST",
        body: {
          title: manualTitle,
          source: "manual",
          course: manualCourse,
          due_at: manualDueAt ? new Date(manualDueAt).toISOString() : undefined,
          duration_min: Number(manualDuration) || 60
        }
      });

      setManualTitle("");
      setManualCourse("General");
      setManualDueAt("");
      setManualDuration(60);
      setStatus("Manual assignment added.");
      refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add assignment");
    }
  };

  const connectCanvasWithToken = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      await apiFetch("/api/canvas/connect/token", {
        method: "POST",
        body: { token: canvasToken }
      });
      setCanvasToken("");
      setStatus("Canvas connected. You can now sync and manage Canvas tasks.");
      refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not connect Canvas");
    }
  };

  const toggleTask = async (taskId) => {
    await apiFetch(`/api/study/tasks/${taskId}/toggle`, { method: "POST", body: {} });
    refresh();
  };

  return (
    <AppShell title="Study" subtitle="Assignments, deadlines, and lock-in mode">
      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Workload score</p>
          <span className="chip chip-active text-xs">{studyLoad?.study_load_score ?? 0}</span>
        </div>
        <p className="mt-2 text-xs text-soft">
          Due soon: {studyLoad?.due_soon_count ?? 0} • Unfinished: {studyLoad?.unfinished_count ?? 0}
        </p>

        <button onClick={() => setModalOpen(true)} className="chip chip-idle mt-3 inline-block text-xs">
          School Assignments
        </button>
      </section>

      <section className="space-y-2">
        {tasks.map((task) => (
          <button key={task.id} onClick={() => toggleTask(task.id)} className="row-pill flex w-full items-center justify-between text-left">
            <div>
              <p className={`font-semibold ${task.done ? "line-through text-ink/45" : "text-ink"}`}>{task.title}</p>
              <p className="text-xs text-soft">
                {task.course} • due {new Date(task.due_at).toLocaleString()}
                {task.duration_min ? ` • ${task.duration_min} min` : ""}
              </p>
            </div>
            <span className={`chip text-xs ${task.done ? "chip-active" : "chip-idle"}`}>{task.done ? "Done" : "Open"}</span>
          </button>
        ))}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <section className="w-full max-w-lg rounded-[24px] border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">School Assignments</h2>
              <button onClick={() => setModalOpen(false)} className="chip chip-idle px-3 py-1 text-xs">Close</button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setActiveTab("manual")}
                className={`chip text-xs ${activeTab === "manual" ? "chip-active" : "chip-idle"}`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab("canvas")}
                className={`chip text-xs ${activeTab === "canvas" ? "chip-active" : "chip-idle"}`}
              >
                Connect Canvas
              </button>
            </div>

            {activeTab === "manual" ? (
              <form onSubmit={addManualAssignment} className="mt-3 space-y-2">
                <input
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  required
                  placeholder="Assignment name"
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
                />
                <input
                  value={manualCourse}
                  onChange={(event) => setManualCourse(event.target.value)}
                  placeholder="Course (e.g., CSC 202)"
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
                />
                <label className="block text-xs font-semibold text-ink/70">
                  Due date & time
                  <input
                    type="datetime-local"
                    value={manualDueAt}
                    onChange={(event) => setManualDueAt(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-ink/70">
                  Estimated duration (minutes)
                  <input
                    type="number"
                    min="5"
                    value={manualDuration}
                    onChange={(event) => setManualDuration(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
                  />
                </label>

                <button className="chip chip-active w-full py-3 text-sm">Add Assignment</button>
              </form>
            ) : (
              <form onSubmit={connectCanvasWithToken} className="mt-3 space-y-2">
                <input
                  value={canvasToken}
                  onChange={(event) => setCanvasToken(event.target.value)}
                  required
                  placeholder="Paste Canvas API key/token"
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
                />
                <button className="chip chip-active w-full py-3 text-sm">Connect to Canvas</button>
                <button
                  type="button"
                  onClick={() => setShowHowTo((prev) => !prev)}
                  className="chip chip-idle w-full py-3 text-sm"
                >
                  {showHowTo ? "Hide How To" : "How to find Canvas key"}
                </button>

                {showHowTo ? (
                  <div className="row-pill text-xs text-soft">
                    <p className="font-semibold text-ink">How to get your Canvas API token:</p>
                    <p className="mt-1">1. Open Canvas and sign in.</p>
                    <p>2. Click Account → Settings.</p>
                    <p>3. Scroll to "Approved Integrations".</p>
                    <p>4. Click "+ New Access Token" and create token.</p>
                    <p>5. Copy token and paste it above.</p>
                  </div>
                ) : null}
              </form>
            )}

            {status ? <p className="mt-3 text-sm font-semibold text-ink">{status}</p> : null}
            {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
