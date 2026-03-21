import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_auth.js";
import { getStorage } from "./_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const storage = getStorage();
  const files = await storage.getFiles();
  return res.json(files);
}
