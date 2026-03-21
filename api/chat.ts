import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, setCorsHeaders } from "./_auth.js";
import { getStorage } from "./_storage.js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { message, history } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message) return res.status(400).json({ error: "Message required" });

  const storage = getStorage();

  // Fetch current project state for context
  const [allTasks, allPhases, allTeam] = await Promise.all([
    storage.getTasks(),
    storage.getPhases(),
    storage.getTeamMembers(),
  ]);

  const projectContext = JSON.stringify({
    phases: allPhases.map(p => ({ id: p.id, name: p.name, status: p.status, startDate: p.startDate, dueDate: p.dueDate })),
    tasks: allTasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, assigneeId: t.assigneeId, phaseId: t.phaseId, hours: t.hours, cost: t.cost })),
    team: allTeam.map(m => ({ id: m.id, name: m.name, role: m.role })),
  });

  const systemPrompt = `You are the MFTS Portal AI assistant for the Massachusetts Farm to School website redesign project managed by Agency 6.

CURRENT PROJECT DATA:
${projectContext}

You can help users by:
1. Answering questions about project status, tasks, timelines, and budget
2. Updating tasks — change status, due dates, priority, assignee
3. Updating phases — change status, start/due dates

When the user asks to update something, respond with a JSON action block that the frontend will execute. Use this exact format:

\`\`\`action
{"type": "update_task", "id": <task_id>, "updates": {"status": "in_progress", "dueDate": "2026-04-15", "priority": "high", "assigneeId": 2}}
\`\`\`

or for phases:

\`\`\`action
{"type": "update_phase", "id": <phase_id>, "updates": {"status": "in_progress", "startDate": "2026-03-01", "dueDate": "2026-04-15"}}
\`\`\`

Rules:
- Valid task statuses: todo, in_progress, in_review, completed
- Valid phase statuses: not_started, in_progress, completed
- Valid priorities: low, medium, high, urgent
- Dates must be in YYYY-MM-DD format
- Always confirm what you're doing in natural language BEFORE the action block
- Only include fields that need changing in the updates object
- If the user is vague, ask for clarification
- You can include multiple action blocks in one response if needed
- Current user: ${user.name} (${user.role})`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...(history || []),
    { role: "user", content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    return res.json({ reply: text });
  } catch (err: any) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "AI service error", details: err.message });
  }
}
