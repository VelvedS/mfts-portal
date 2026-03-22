import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { TeamMember } from "@shared/schema";

function generateInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MemberFormData {
  name: string;
  role: string;
  email: string;
  avatarInitials: string;
  isClient: boolean;
}

const emptyForm: MemberFormData = {
  name: "",
  role: "",
  email: "",
  avatarInitials: "",
  isClient: false,
};

function MemberDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}) {
  const isEdit = !!member;
  const [form, setForm] = useState<MemberFormData>(
    member
      ? {
          name: member.name,
          role: member.role,
          email: member.email || "",
          avatarInitials: member.avatarInitials,
          isClient: member.isClient,
        }
      : { ...emptyForm }
  );
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        role: form.role,
        email: form.email || null,
        avatarInitials: form.avatarInitials || generateInitials(form.name),
        isClient: form.isClient,
      };
      if (isEdit) {
        await apiRequest("PATCH", `/api/team/${member.id}`, payload);
      } else {
        await apiRequest("POST", "/api/team", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      onOpenChange(false);
      toast({ title: isEdit ? "Member updated" : "Member added" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      avatarInitials: generateInitials(name),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add Member"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim() || !form.role.trim()) return;
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Designer, Developer, Client Contact"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initials">Avatar Initials</Label>
            <Input
              id="initials"
              value={form.avatarInitials}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  avatarInitials: e.target.value.toUpperCase().slice(0, 2),
                }))
              }
              placeholder="Auto-generated from name"
              maxLength={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isClient"
              checked={form.isClient}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isClient: checked === true }))
              }
            />
            <Label htmlFor="isClient" className="text-sm font-normal">
              Is Client
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {isEdit ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamManagement() {
  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
  });
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const canManage =
    isAuthenticated && (user?.role === "admin" || user?.role === "team");

  const reorderMembers = useMutation({
    mutationFn: async (order: number[]) => {
      await apiRequest("POST", "/api/team/reorder", { order });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to reorder", description: err.message, variant: "destructive" });
    },
  });

  const moveItem = (index: number, direction: "up" | "down") => {
    if (!members) return;
    const newOrder = [...members];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    reorderMembers.mutate(newOrder.map(m => m.id));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setDeleteTarget(null);
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const openAdd = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members and client contacts
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && <TableHead className="w-[60px]"></TableHead>}
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                {canManage && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members && members.length > 0 ? (
                members.map((member, index) => (
                  <TableRow key={member.id}>
                    {canManage && (
                      <TableCell className="py-3 px-2 w-[60px]">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={index === 0 || reorderMembers.isPending}
                            onClick={() => moveItem(index, "up")}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={index === members.length - 1 || reorderMembers.isPending}
                            onClick={() => moveItem(index, "down")}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                            member.isClient
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {member.avatarInitials}
                        </div>
                        <span className="text-sm font-medium">
                          {member.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.role}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.email || "—"}
                    </TableCell>
                    <TableCell>
                      {member.isClient ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                          Client
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                          Team
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(member)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(member)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 6 : 4}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No team members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <MemberDialog
          key={editingMember?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={editingMember}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <Dialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
