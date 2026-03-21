import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "../_auth.js";
import { getStorage } from "../_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team member ID" });

  const storage = getStorage();

  if (req.method === "PATCH") {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const updated = await storage.updateTeamMember(id, req.body as any);
    if (!updated) return res.status(404).json({ error: "Team member not found" });
    return res.json(updated);
  }

  if (req.method === "DELETE") {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const deleted = await storage.deleteTeamMember(id);
    if (!deleted) return res.status(404).json({ error: "Team member not found" });
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
