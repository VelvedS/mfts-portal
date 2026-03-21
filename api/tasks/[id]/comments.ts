import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../../_auth.js";
import { getStorage } from "../../_storage.js";
import { insertCommentSchema } from "../../../shared/schema.js";

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
    const authHeader = req.headers.authorization;
    let authorId: number;

    if (authHeader?.startsWith("Bearer ")) {
      // Authenticated user flow
      const { getAuthUser } = await import("../../_auth.js");
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ error: "Authentication required" });
      authorId = user.teamMemberId || user.id;
    } else {
      // Client flow — must provide authorId
      const clientAuthorId = req.body?.authorId;
      if (!clientAuthorId) return res.status(400).json({ error: "authorId required for client comments" });
      const member = await storage.getTeamMember(clientAuthorId);
      if (!member || !member.isClient) return res.status(403).json({ error: "Only client team members can comment without auth" });
      authorId = clientAuthorId;
    }

    const parsed = insertCommentSchema.safeParse({
      ...req.body,
      taskId,
      authorId,
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const comment = await storage.createComment(parsed.data);
    return res.status(201).json(comment);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
