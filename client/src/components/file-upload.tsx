import { useState, useRef } from "react";
import { Upload, FileText, Image, FileSpreadsheet, File as FileIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";

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

interface FileUploadProps {
  taskId: number;
  files: ProjectFile[];
  teamMembers: { id: number; name: string; avatarInitials: string }[];
  supabaseUrl: string;
}

export default function FileUpload({ taskId, files, teamMembers, supabaseUrl }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const getMemberName = (id: number) => teamMembers.find(m => m.id === id)?.name || "Unknown";

  const getPublicUrl = (storagePath: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-files/${storagePath}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");

      for (const file of Array.from(selectedFiles)) {
        const path = `tasks/${taskId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(path, file);

        if (uploadError) throw uploadError;

        await apiRequest("POST", "/api/files", {
          taskId,
          name: file.name,
          storagePath: path,
          size: file.size,
          mimeType: file.type,
          uploadedBy: user?.teamMemberId || user?.id || 0,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ title: `${selectedFiles.length} file(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteFile = useMutation({
    mutationFn: async (file: ProjectFile) => {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.storage.from("project-files").remove([file.storagePath]);
      }
      await apiRequest("DELETE", `/api/files?id=${file.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ title: "File deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Files {files.length > 0 && `(${files.length})`}
        </p>
        {isAuthenticated && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}
      </div>
      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((file) => {
            const IconComponent = getFileIcon(file.mimeType);
            return (
              <div key={file.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 group">
                <IconComponent className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={getPublicUrl(file.storagePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {file.name}
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(file.size)} · {getMemberName(file.uploadedBy)} · {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                    onClick={() => deleteFile.mutate(file)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
      )}
    </div>
  );
}
