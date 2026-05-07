import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  User,
  Key,
  Link,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useClipboard } from "@/hooks/useClipboard";
import { fileService } from "@/services/fileService";
import type { Credential, ConnectionStep, ConnectionConfig } from "@/types/credential";

interface GuidedConnectionRunnerProps {
  credential: Credential;
  onClose: () => void;
}

export function GuidedConnectionRunner({
  credential,
  onClose,
}: GuidedConnectionRunnerProps) {
  const config = useMemo<ConnectionConfig>(
    () => parseConfig(credential.connection_config),
    [credential.connection_config],
  );
  const steps: ConnectionStep[] = config.steps ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const { copy, copiedField } = useClipboard();

  const current = steps[currentIndex];
  const totalSteps = steps.length;
  const isLast = currentIndex === totalSteps - 1;

  async function launchTarget() {
    setLaunchError("");
    try {
      if (credential.connection_type === "web" && credential.url) {
        await fileService.openUrl(credential.url);
      } else if (
        credential.connection_type === "rdp" ||
        credential.connection_type === "ssh" ||
        credential.connection_type === "file"
      ) {
        if (config.path) {
          await fileService.openFile(config.path);
        } else if (credential.url) {
          await fileService.openUrl(credential.url);
        }
      } else if (credential.connection_type === "command" && config.command) {
        await fileService.executeCommand(config.command, config.args ?? []);
      } else if (credential.url) {
        await fileService.openUrl(credential.url);
      }
      setLaunched(true);
    } catch (e) {
      setLaunchError(String(e));
    }
  }

  function next() {
    if (isLast) {
      onClose();
    } else {
      setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
    }
  }

  function prev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2 min-w-0">
            <Play size={14} className="text-lockgrid-500 flex-shrink-0" />
            <h2 className="text-sm font-semibold truncate">
              {credential.title}
            </h2>
            {credential.connection_type && (
              <span className="text-2xs px-1.5 py-0.5 rounded bg-lockgrid-50 dark:bg-lockgrid-900/20 text-lockgrid-600 dark:text-lockgrid-400 font-mono uppercase">
                {credential.connection_type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        {totalSteps > 0 && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs text-gray-400 uppercase tracking-wider">
                Step {currentIndex + 1} of {totalSteps}
              </span>
              <span className="text-2xs font-mono text-gray-400">
                {Math.round(((currentIndex + 1) / totalSteps) * 100)}%
              </span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-surface-dark-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-lockgrid-500"
                initial={false}
                animate={{
                  width: `${((currentIndex + 1) / totalSteps) * 100}%`,
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="p-5 space-y-4 min-h-[140px]">
          {totalSteps === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No guided steps configured. Use the quick actions below.
            </p>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm leading-relaxed">
                {current?.description || (
                  <span className="italic text-gray-400">
                    (No description for this step)
                  </span>
                )}
              </p>
            </motion.div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            {credential.username && (
              <QuickAction
                icon={<User size={12} />}
                label="Username"
                copied={copiedField === "username"}
                onClick={() => copy(credential.username!, "username")}
              />
            )}
            {credential.password && (
              <QuickAction
                icon={<Key size={12} />}
                label="Password"
                copied={copiedField === "password"}
                onClick={() => copy(credential.password!, "password")}
              />
            )}
            {credential.url && (
              <QuickAction
                icon={<Link size={12} />}
                label="Copy URL"
                copied={copiedField === "url"}
                onClick={() => copy(credential.url!, "url")}
              />
            )}
            {hasLaunchTarget(credential, config) && (
              <button
                onClick={launchTarget}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-lockgrid-600 text-white hover:bg-lockgrid-700 transition-colors"
              >
                {launched ? (
                  <>
                    <Check size={12} />
                    Launched
                  </>
                ) : (
                  <>
                    <Terminal size={12} />
                    Launch
                  </>
                )}
              </button>
            )}
          </div>

          {launchError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 py-1">
              {launchError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border dark:border-border-dark">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={currentIndex === 0 || totalSteps === 0}
          >
            <ChevronLeft size={14} />
            Back
          </Button>
          <Button type="button" size="sm" onClick={next}>
            {isLast || totalSteps === 0 ? "Finish" : "Next"}
            {!isLast && totalSteps > 0 && <ChevronRight size={14} />}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuickAction({
  icon,
  label,
  copied,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-surface-dark-tertiary hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-500" />
          Copied
        </>
      ) : (
        <>
          {icon}
          <Copy size={10} />
          {label}
        </>
      )}
    </button>
  );
}

function hasLaunchTarget(
  credential: Credential,
  config: ConnectionConfig,
): boolean {
  if (!credential.connection_type) return !!credential.url;
  if (credential.connection_type === "web") return !!credential.url;
  if (credential.connection_type === "command") return !!config.command;
  return !!config.path || !!credential.url;
}

function parseConfig(raw: string | null): ConnectionConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ConnectionConfig;
  } catch {
    // fall through
  }
  return {};
}
