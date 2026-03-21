import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "../_auth.js";
import { getStorage } from "../_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const fileId = parseInt(req.query.id as string);
  if (isNaN(fileId)) return res.status(400).json({ error: "Invalid file ID" });

  if (req.method === "DELETE") {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const storage = getStorage();
    const deleted = await storage.deleteFile(fileId);
    if (!deleted) return res.status(404).json({ error: "File not found" });
    return res.json({ success: true, storagePath: deleted.storagePath });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
