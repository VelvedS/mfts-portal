import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser, setCorsHeaders, getSupabaseAdmin } from "../_auth";
import { getStorage } from "../_storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarInitials: user.avatarInitials,
    teamMemberId: user.teamMemberId,
  });
}
