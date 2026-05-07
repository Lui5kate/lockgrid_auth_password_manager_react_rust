import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, Globe, Terminal, Monitor, Database, Key, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";
import type { CredentialSummary } from "@/types/credential";

interface MainPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MainPanel({ searchQuery, onSearchChange }: MainPanelProps) {
  const { credentials, selectedId, isLoading, selectCredential, setFilter, fetchCredentials } =
    useCredentialStore();

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setFilter({ search_query: searchQuery || undefined });
    }, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, setFilter]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark">
      {/* Search */}
      <div className="p-3 border-b border-border dark:border-border-dark">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter credentials..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary border border-transparent focus:border-lockgrid-500 focus:outline-none focus:ring-1 focus:ring-lockgrid-500/30 transition-colors placeholder-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-lockgrid-500/30 border-t-lockgrid-500 rounded-full animate-spin" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <Key size={24} className="mb-2 opacity-50" />
            <p className="text-xs">No credentials found</p>
          </div>
        ) : (
          <AnimatePresence>
            {credentials.map((cred, i) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                isSelected={cred.id === selectedId}
                onClick={() => selectCredential(cred.id)}
                index={i}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Count */}
      <div className="px-3 py-2 border-t border-border dark:border-border-dark">
        <span className="text-2xs text-gray-400">
          {credentials.length} item{credentials.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

const CONNECTION_ICONS: Record<string, React.ReactNode> = {
  web: <Globe size={12} />,
  ssh: <Terminal size={12} />,
  rdp: <Monitor size={12} />,
  database: <Database size={12} />,
};

function CredentialCard({
  credential,
  isSelected,
  onClick,
  index,
}: {
  credential: CredentialSummary;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-border/50 dark:border-border-dark/50 transition-colors",
        isSelected
          ? "bg-lockgrid-50 dark:bg-lockgrid-900/20 border-l-2 border-l-lockgrid-500"
          : "hover:bg-gray-50 dark:hover:bg-surface-dark-secondary border-l-2 border-l-transparent",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">
              {credential.title}
            </span>
            {credential.is_favorite && (
              <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          {credential.username && (
            <p className="text-2xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {credential.username}
            </p>
          )}
          {credential.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {credential.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} color={tag.color ?? undefined} className="text-2xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {credential.connection_type && (
          <span className="text-gray-400 mt-0.5">
            {CONNECTION_ICONS[credential.connection_type] || <ExternalLink size={12} />}
          </span>
        )}
      </div>
    </motion.button>
  );
}
