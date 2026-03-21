import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders, requireTeamOrAdmin } from "./_auth.js";
import { getStorage } from "./_storage.js";
import { insertTeamMemberSchema } from "../shared/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing team
    const members = await storage.getTeamMembers();
    return res.json(members);
  }

  if (req.method === "POST") {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const parsed = insertTeamMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const member = await storage.createTeamMember(parsed.data);
    return res.status(201).json(member);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
