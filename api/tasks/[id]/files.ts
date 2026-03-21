import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../../_auth.js";
import { getStorage } from "../../_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const taskId = parseInt(req.query.id as string);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

  const storage = getStorage();

  if (req.method === "GET") {
    const files = await storage.getFilesByTask(taskId);
    return res.json(files);
  }

  if (req.method === "POST") {
    const { name, storagePath, size, mimeType, uploadedBy } = req.body;
    if (!name || !storagePath) return res.status(400).json({ error: "name and storagePath required" });

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

  return res.status(405).json({ error: "Method not allowed" });
}
