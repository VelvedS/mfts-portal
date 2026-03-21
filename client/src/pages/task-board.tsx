import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Send,
  X,
  Filter,
  CalendarIcon,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { Phase, Task, TeamMember, Comment } from "@shared/schema";

function LinkifyText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return (
    <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-blue-500",
    low: "bg-zinc-400",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[priority] || colors.medium}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    todo: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    not_started: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  };
  const labels: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    in_review: "In Review",
    todo: "To Do",
    not_started: "Not Started",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  );
}

function DatePickerField({ 
  value, 
  onChange, 
  label 
}: { 
  value: string | null; 
  onChange: (date: string | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 text-xs w-full justify-start gap-2 font-normal"
            data-testid={`button-edit-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            {date ? format(date, "MMM d, yyyy") : "Set date"}
          </Button>
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
              } else {
                onChange(null);
              }
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TaskDetailPanel({ 
  task, 
  team, 
  onClose, 
  onUpdated 
}: { 
  task: Task; 
  team: TeamMember[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || "");
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated } = useAuth();

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/tasks", task.id, "comments"],
  });

  const clientMembers = team.filter(m => m.isClient);
  const authErrorMsg = "Sign in at Team Login to make changes";

  const addComment = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      const body: any = { ...data, createdAt: new Date().toISOString() };
      if (!isAuthenticated) {
        if (!selectedClientId) throw new Error("Please select your name before commenting");
        body.authorId = selectedClientId;
        // Direct fetch without auth header for client comments
        const res = await fetch(`/api/tasks/${task.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || "Failed to post comment");
        }
      } else {
        await apiRequest("POST", `/api/tasks/${task.id}/comments`, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "comments"] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!isAuthenticated) throw new Error(authErrorMsg);
      await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onUpdated();
      toast({ title: "Task updated" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const assignee = team.find(m => m.id === task.assigneeId);
  const getMember = (id: number) => team.find(m => m.id === id);

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ title: trimmed });
    }
    setEditingTitle(false);
  };

  const saveDesc = () => {
    const trimmed = descDraft.trim();
    if (trimmed !== (task.description || "")) {
      updateTask.mutate({ description: trimmed || null });
    }
    setEditingDesc(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <Input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                  className="text-base font-semibold h-auto py-1 px-2 -ml-2"
                  data-testid="input-task-title"
                />
              ) : (
                <DialogTitle
                  className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors group flex items-center gap-1.5"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </DialogTitle>
              )}
              {editingDesc ? (
                <Textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={saveDesc}
                  placeholder="Add a description..."
                  className="text-xs mt-1.5 min-h-[60px] resize-none -ml-2 px-2"
                  data-testid="input-task-description"
                />
              ) : (
                <p
                  className="text-xs text-muted-foreground mt-1.5 leading-relaxed cursor-pointer hover:text-foreground transition-colors group flex items-center gap-1"
                  onClick={() => setEditingDesc(true)}
                >
                  {task.description || "Add a description..."}
                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            {/* Editable fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                <Select value={task.status} onValueChange={(v) => updateTask.mutate({ status: v })}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Priority</p>
                <Select value={task.priority} onValueChange={(v) => updateTask.mutate({ priority: v })}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Assignee</p>
                <Select 
                  value={task.assigneeId ? String(task.assigneeId) : "unassigned"} 
                  onValueChange={(v) => updateTask.mutate({ assigneeId: v === "unassigned" ? null : parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {team.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <DatePickerField
                value={task.dueDate}
                onChange={(date) => updateTask.mutate({ dueDate: date })}
                label="Due Date"
              />

              {/* Hours */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Est. Hours</p>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  defaultValue={task.hours ?? ""}
                  onBlur={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    if (val !== task.hours) updateTask.mutate({ hours: val });
                  }}
                  data-testid="input-hours"
                />
              </div>

              {/* Cost */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cost ($)</p>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  defaultValue={task.cost ?? ""}
                  onBlur={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    if (val !== task.cost) updateTask.mutate({ cost: val });
                  }}
                  data-testid="input-cost"
                />
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Comments {comments && `(${comments.length})`}
              </p>
              {commentsLoading ? (
                <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const topLevel = comments.filter(c => !c.parentId);
                    const replies = comments.filter(c => c.parentId);
                    const getReplies = (parentId: number) => replies.filter(r => r.parentId === parentId);

                    return topLevel.map((comment) => {
                      const author = getMember(comment.authorId);
                      const time = new Date(comment.createdAt);
                      const commentReplies = getReplies(comment.id);

                      return (
                        <div key={comment.id} className="space-y-2">
                          {/* Parent comment */}
                          <div className="flex gap-3" data-testid={`comment-${comment.id}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5 ${
                              author?.isClient
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-primary/10 text-primary'
                            }`}>
                              {author?.avatarInitials || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{author?.name || "Unknown"}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                                  {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                              <LinkifyText text={comment.content} />
                              {(isAuthenticated || selectedClientId) && (
                                <button
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  className="text-[11px] text-muted-foreground hover:text-foreground mt-1 transition-colors"
                                >
                                  Reply
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Replies */}
                          {commentReplies.length > 0 && (
                            <div className="ml-10 space-y-2 border-l-2 border-border pl-3">
                              {commentReplies.map((reply) => {
                                const replyAuthor = getMember(reply.authorId);
                                const replyTime = new Date(reply.createdAt);
                                return (
                                  <div key={reply.id} className="flex gap-2.5" data-testid={`comment-${reply.id}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0 mt-0.5 ${
                                      replyAuthor?.isClient
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-primary/10 text-primary'
                                    }`}>
                                      {replyAuthor?.avatarInitials || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{replyAuthor?.name || "Unknown"}</span>
                                        <span className="text-[11px] text-muted-foreground">
                                          {replyTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                                          {replyTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <LinkifyText text={reply.content} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Inline reply box */}
                          {replyingTo === comment.id && (
                            <div className="ml-10 pl-3 flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold shrink-0 mt-1">
                                {currentUser?.avatarInitials || "?"}
                              </div>
                              <div className="flex-1 space-y-2">
                                <Textarea
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[56px] text-sm resize-none"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (replyText.trim()) {
                                        addComment.mutate({ content: replyText.trim(), parentId: comment.id });
                                        setReplyingTo(null);
                                        setReplyText("");
                                      }
                                    }}
                                    disabled={!replyText.trim() || addComment.isPending}
                                    className="gap-1.5"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}

              {/* Add comment */}
              <div className="mt-4 space-y-3">
                {/* Client identity selector — only for non-authenticated users */}
                {!isAuthenticated && clientMembers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Commenting as:</span>
                    <Select
                      value={selectedClientId?.toString() || ""}
                      onValueChange={(val) => setSelectedClientId(parseInt(val))}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Select your name" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-1 ${
                    !isAuthenticated ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {isAuthenticated
                      ? (currentUser?.avatarInitials || "?")
                      : (clientMembers.find(m => m.id === selectedClientId)?.avatarInitials || "?")
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder={isAuthenticated ? "Leave a comment..." : (selectedClientId ? "Leave a comment..." : "Select your name above to comment...")}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[72px] text-sm resize-none"
                      disabled={!isAuthenticated && !selectedClientId}
                      data-testid="input-comment"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => newComment.trim() && addComment.mutate({ content: newComment.trim() })}
                        disabled={!newComment.trim() || addComment.isPending || (!isAuthenticated && !selectedClientId)}
                        className="gap-1.5"
                        data-testid="button-submit-comment"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function TaskBoard() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1,2,3,4,5]));
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: phases, isLoading: phasesLoading } = useQuery<Phase[]>({ queryKey: ["/api/phases"] });
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: team } = useQuery<TeamMember[]>({ queryKey: ["/api/team"] });

  const isLoading = phasesLoading || tasksLoading;

  const togglePhase = (id: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getAssignee = (id: number | null) => team?.find(m => m.id === id);

  const filteredTasks = (phaseId: number) => {
    let phaseTasks = tasks?.filter(t => t.phaseId === phaseId) || [];
    if (statusFilter !== "all") {
      phaseTasks = phaseTasks.filter(t => t.status === statusFilter);
    }
    return phaseTasks;
  };

  // Re-fetch the selected task when tasks data changes
  const activeTask = selectedTask 
    ? tasks?.find(t => t.id === selectedTask.id) || selectedTask 
    : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Task Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All project tasks organized by phase</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs" data-testid="select-filter">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task list by phase */}
      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {phases?.map((phase) => {
            const phaseTasks = filteredTasks(phase.id);
            const allPhaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
            const done = allPhaseTasks.filter(t => t.status === "completed").length;
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <div key={phase.id} className="rounded-xl border border-border overflow-hidden" data-testid={`phase-group-${phase.id}`}>
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                  data-testid={`button-toggle-phase-${phase.id}`}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-semibold text-foreground">{phase.name}</span>
                  <StatusBadge status={phase.status} />
                  <span className="ml-auto text-xs text-muted-foreground">{done}/{allPhaseTasks.length} completed</span>
                </button>

                {/* Tasks */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {phaseTasks.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No tasks match the current filter.
                      </div>
                    ) : (
                      phaseTasks.map((task) => {
                        const assignee = getAssignee(task.assigneeId);
                        const due = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
                        const isOverdue = due && due < new Date() && task.status !== "completed";

                        return (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                            data-testid={`task-row-${task.id}`}
                          >
                            <PriorityDot priority={task.priority} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {assignee && (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                                  assignee.isClient 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                  {assignee.avatarInitials}
                                </div>
                              )}
                              <StatusBadge status={task.status} />
                              {task.hours != null && (
                                <span className="text-[11px] text-muted-foreground w-8 text-right">{task.hours}h</span>
                              )}
                              {due && (
                                <span className={`text-[11px] w-16 text-right ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                  {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {activeTask && team && (
        <TaskDetailPanel
          key={activeTask.id + '-' + activeTask.status + '-' + activeTask.dueDate + '-' + activeTask.priority + '-' + activeTask.assigneeId}
          task={activeTask}
          team={team}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}
