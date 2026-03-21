import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "../_auth";
import { getStorage } from "../_storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid phase ID" });

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing
    const phase = await storage.getPhase(id);
    if (!phase) return res.status(404).json({ error: "Phase not found" });
    return res.json(phase);
  }

  if (req.method === "PATCH") {
    // Auth required for editing
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const updated = await storage.updatePhase(id, req.body as any);
    if (!updated) return res.status(404).json({ error: "Phase not found" });
    return res.json(updated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
