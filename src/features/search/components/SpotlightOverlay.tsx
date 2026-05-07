import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Star, Globe, Terminal, Monitor, Key, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";
import type { CredentialSummary } from "@/types/credential";

interface SpotlightOverlayProps {
  onClose: () => void;
}

const CONNECTION_ICONS: Record<string, React.ReactNode> = {
  web: <Globe size={14} />,
  ssh: <Terminal size={14} />,
  rdp: <Monitor size={14} />,
};

export function SpotlightOverlay({ onClose }: SpotlightOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CredentialSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectCredential = useCredentialStore((s) => s.selectCredential);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res: CredentialSummary[] = await invoke("search_credentials", {
          query: query.trim(),
        });
        setResults(res);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (id: string) => {
      selectCredential(id);
      onClose();
    },
    [selectCredential, onClose],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden border border-border dark:border-border-dark"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search credentials..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
          />
          <kbd className="text-2xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto py-1">
            {results.map((cred, i) => (
              <button
                key={cred.id}
                onClick={() => handleSelect(cred.id)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-lockgrid-50 dark:bg-lockgrid-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-surface-dark-secondary"
                }`}
              >
                <span className="text-gray-400">
                  {cred.connection_type
                    ? CONNECTION_ICONS[cred.connection_type] || <Key size={14} />
                    : <Key size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {cred.title}
                    </span>
                    {cred.is_favorite && (
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  {cred.username && (
                    <p className="text-xs text-gray-500 truncate">
                      {cred.username}
                    </p>
                  )}
                </div>
                {cred.url && (
                  <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && !isSearching && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No credentials found for "{query}"
          </div>
        )}

        {/* Loading */}
        {isSearching && (
          <div className="py-4 flex justify-center">
            <div className="w-4 h-4 border-2 border-lockgrid-500/30 border-t-lockgrid-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Hint */}
        {!query.trim() && (
          <div className="py-6 text-center text-xs text-gray-400">
            Type to search your vault
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
