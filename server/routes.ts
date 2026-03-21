import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertCommentSchema, insertPhaseSchema } from "@shared/schema";

export async function registerRoutes(server: Server, app: Express) {
  // Team Members
  app.get("/api/team", async (_req, res) => {
    const members = await storage.getTeamMembers();
    res.json(members);
  });

  // Phases
  app.get("/api/phases", async (_req, res) => {
    const phases = await storage.getPhases();
    res.json(phases);
  });

  app.patch("/api/phases/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updatePhase(id, req.body);
    if (!updated) return res.status(404).json({ error: "Phase not found" });
    res.json(updated);
  });

  // Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateTask(id, req.body);
    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteTask(id);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.status(204).send();
  });

  // Comments
  app.get("/api/tasks/:taskId/comments", async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const comments = await storage.getCommentsByTask(taskId);
    res.json(comments);
  });

  app.post("/api/tasks/:taskId/comments", async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const parsed = insertCommentSchema.safeParse({
      ...req.body,
      taskId,
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const comment = await storage.createComment(parsed.data);
    res.status(201).json(comment);
  });

  // Dashboard stats
  app.get("/api/stats", async (_req, res) => {
    const tasks = await storage.getTasks();
    const phases = await storage.getPhases();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
    const totalHours = tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
    const completedHours = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.hours || 0), 0);
    const totalBudget = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    const spentBudget = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.cost || 0), 0);
    const completedPhases = phases.filter(p => p.status === "completed").length;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks: totalTasks - completedTasks - inProgressTasks,
      totalHours,
      completedHours,
      totalBudget,
      spentBudget,
      totalPhases: phases.length,
      completedPhases,
      progressPercent: Math.round((completedTasks / totalTasks) * 100),
    });
  });
}
