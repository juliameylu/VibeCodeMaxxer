import cors from "cors";
import express from "express";
import usersRoutes from "./routes/users.js";
import preferencesRoutes from "./routes/preferences.js";
import calendarRoutes from "./routes/calendar.js";
import reservationsRoutes from "./routes/reservations.js";
import { nowIsoUtc } from "./store/time.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: false,
  }),
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: nowIsoUtc() });
});

app.use(usersRoutes);
app.use(preferencesRoutes);
app.use(calendarRoutes);
app.use(reservationsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});
