import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, requireTeamOrAdmin, setCorsHeaders } from "../_auth";
import { getStorage } from "../_storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing
    const task = await storage.getTask(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    return res.json(task);
  }

  if (req.method === "PATCH") {
    // Auth required for editing
    const user = await requireAuth(req, res);
    if (!user) return;
    const updated = await storage.updateTask(id, req.body as any);
    if (!updated) return res.status(404).json({ error: "Task not found" });
    return res.json(updated);
  }

  if (req.method === "DELETE") {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const deleted = await storage.deleteTask(id);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
