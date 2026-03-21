import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "../_auth.js";
import { getDb } from "../_db.js";
import { teamMembers } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireTeamOrAdmin(req, res);
  if (!user) return;

  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: "order must be an array of member IDs" });
  }

  const db = getDb();
  for (let i = 0; i < order.length; i++) {
    await db.update(teamMembers).set({ sortOrder: i }).where(eq(teamMembers.id, order[i]));
  }

  return res.json({ success: true });
}
