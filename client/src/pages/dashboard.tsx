import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  DollarSign, 
  Timer,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Phase, Task, TeamMember } from "@shared/schema";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="border border-card-border" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    todo: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    not_started: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  };
  const labels: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    in_review: "In Review",
    todo: "To Do",
    not_started: "Not Started",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/stats"] });
  const { data: phases, isLoading: phasesLoading } = useQuery<Phase[]>({ queryKey: ["/api/phases"] });
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: team } = useQuery<TeamMember[]>({ queryKey: ["/api/team"] });

  const isLoading = statsLoading || phasesLoading || tasksLoading;

  const recentTasks = tasks?.filter(t => t.status !== "completed").slice(0, 6) || [];
  const upcomingTasks = tasks
    ?.filter(t => t.dueDate && t.status !== "completed")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5) || [];

  const getTeamMember = (id: number | null) => team?.find(m => m.id === id);

  // Dynamic project date range from phase data
  const { projectStartLabel, projectEndLabel, projectStatus, projectStatusLabel, projectStatusColor } = useMemo(() => {
    if (!phases || phases.length === 0) {
      return { projectStartLabel: "TBD", projectEndLabel: "TBD", projectStatus: "not_started", projectStatusLabel: "Not Started", projectStatusColor: "bg-zinc-500" };
    }
    const startDates = phases.filter(p => p.startDate).map(p => new Date(p.startDate! + 'T00:00:00'));
    const endDates = phases.filter(p => p.dueDate).map(p => new Date(p.dueDate! + 'T00:00:00'));
    const start = startDates.length > 0 ? format(new Date(Math.min(...startDates.map(d => d.getTime()))), "MMM d, yyyy") : "TBD";
    const end = endDates.length > 0 ? format(new Date(Math.max(...endDates.map(d => d.getTime()))), "MMM d, yyyy") : "TBD";

    const allCompleted = phases.every(p => p.status === "completed");
    const anyInProgress = phases.some(p => p.status === "in_progress");
    let status = "not_started";
    let label = "Not Started";
    let color = "bg-zinc-500";
    if (allCompleted) { status = "completed"; label = "Completed"; color = "bg-emerald-500"; }
    else if (anyInProgress) { status = "in_progress"; label = "In Progress"; color = "bg-blue-500"; }

    return { projectStartLabel: start, projectEndLabel: end, projectStatus: status, projectStatusLabel: label, projectStatusColor: color };
  }, [phases]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header — dynamic dates from phase data */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">MFTS Website Redesign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Massachusetts Farm to School — {projectStartLabel} – {projectEndLabel}
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5">
          <span className={`w-1.5 h-1.5 rounded-full ${projectStatusColor} ${projectStatus === 'in_progress' ? 'animate-pulse' : ''}`} />
          {projectStatusLabel}
        </Badge>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Progress"
            value={`${stats?.progressPercent || 0}%`}
            sub={`${stats?.completedTasks}/${stats?.totalTasks} tasks done`}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={ListTodo}
            label="Active Tasks"
            value={String(stats?.inProgressTasks || 0)}
            sub={`${stats?.todoTasks} remaining`}
            color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={Timer}
            label="Hours Logged"
            value={`${stats?.completedHours || 0}h`}
            sub={`of ${stats?.totalHours}h estimated`}
            color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={DollarSign}
            label="Budget"
            value={`$${((stats?.spentBudget || 0) / 1000).toFixed(1)}k`}
            sub={`of $${((stats?.totalBudget || 0) / 1000).toFixed(1)}k total`}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      )}

      {/* Overall Progress Bar */}
      {!isLoading && (
        <Card className="border border-card-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Overall Progress</p>
              <p className="text-sm font-semibold text-primary">{stats?.progressPercent || 0}%</p>
            </div>
            <Progress value={stats?.progressPercent || 0} className="h-2" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">{stats?.completedPhases}/{stats?.totalPhases} phases completed</p>
              <p className="text-xs text-muted-foreground">Launch: {projectEndLabel}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Phases */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Project Phases</h2>
            <Link href="/timeline" className="text-xs text-primary hover:underline flex items-center gap-0.5" data-testid="link-timeline">
              View Timeline <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {phasesLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {phases?.map((phase) => {
                const phaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
                const done = phaseTasks.filter(t => t.status === "completed").length;
                const total = phaseTasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <Card key={phase.id} className="border border-card-border" data-testid={`phase-${phase.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold text-foreground">{phase.name}</h3>
                          <StatusBadge status={phase.status} />
                        </div>
                        <span className="text-xs text-muted-foreground">{done}/{total} tasks</span>
                      </div>
                      <Progress value={pct} className="h-1.5 mb-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {phase.startDate && new Date(phase.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {phase.dueDate && ` – ${new Date(phase.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </span>
                        <span className="text-xs font-medium text-primary">{pct}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Upcoming Deadlines</h2>
              <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5" data-testid="link-tasks">
                All Tasks <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingTasks.map((task) => {
                const assignee = getTeamMember(task.assigneeId);
                const due = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
                const isOverdue = due && due < new Date();
                return (
                  <Card key={task.id} className="border border-card-border" data-testid={`upcoming-task-${task.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={task.status} />
                            {assignee && (
                              <span className="text-[11px] text-muted-foreground">{assignee.name}</span>
                            )}
                          </div>
                        </div>
                        {due && (
                          <span className={`text-[11px] font-medium whitespace-nowrap ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Team */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Project Team</h2>
            <Card className="border border-card-border">
              <CardContent className="p-0 divide-y divide-border">
                {team?.map((member) => {
                  const memberTasks = tasks?.filter(t => t.assigneeId === member.id) || [];
                  const done = memberTasks.filter(t => t.status === "completed").length;
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3" data-testid={`team-member-${member.id}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        member.isClient 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {member.avatarInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.role}</p>
                      </div>
                      {!member.isClient && (
                        <span className="text-[11px] text-muted-foreground">{done}/{memberTasks.length}</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
