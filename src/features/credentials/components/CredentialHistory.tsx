import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, History, ArrowRight, Clock } from "lucide-react";
import { Spinner } from "@/components/ui";
import { credentialService } from "@/services/credentialService";
import type { HistoryEntry } from "@/types/credential";

interface CredentialHistoryProps {
  credentialId: string;
  credentialTitle: string;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  username: "Username",
  password: "Password",
  url: "URL",
  notes_plain: "Notes",
  connection_type: "Connection type",
  connection_config: "Connection config",
  category_id: "Category",
};

export function CredentialHistory({
  credentialId,
  credentialTitle,
  onClose,
}: CredentialHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await credentialService.getHistory(credentialId);
        if (!cancelled) {
          setEntries(res);
          setIsLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [credentialId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg max-h-[80vh] bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2 min-w-0">
            <History size={14} className="text-lockgrid-500 flex-shrink-0" />
            <h2 className="text-sm font-semibold truncate">
              History — {credentialTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              {error}
            </p>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
              <Clock size={24} className="mb-2 opacity-50" />
              <p className="text-xs">No changes recorded yet</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {entries.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ol>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const label = FIELD_LABELS[entry.field_name] ?? entry.field_name;
  const date = new Date(entry.changed_at);
  const oldVal = entry.old_value ?? "—";
  const newVal = entry.new_value ?? "—";

  return (
    <li className="p-3 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs font-semibold text-lockgrid-600 dark:text-lockgrid-400 uppercase tracking-wider">
          {label}
        </span>
        <span
          className="text-2xs text-gray-400"
          title={date.toLocaleString()}
        >
          {formatRelative(date)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="flex-1 min-w-0 font-mono text-gray-400 dark:text-gray-500 line-through truncate">
          {oldVal}
        </span>
        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
        <span className="flex-1 min-w-0 font-mono text-gray-700 dark:text-gray-200 truncate">
          {newVal}
        </span>
      </div>
    </li>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
