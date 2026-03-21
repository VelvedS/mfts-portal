import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getStorage } from "./_storage.js";
import type { User } from "../shared/schema.js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AuthenticatedRequest = VercelRequest & {
  user: User;
};

/**
 * Extracts and verifies the Supabase JWT from the Authorization header.
 * Returns the portal User record or null.
 */
export async function getAuthUser(req: VercelRequest): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();

  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
  if (error || !supabaseUser) return null;

  const storage = getStorage();
  const portalUser = await storage.getUserBySupabaseId(supabaseUser.id);
  return portalUser || null;
}

/**
 * Middleware-style auth check. Returns user or sends 401.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return user;
}

/**
 * Require admin or team role.
 */
export async function requireTeamOrAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "team") {
    res.status(403).json({ error: "Insufficient permissions" });
    return null;
  }
  return user;
}

// CORS headers for Vercel functions
export function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
}
