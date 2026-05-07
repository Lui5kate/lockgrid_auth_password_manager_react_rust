import { useEffect, useRef, useState } from "react";
import { Plus, X, Tag as TagIcon, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTagStore } from "../stores/tagStore";
import type { Tag } from "@/types/tag";

interface TagSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TAG_COLORS = [
  "#4c6ef5",
  "#40c057",
  "#fab005",
  "#e64980",
  "#7950f2",
  "#fd7e14",
  "#15aabf",
  "#868e96",
];

export function TagSelector({ selectedIds, onChange }: TagSelectorProps) {
  const { tags, fetchTags, createTag } = useTagStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));
  const filtered = tags.filter(
    (t) =>
      !selectedIds.includes(t.id) &&
      t.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      const tag = await createTag(name, color);
      onChange([...selectedIds, tag.id]);
      setQuery("");
      inputRef.current?.focus();
    } catch {
      // ignored
    } finally {
      setIsCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        toggle(filtered[0].id);
        setQuery("");
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === "Backspace" && !query && selectedIds.length > 0) {
      remove(selectedIds[selectedIds.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Tags
      </label>

      <div
        className="flex flex-wrap items-center gap-1.5 p-2 min-h-[38px] rounded-lg border border-border dark:border-border-dark bg-white dark:bg-surface-dark-secondary focus-within:ring-2 focus-within:ring-lockgrid-500/50 focus-within:border-lockgrid-500 transition-colors cursor-text"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => remove(tag.id)} />
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder-gray-400"
        />
      </div>

      {isOpen && (filtered.length > 0 || canCreate) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg border border-border dark:border-border-dark bg-white dark:bg-surface-dark shadow-lg">
          {filtered.slice(0, 8).map((tag) => (
            <button
              type="button"
              key={tag.id}
              onClick={() => {
                toggle(tag.id);
                setQuery("");
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-surface-dark-secondary transition-colors"
            >
              <TagIcon
                size={10}
                style={tag.color ? { color: tag.color } : undefined}
              />
              <span className="flex-1 truncate">{tag.name}</span>
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-lockgrid-600 dark:text-lockgrid-400 hover:bg-lockgrid-50 dark:hover:bg-lockgrid-900/20 transition-colors border-t border-border dark:border-border-dark disabled:opacity-50"
            >
              <Plus size={12} />
              <span>
                Create <strong>"{query.trim()}"</strong>
              </span>
              {isCreating && <Check size={12} className="ml-auto animate-pulse" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TagChip({
  tag,
  onRemove,
}: {
  tag: Tag;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium",
        "bg-gray-100 dark:bg-surface-dark-tertiary text-gray-600 dark:text-gray-400",
      )}
      style={
        tag.color
          ? {
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }
          : undefined
      }
    >
      {tag.name}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:opacity-70"
      >
        <X size={10} />
      </button>
    </span>
  );
}
