import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_auth.js";
import { getStorage } from "./_storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const storage = getStorage();

  if (req.method === "GET") {
    // Public — no auth required for viewing
    const phases = await storage.getPhases();
    return res.json(phases);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
