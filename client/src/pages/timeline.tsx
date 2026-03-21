import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { Phase, Task, TeamMember } from "@shared/schema";

function TaskStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500",
    in_progress: "bg-blue-500",
    in_review: "bg-amber-500",
    todo: "bg-zinc-300 dark:bg-zinc-600",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || colors.todo}`} />;
}

function InlineDatePicker({ 
  value, 
  onChange 
}: { 
  value: string | null; 
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors group">
          {date ? format(date, "MMM d") : "No date"}
          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}`);
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function InlineEditText({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`h-6 text-xs py-0 px-1 ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`text-left truncate group inline-flex items-center gap-1 hover:text-primary transition-colors ${className}`}
    >
      <span className="truncate">{value}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </button>
  );
}

// Compute the Gantt date range dynamically from actual phase data
function useDateRange(phases: Phase[] | undefined) {
  return useMemo(() => {
    if (!phases || phases.length === 0) {
      // Fallback
      return {
        projectStart: new Date("2026-02-09"),
        projectEnd: new Date("2026-08-10"),
        totalDays: 182,
        months: [] as { name: string; year: number }[],
      };
    }

    // Find earliest start and latest end from all phases
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const p of phases) {
      if (p.startDate) {
        const d = new Date(p.startDate + 'T00:00:00');
        if (!earliest || d < earliest) earliest = d;
      }
      if (p.dueDate) {
        const d = new Date(p.dueDate + 'T00:00:00');
        if (!latest || d > latest) latest = d;
      }
    }

    // Default fallbacks
    const projectStart = earliest || new Date("2026-02-09");
    const projectEnd = latest || new Date("2026-08-10");

    // Pad start to 1st of the month, pad end to end of month
    const padStart = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);
    const padEnd = new Date(projectEnd.getFullYear(), projectEnd.getMonth() + 1, 0);

    const totalDays = Math.max(1, Math.ceil((padEnd.getTime() - padStart.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate month labels
    const months: { name: string; year: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let cursor = new Date(padStart);
    while (cursor <= padEnd) {
      months.push({ name: monthNames[cursor.getMonth()], year: cursor.getFullYear() });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return { projectStart: padStart, projectEnd: padEnd, totalDays, months };
  }, [phases]);
}

function getBarPosition(startDate: string | null, endDate: string | null, projectStart: Date, totalDays: number) {
  if (!startDate || !endDate) return { left: 0, width: 0 };
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dayFromStart = Math.max(0, Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return {
    left: (dayFromStart / totalDays) * 100,
    width: Math.max(2, (duration / totalDays) * 100),
  };
}

function getTodayPosition(projectStart: Date, totalDays: number) {
  const today = new Date();
  const dayFromStart = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(100, Math.max(0, (dayFromStart / totalDays) * 100));
}

export default function Timeline() {
  const { data: phases, isLoading: phasesLoading } = useQuery<Phase[]>({ queryKey: ["/api/phases"] });
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: team } = useQuery<TeamMember[]>({ queryKey: ["/api/team"] });
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const isLoading = phasesLoading || tasksLoading;
  const { projectStart, projectEnd, totalDays, months } = useDateRange(phases);
  const todayPct = getTodayPosition(projectStart, totalDays);
  const authErrorMsg = "Sign in at Team Login to make changes";

  const updatePhase = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      if (!isAuthenticated) throw new Error(authErrorMsg);
      await apiRequest("PATCH", `/api/phases/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Phase updated" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      if (!isAuthenticated) throw new Error(authErrorMsg);
      await apiRequest("PATCH", `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500",
    in_progress: "bg-blue-500",
    not_started: "bg-zinc-300 dark:bg-zinc-600",
  };

  // Compute dynamic totals from live data
  const totalCostAll = tasks?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0;
  const totalHoursAll = tasks?.reduce((sum, t) => sum + (t.hours || 0), 0) || 0;
  const totalWeeks = Math.max(1, Math.round(totalDays / 7));
  const hourlyRate = totalHoursAll > 0 ? Math.round(totalCostAll / totalHoursAll) : 100;

  // Dynamic project date range label
  const projectStartLabel = phases?.length
    ? (() => {
        const dates = phases.filter(p => p.startDate).map(p => new Date(p.startDate! + 'T00:00:00'));
        return dates.length > 0 ? format(new Date(Math.min(...dates.map(d => d.getTime()))), "MMM d, yyyy") : "TBD";
      })()
    : "TBD";
  const projectEndLabel = phases?.length
    ? (() => {
        const dates = phases.filter(p => p.dueDate).map(p => new Date(p.dueDate! + 'T00:00:00'));
        return dates.length > 0 ? format(new Date(Math.max(...dates.map(d => d.getTime()))), "MMM d, yyyy") : "TBD";
      })()
    : "TBD";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Project Timeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          MFTS Website Redesign — {projectStartLabel} to {projectEndLabel} ({totalWeeks} weeks)
        </p>
      </div>

      {/* Phase summary cards — fully editable */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {isLoading ? (
          [1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          phases?.map(phase => {
            const phaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
            const done = phaseTasks.filter(t => t.status === "completed").length;
            return (
              <Card key={phase.id} className="border border-card-border" data-testid={`timeline-phase-${phase.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[phase.status] || statusColors.not_started}`} />
                    <InlineEditText
                      value={phase.name}
                      onSave={(name) => updatePhase.mutate({ id: phase.id, name })}
                      className="text-xs font-semibold text-foreground flex-1"
                    />
                  </div>

                  {/* Editable status */}
                  <Select 
                    value={phase.status} 
                    onValueChange={(v) => updatePhase.mutate({ id: phase.id, status: v })}
                  >
                    <SelectTrigger className="h-6 text-[11px] border-dashed" data-testid={`select-phase-status-${phase.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Editable dates */}
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <InlineDatePicker 
                      value={phase.startDate} 
                      onChange={(d) => updatePhase.mutate({ id: phase.id, startDate: d })}
                    />
                    <span>–</span>
                    <InlineDatePicker 
                      value={phase.dueDate} 
                      onChange={(d) => updatePhase.mutate({ id: phase.id, dueDate: d })}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">{done}/{phaseTasks.length} tasks</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Gantt-style Chart — dynamic date range */}
      {!isLoading && (
        <Card className="border border-card-border overflow-hidden">
          <CardContent className="p-0">
            {/* Month headers */}
            <div className="flex border-b border-border relative">
              <div className="w-56 shrink-0 px-4 py-2 border-r border-border">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Phase / Task</span>
              </div>
              <div className="flex-1 flex relative">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 px-2 py-2 border-r border-border last:border-r-0 text-center">
                    <span className="text-[11px] font-medium text-muted-foreground">{m.name} {m.year}</span>
                  </div>
                ))}
                {/* Today marker */}
                {todayPct > 0 && todayPct < 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary z-10"
                    style={{ left: `${todayPct}%` }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-b">
                      Today
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phase rows */}
            {phases?.map((phase) => {
              const phaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
              const bar = getBarPosition(phase.startDate, phase.dueDate, projectStart, totalDays);

              return (
                <div key={phase.id}>
                  {/* Phase bar */}
                  <div className="flex border-b border-border hover:bg-muted/20 transition-colors" data-testid={`gantt-phase-${phase.id}`}>
                    <div className="w-56 shrink-0 px-4 py-2.5 border-r border-border flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[phase.status] || statusColors.not_started}`} />
                      <InlineEditText
                        value={phase.name}
                        onSave={(name) => updatePhase.mutate({ id: phase.id, name })}
                        className="text-xs font-semibold text-foreground"
                      />
                    </div>
                    <div className="flex-1 relative py-2.5 px-1">
                      <div
                        className={`absolute h-5 rounded-full top-1/2 -translate-y-1/2 ${statusColors[phase.status] || statusColors.not_started} opacity-30`}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                      />
                      <div
                        className={`absolute h-5 rounded-full top-1/2 -translate-y-1/2 ${statusColors[phase.status] || statusColors.not_started} opacity-80`}
                        style={{ 
                          left: `${bar.left}%`, 
                          width: phase.status === "completed" ? `${bar.width}%` : phase.status === "in_progress" ? `${bar.width * 0.5}%` : "0%"
                        }}
                      />
                    </div>
                  </div>

                  {/* Task rows with editable due dates */}
                  {phaseTasks.map((task) => {
                    const phaseStart = phase.startDate || format(projectStart, "yyyy-MM-dd");
                    const taskBar = getBarPosition(phaseStart, task.dueDate, projectStart, totalDays);

                    return (
                      <div key={task.id} className="flex border-b border-border/50 hover:bg-muted/10 transition-colors group" data-testid={`gantt-task-${task.id}`}>
                        <div className="w-56 shrink-0 px-4 py-2 border-r border-border flex items-center gap-2 pl-8">
                          <TaskStatusDot status={task.status} />
                          <span className="text-[11px] text-foreground/80 truncate flex-1">{task.title}</span>
                          <InlineDatePicker 
                            value={task.dueDate} 
                            onChange={(d) => updateTask.mutate({ id: task.id, dueDate: d })}
                          />
                        </div>
                        <div className="flex-1 relative py-2 px-1">
                          <div
                            className={`absolute h-3 rounded-full top-1/2 -translate-y-1/2 ${
                              task.status === "completed" ? "bg-emerald-500/60" :
                              task.status === "in_progress" ? "bg-blue-500/40" :
                              "bg-zinc-300/40 dark:bg-zinc-600/40"
                            }`}
                            style={{ left: `${taskBar.left}%`, width: `${Math.max(1, taskBar.width)}%` }}
                          />
                          {task.dueDate && (
                            <div
                              className="absolute w-1.5 h-1.5 rounded-full bg-foreground/30 top-1/2 -translate-y-1/2"
                              style={{ left: `${taskBar.left + taskBar.width}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Budget breakdown — all computed from live data */}
      {!isLoading && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Budget Breakdown by Phase</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {phases?.map(phase => {
              const phaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
              const totalCost = phaseTasks.reduce((sum, t) => sum + (t.cost || 0), 0);
              const totalHours = phaseTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
              return (
                <Card key={phase.id} className="border border-card-border">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">{phase.name}</p>
                    <p className="text-lg font-bold text-foreground">${totalCost.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{totalHours} hours estimated</p>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${totalCostAll > 0 ? (totalCost / totalCostAll) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 px-1">
            <span className="text-sm font-semibold text-foreground">Total Project: ${totalCostAll.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">
              {totalHoursAll} hours · ${hourlyRate}/hr · {totalWeeks} weeks
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
