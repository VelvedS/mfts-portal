import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, setCorsHeaders } from "../../_auth";
import { getStorage } from "../../_storage";
import { insertCommentSchema } from "../../../shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const taskId = parseInt(req.query.id as string);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing comments
    const comments = await storage.getCommentsByTask(taskId);
    return res.json(comments);
  }

  if (req.method === "POST") {
    // Auth required for posting comments
    const user = await requireAuth(req, res);
    if (!user) return;
    const parsed = insertCommentSchema.safeParse({
      ...req.body,
      taskId,
      authorId: user.teamMemberId || user.id,
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const comment = await storage.createComment(parsed.data);
    return res.status(201).json(comment);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
