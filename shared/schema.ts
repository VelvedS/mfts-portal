import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users — linked to Supabase Auth via supabaseId
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: text("supabase_id").unique(), // UUID from Supabase Auth
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("client"), // admin, team, client
  avatarInitials: text("avatar_initials").notNull(),
  teamMemberId: integer("team_member_id"), // links to team_members if applicable
  createdAt: text("created_at").notNull(),
});

// Team members (agency staff + client contacts)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  avatarInitials: text("avatar_initials").notNull(),
  isClient: boolean("is_client").notNull().default(false),
});

// Project phases / milestones
export const phases = pgTable("phases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("not_started"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Tasks within phases
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  dueDate: text("due_date"),
  assigneeId: integer("assignee_id"),
  hours: integer("hours"),
  cost: integer("cost"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// Comments on tasks (collaborative)
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true });
export const insertPhaseSchema = createInsertSchema(phases).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type User = typeof users.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Comment = typeof comments.$inferSelect;
