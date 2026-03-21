import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_auth";
import { getStorage } from "./_storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Public — no auth required for viewing stats
  const storage = getStorage();
  const tasks = await storage.getTasks();
  const phases = await storage.getPhases();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
  const completedHours = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalBudget = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
  const spentBudget = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.cost || 0), 0);
  const completedPhases = phases.filter(p => p.status === "completed").length;

  return res.json({
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks: totalTasks - completedTasks - inProgressTasks,
    totalHours,
    completedHours,
    totalBudget,
    spentBudget,
    totalPhases: phases.length,
    completedPhases,
    progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  });
}
