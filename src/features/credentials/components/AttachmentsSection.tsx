import { useEffect, useState } from "react";
import { Paperclip, Upload, Download, Trash2, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { attachmentService } from "@/services/attachmentService";
import type { Attachment } from "@/types/attachment";

interface AttachmentsSectionProps {
  credentialId: string;
}

export function AttachmentsSection({ credentialId }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    attachmentService
      .list(credentialId)
      .then((res) => {
        if (!cancelled) setAttachments(res);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [credentialId]);

  async function handleUpload() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({ multiple: false });
      if (typeof path !== "string") return;

      setIsUploading(true);
      setError("");
      const created = await attachmentService.upload(credentialId, path);
      setAttachments((prev) => [created, ...prev]);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(att: Attachment) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const target = await save({ defaultPath: att.filename });
      if (!target) return;
      await attachmentService.download(att.id, target);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(att: Attachment) {
    if (deletingId !== att.id) {
      setDeletingId(att.id);
      setTimeout(() => setDeletingId((cur) => (cur === att.id ? null : cur)), 3000);
      return;
    }
    try {
      await attachmentService.delete(att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      setDeletingId(null);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider">
          Attachments
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUpload}
          disabled={isUploading}
        >
          <Upload size={12} />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {error && (
        <p className="text-2xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 py-1 mb-2">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-2xs text-gray-400 italic">Loading...</p>
      ) : attachments.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-4 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary text-gray-400">
          <Paperclip size={14} />
          <span className="text-2xs">No files attached</span>
        </div>
      ) : (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary group"
            >
              <span className="text-gray-400 flex-shrink-0">
                {iconForMime(att.mime_type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" title={att.filename}>
                  {att.filename}
                </p>
                <p className="text-2xs text-gray-400">
                  {formatSize(att.size_bytes)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 text-gray-400 hover:text-lockgrid-500 transition-colors"
                  title="Download"
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  className={`p-1.5 transition-colors ${
                    deletingId === att.id
                      ? "text-red-500"
                      : "text-gray-400 hover:text-red-500"
                  }`}
                  title={
                    deletingId === att.id ? "Click again to confirm" : "Delete"
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function iconForMime(mime: string): React.ReactNode {
  if (mime.startsWith("image/")) return <ImageIcon size={14} />;
  if (mime.startsWith("text/") || mime === "application/json")
    return <FileText size={14} />;
  return <FileIcon size={14} />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
