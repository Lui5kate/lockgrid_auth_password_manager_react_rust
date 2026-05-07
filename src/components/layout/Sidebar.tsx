import { useEffect } from "react";
import {
  Plus,
  Search,
  Lock,
  Star,
  Settings,
  Globe,
  Terminal,
  Monitor,
  Database,
  Mail,
  Key,
  Folder,
  Pencil,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCategoryStore } from "@/features/categories/stores/categoryStore";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";
import { useTagStore } from "@/features/tags/stores/tagStore";
import { useAuthStore } from "@/features/auth/stores/authStore";

const ICON_MAP: Record<string, React.ReactNode> = {
  globe: <Globe size={16} />,
  terminal: <Terminal size={16} />,
  monitor: <Monitor size={16} />,
  database: <Database size={16} />,
  mail: <Mail size={16} />,
  key: <Key size={16} />,
  folder: <Folder size={16} />,
};

interface SidebarProps {
  onNewCredential: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onManageCategories: () => void;
}

export function Sidebar({
  onNewCredential,
  onOpenSearch,
  onOpenSettings,
  onManageCategories,
}: SidebarProps) {
  const { categories, selectedCategoryId, fetchCategories, selectCategory } =
    useCategoryStore();
  const { tags, fetchTags } = useTagStore();
  const { setFilter, filter } = useCredentialStore();
  const lock = useAuthStore((s) => s.lock);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  function handleCategoryClick(id: string | null) {
    selectCategory(id);
    setFilter({ category_id: id ?? undefined, tag_id: undefined, favorites_only: false });
  }

  function handleFavorites() {
    selectCategory(null);
    setFilter({ category_id: undefined, tag_id: undefined, favorites_only: true });
  }

  function handleAll() {
    selectCategory(null);
    setFilter({ category_id: undefined, tag_id: undefined, favorites_only: false });
  }

  function handleTagClick(id: string) {
    selectCategory(null);
    setFilter({
      category_id: undefined,
      tag_id: filter.tag_id === id ? undefined : id,
      favorites_only: false,
    });
  }

  return (
    <div className="flex flex-col h-full bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Quick Actions */}
      <div className="p-3 space-y-1">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors text-xs"
        >
          <Search size={14} />
          <span>Search...</span>
          <kbd className="ml-auto text-2xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={onNewCredential}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-lockgrid-600 dark:text-lockgrid-400 hover:bg-lockgrid-50 dark:hover:bg-lockgrid-900/20 transition-colors text-xs font-medium"
        >
          <Plus size={14} />
          <span>New Credential</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-4">
          <p className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-1">
            Views
          </p>
          <NavItem
            icon={<Folder size={16} />}
            label="All Items"
            active={!selectedCategoryId && !filter.favorites_only}
            onClick={handleAll}
          />
          <NavItem
            icon={<Star size={16} />}
            label="Favorites"
            active={filter.favorites_only}
            onClick={handleFavorites}
            color="#fab005"
          />
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-1 group">
            <p className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Categories
            </p>
            <button
              onClick={onManageCategories}
              className="p-0.5 text-gray-400 hover:text-lockgrid-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Manage categories"
            >
              <Pencil size={11} />
            </button>
          </div>
          {categories.map((cat) => (
            <NavItem
              key={cat.id}
              icon={ICON_MAP[cat.icon] || <Folder size={16} />}
              label={cat.name}
              active={selectedCategoryId === cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              color={cat.color}
            />
          ))}
        </div>

        {tags.length > 0 && (
          <div className="mt-4">
            <p className="text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-1">
              Tags
            </p>
            {tags.map((tag) => (
              <NavItem
                key={tag.id}
                icon={<TagIcon size={14} />}
                label={tag.name}
                active={filter.tag_id === tag.id}
                onClick={() => handleTagClick(tag.id)}
                color={tag.color ?? undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border dark:border-border-dark space-y-1">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors text-xs"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
        <button
          onClick={lock}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-xs"
        >
          <Lock size={14} />
          <span>Lock Vault</span>
        </button>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150",
        active
          ? "bg-lockgrid-50 dark:bg-lockgrid-900/30 text-lockgrid-700 dark:text-lockgrid-300 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary",
      )}
    >
      <span style={color && active ? { color } : undefined}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
