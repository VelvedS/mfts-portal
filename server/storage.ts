import { eq, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, teamMembers, phases, tasks, comments,
  type User, type InsertUser,
  type TeamMember, type InsertTeamMember,
  type Phase, type InsertPhase,
  type Task, type InsertTask,
  type Comment, type InsertComment,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;

  // Phases
  getPhases(): Promise<Phase[]>;
  getPhase(id: number): Promise<Phase | undefined>;
  createPhase(phase: InsertPhase): Promise<Phase>;
  updatePhase(id: number, phase: Partial<InsertPhase>): Promise<Phase | undefined>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByPhase(phaseId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Comments
  getCommentsByTask(taskId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
}

export class PgStorage implements IStorage {
  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  // Team Members
  async getTeamMembers(): Promise<TeamMember[]> {
    return db.select().from(teamMembers);
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  // Phases
  async getPhases(): Promise<Phase[]> {
    return db.select().from(phases).orderBy(asc(phases.sortOrder));
  }

  async getPhase(id: number): Promise<Phase | undefined> {
    const [phase] = await db.select().from(phases).where(eq(phases.id, id));
    return phase;
  }

  async createPhase(phase: InsertPhase): Promise<Phase> {
    const [created] = await db.insert(phases).values(phase).returning();
    return created;
  }

  async updatePhase(id: number, updates: Partial<InsertPhase>): Promise<Phase | undefined> {
    const [updated] = await db.update(phases).set(updates).where(eq(phases.id, id)).returning();
    return updated;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(asc(tasks.sortOrder));
  }

  async getTasksByPhase(phaseId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.phaseId, phaseId)).orderBy(asc(tasks.sortOrder));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Comments
  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new PgStorage();
