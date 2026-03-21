import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthUser, setCorsHeaders, getSupabaseAdmin } from "../_auth.js";
import { getStorage } from "../_storage.js";

/**
 * POST /api/auth/setup
 * Called after a user signs up via Supabase Auth.
 * Creates or links the portal user record.
 * Body: { name?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify the Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

  if (error || !supabaseUser) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const storage = getStorage();

  // Check if portal user already exists
  let portalUser = await storage.getUserBySupabaseId(supabaseUser.id);
  if (portalUser) {
    return res.json({
      id: portalUser.id,
      email: portalUser.email,
      name: portalUser.name,
      role: portalUser.role,
      avatarInitials: portalUser.avatarInitials,
      teamMemberId: portalUser.teamMemberId,
    });
  }

  // Check if there's a user matching the email (pre-seeded) and link them
  portalUser = await storage.getUserByEmail(supabaseUser.email!);
  if (portalUser) {
    // Link Supabase ID to existing portal user
    const { getDb } = await import("../_db.js");
    const { users } = await import("../../shared/schema.js");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const [updated] = await db.update(users)
      .set({ supabaseId: supabaseUser.id })
      .where(eq(users.id, portalUser.id))
      .returning();

    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      avatarInitials: updated.avatarInitials,
      teamMemberId: updated.teamMemberId,
    });
  }

  // Create new portal user
  const name = (req.body as any)?.name || supabaseUser.email!.split("@")[0];
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const newUser = await storage.createUser({
    supabaseId: supabaseUser.id,
    email: supabaseUser.email!,
    name,
    role: "client", // new users default to client
    avatarInitials: initials,
    teamMemberId: null,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    avatarInitials: newUser.avatarInitials,
    teamMemberId: newUser.teamMemberId,
  });
}
