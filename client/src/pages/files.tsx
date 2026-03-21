import { useQuery } from "@tanstack/react-query";
import { FileText, Image, FileSpreadsheet, File as FileIcon, Download, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { Phase, Task, TeamMember } from "@shared/schema";

interface ProjectFile {
  id: number;
  taskId: number;
  name: string;
  storagePath: string;
  size: number;
  mimeType: string | null;
  uploadedBy: number;
  createdAt: string;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return FileIcon;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function FilesPage() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";

  const { data: files, isLoading: filesLoading } = useQuery<ProjectFile[]>({ queryKey: ["/api/files"] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: phases } = useQuery<Phase[]>({ queryKey: ["/api/phases"] });
  const { data: team } = useQuery<TeamMember[]>({ queryKey: ["/api/team"] });

  const getTask = (id: number) => tasks?.find(t => t.id === id);
  const getPhase = (id: number) => phases?.find(p => p.id === id);
  const getMember = (id: number) => team?.find(m => m.id === id);
  const getPublicUrl = (storagePath: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-files/${storagePath}`;

  const filteredFiles = files?.filter(file => {
    const matchesSearch = !search || file.name.toLowerCase().includes(search.toLowerCase());
    if (phaseFilter === "all") return matchesSearch;
    const task = getTask(file.taskId);
    return matchesSearch && task?.phaseId === parseInt(phaseFilter);
  }) || [];

  const totalSize = filteredFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Project Files</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} · {formatFileSize(totalSize)} total
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {phases?.map(phase => (
              <SelectItem key={phase.id} value={phase.id.toString()}>{phase.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filesLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filteredFiles.length > 0 ? (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {filteredFiles.map(file => {
              const IconComponent = getFileIcon(file.mimeType);
              const task = getTask(file.taskId);
              const phase = task ? getPhase(task.phaseId) : null;
              const uploader = getMember(file.uploadedBy);
              return (
                <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={getPublicUrl(file.storagePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary truncate block"
                    >
                      {file.name}
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{uploader?.name || "Unknown"}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {phase && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {phase.name}
                      </Badge>
                    )}
                    {task && (
                      <span className="text-[11px] text-muted-foreground max-w-[150px] truncate">{task.title}</span>
                    )}
                    <a
                      href={getPublicUrl(file.storagePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <FileIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No files yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload files from any task detail view</p>
        </div>
      )}
    </div>
  );
}
