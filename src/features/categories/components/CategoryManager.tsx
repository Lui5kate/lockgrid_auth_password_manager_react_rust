import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Check,
  Edit3,
  Globe,
  Terminal,
  Monitor,
  Database,
  Mail,
  Key,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useCategoryStore } from "../stores/categoryStore";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";
import type { Category } from "@/types/category";

interface CategoryManagerProps {
  onClose: () => void;
}

const ICON_OPTIONS: { id: string; node: React.ReactNode }[] = [
  { id: "folder", node: <Folder size={16} /> },
  { id: "globe", node: <Globe size={16} /> },
  { id: "terminal", node: <Terminal size={16} /> },
  { id: "monitor", node: <Monitor size={16} /> },
  { id: "database", node: <Database size={16} /> },
  { id: "mail", node: <Mail size={16} /> },
  { id: "key", node: <Key size={16} /> },
];

const COLOR_OPTIONS = [
  "#4c6ef5",
  "#40c057",
  "#fab005",
  "#e64980",
  "#7950f2",
  "#fd7e14",
  "#15aabf",
  "#868e96",
];

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } =
    useCategoryStore();
  const fetchCredentials = useCredentialStore((s) => s.fetchCredentials);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ name: string; icon: string; color: string }>({
    name: "",
    icon: "folder",
    color: COLOR_OPTIONS[0],
  });
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft({ name: "", icon: "folder", color: COLOR_OPTIONS[0] });
    setError("");
  }

  function startEdit(cat: Category) {
    setCreating(false);
    setEditingId(cat.id);
    setDraft({ name: cat.name, icon: cat.icon, color: cat.color });
    setError("");
  }

  function cancelDraft() {
    setCreating(false);
    setEditingId(null);
    setError("");
  }

  async function saveDraft() {
    if (!draft.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      if (creating) {
        await createCategory(draft.name.trim(), draft.icon, draft.color);
      } else if (editingId) {
        const existing = categories.find((c) => c.id === editingId);
        if (existing) {
          await updateCategory(
            editingId,
            draft.name.trim(),
            draft.icon,
            draft.color,
            existing.sort_order,
          );
        }
      }
      cancelDraft();
    } catch (e) {
      setError(String(e));
    }
  }

  async function confirmDelete(id: string) {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    try {
      await deleteCategory(id);
      setDeleteConfirmId(null);
      // Credentials that pointed to this category now have category_id = null
      await fetchCredentials();
    } catch (e) {
      setError(String(e));
    }
  }

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
        className="w-full max-w-md max-h-[80vh] bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-base font-semibold">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            return (
              <div
                key={cat.id}
                className={cn(
                  "rounded-lg transition-colors",
                  isEditing
                    ? "bg-surface-secondary dark:bg-surface-dark-secondary p-3"
                    : "hover:bg-gray-50 dark:hover:bg-surface-dark-secondary px-3 py-2",
                )}
              >
                {isEditing ? (
                  <DraftEditor
                    draft={draft}
                    setDraft={setDraft}
                    onSave={saveDraft}
                    onCancel={cancelDraft}
                    error={error}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span style={{ color: cat.color }}>
                      {ICON_OPTIONS.find((o) => o.id === cat.icon)?.node ?? (
                        <Folder size={16} />
                      )}
                    </span>
                    <span className="flex-1 text-sm truncate">{cat.name}</span>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-lockgrid-500 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => confirmDelete(cat.id)}
                      className={cn(
                        "p-1.5 transition-colors",
                        deleteConfirmId === cat.id
                          ? "text-red-500"
                          : "text-gray-400 hover:text-red-500",
                      )}
                      title={
                        deleteConfirmId === cat.id
                          ? "Click again to confirm"
                          : "Delete"
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {creating && (
            <div className="rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary p-3 mt-2">
              <DraftEditor
                draft={draft}
                setDraft={setDraft}
                onSave={saveDraft}
                onCancel={cancelDraft}
                error={error}
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border dark:border-border-dark flex justify-between items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={startCreate}
            disabled={creating || editingId !== null}
          >
            <Plus size={14} />
            New Category
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DraftEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  error,
}: {
  draft: { name: string; icon: string; color: string };
  setDraft: (d: { name: string; icon: string; color: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string;
}) {
  return (
    <div className="space-y-2.5">
      <input
        autoFocus
        type="text"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Category name"
        className="input-base text-sm"
      />

      <div>
        <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
          Icon
        </p>
        <div className="flex flex-wrap gap-1">
          {ICON_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => setDraft({ ...draft, icon: opt.id })}
              className={cn(
                "p-2 rounded-lg transition-all",
                draft.icon === opt.id
                  ? "bg-lockgrid-100 dark:bg-lockgrid-900/30 text-lockgrid-600 dark:text-lockgrid-400 ring-1 ring-lockgrid-500"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary",
              )}
            >
              {opt.node}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
          Color
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setDraft({ ...draft, color: c })}
              className={cn(
                "w-6 h-6 rounded-full transition-transform",
                draft.color === c
                  ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-dark ring-lockgrid-500 scale-110"
                  : "hover:scale-110",
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 py-1">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave}>
          <Check size={12} />
          Save
        </Button>
      </div>
    </div>
  );
}
