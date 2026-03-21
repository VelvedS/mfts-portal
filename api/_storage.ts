import { eq, asc } from "drizzle-orm";
import { getDb } from "./_db.js";
import {
  users, teamMembers, phases, tasks, comments,
  type User, type InsertUser,
  type TeamMember, type InsertTeamMember,
  type Phase, type InsertPhase,
  type Task, type InsertTask,
  type Comment, type InsertComment,
} from "../shared/schema.js";

// Serverless storage — creates a fresh db handle per invocation
export class Storage {
  private db = getDb();

  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await this.db.insert(users).values(user).returning();
    return created;
  }

  // Team Members
  async getTeamMembers(): Promise<TeamMember[]> {
    return this.db.select().from(teamMembers).orderBy(asc(teamMembers.sortOrder));
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await this.db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await this.db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const [updated] = await this.db.update(teamMembers).set(updates).where(eq(teamMembers.id, id)).returning();
    return updated;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await this.db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return result.length > 0;
  }

  // Phases
  async getPhases(): Promise<Phase[]> {
    return this.db.select().from(phases).orderBy(asc(phases.sortOrder));
  }

  async getPhase(id: number): Promise<Phase | undefined> {
    const [phase] = await this.db.select().from(phases).where(eq(phases.id, id));
    return phase;
  }

  async createPhase(phase: InsertPhase): Promise<Phase> {
    const [created] = await this.db.insert(phases).values(phase).returning();
    return created;
  }

  async updatePhase(id: number, updates: Partial<InsertPhase>): Promise<Phase | undefined> {
    const [updated] = await this.db.update(phases).set(updates).where(eq(phases.id, id)).returning();
    return updated;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return this.db.select().from(tasks).orderBy(asc(tasks.sortOrder));
  }

  async getTasksByPhase(phaseId: number): Promise<Task[]> {
    return this.db.select().from(tasks).where(eq(tasks.phaseId, phaseId)).orderBy(asc(tasks.sortOrder));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await this.db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await this.db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await this.db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Comments
  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    return this.db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await this.db.insert(comments).values(comment).returning();
    return created;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await this.db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }
}

export function getStorage() {
  return new Storage();
}
