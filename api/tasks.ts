import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "./_auth.js";
import { getStorage } from "./_storage.js";
import { insertTaskSchema } from "../shared/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing
    const tasks = await storage.getTasks();
    return res.json(tasks);
  }

  if (req.method === "POST") {
    // Only authenticated team/admin can create tasks
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const task = await storage.createTask(parsed.data);
    return res.status(201).json(task);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
