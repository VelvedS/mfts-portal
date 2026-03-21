import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireTeamOrAdmin, setCorsHeaders } from "../_auth.js";
import { getStorage } from "../_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const storage = getStorage();
  const pathSegments = req.query.path;
  const fileId = Array.isArray(pathSegments) ? parseInt(pathSegments[0]) : pathSegments ? parseInt(pathSegments) : NaN;

  // DELETE /api/files/123
  if (req.method === "DELETE" && !isNaN(fileId)) {
    const user = await requireTeamOrAdmin(req, res);
    if (!user) return;
    const deleted = await storage.deleteFile(fileId);
    if (!deleted) return res.status(404).json({ error: "File not found" });
    return res.json({ success: true, storagePath: deleted.storagePath });
  }

  // POST /api/files — create file metadata
  if (req.method === "POST") {
    const { taskId, name, storagePath, size, mimeType, uploadedBy } = req.body;
    if (!taskId || !name || !storagePath) return res.status(400).json({ error: "taskId, name, and storagePath required" });
    const file = await storage.createFile({
      taskId,
      name,
      storagePath,
      size: size || 0,
      mimeType: mimeType || null,
      uploadedBy: uploadedBy || 0,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json(file);
  }

  // GET /api/files or GET /api/files?taskId=5
  if (req.method === "GET") {
    const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : null;
    if (taskId && !isNaN(taskId)) {
      const files = await storage.getFilesByTask(taskId);
      return res.json(files);
    }
    const files = await storage.getFiles();
    return res.json(files);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
