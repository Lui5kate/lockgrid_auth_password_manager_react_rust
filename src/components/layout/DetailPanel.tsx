import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  Star,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Play,
  History,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button, Badge, Spinner } from "@/components/ui";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";
import { useClipboard } from "@/hooks/useClipboard";
import { fileService } from "@/services/fileService";
import { GuidedConnectionRunner } from "@/features/guided-connection/components/GuidedConnectionRunner";
import { CredentialHistory } from "@/features/credentials/components/CredentialHistory";
import { AttachmentsSection } from "@/features/credentials/components/AttachmentsSection";
import { TotpField } from "@/features/credentials/components/TotpField";
import type { Credential, ConnectionConfig } from "@/types/credential";

interface DetailPanelProps {
  onEdit: () => void;
}

export function DetailPanel({ onEdit }: DetailPanelProps) {
  const { selectedCredential: cred, isDetailLoading, deleteCredential } =
    useCredentialStore();

  if (isDetailLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (!cred) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p className="text-sm font-medium mb-1">No credential selected</p>
          <p className="text-xs">Select an item from the list to view details</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={cred.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full overflow-y-auto"
    >
      <CredentialDetailView
        credential={cred}
        onEdit={onEdit}
        onDelete={() => deleteCredential(cred.id)}
      />
    </motion.div>
  );
}

function CredentialDetailView({
  credential,
  onEdit,
  onDelete,
}: {
  credential: Credential;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [launchState, setLaunchState] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [launchError, setLaunchError] = useState("");
  const { copy, copiedField } = useClipboard();

  const hasSteps = hasGuidedSteps(credential.connection_config);
  const launchInfo = resolveLaunchTarget(credential);

  async function handleLaunchTarget() {
    if (!launchInfo || launchState === "launching") return;
    setLaunchState("launching");
    setLaunchError("");
    try {
      if (launchInfo.kind === "url") {
        await fileService.openUrl(launchInfo.value);
      } else if (launchInfo.kind === "file") {
        await fileService.openFile(launchInfo.value);
      } else {
        await fileService.executeCommand(launchInfo.command, launchInfo.args);
      }
      setLaunchState("done");
      setTimeout(() => setLaunchState("idle"), 2000);
    } catch (e) {
      setLaunchState("error");
      setLaunchError(String(e));
      setTimeout(() => setLaunchState("idle"), 4000);
    }
  }

  function handleGuidedConnect() {
    setShowRunner(true);
  }

  async function handleDelete() {
    if (isDeleting) {
      await onDelete();
      setIsDeleting(false);
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold truncate">{credential.title}</h2>
            {credential.is_favorite && (
              <Star size={16} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          {credential.connection_type && (
            <Badge className="mt-1">{credential.connection_type.toUpperCase()}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            title="View history"
          >
            <History size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className={isDeleting ? "text-red-500" : ""}
            title="Delete"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {isDeleting && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400"
        >
          Click delete again to confirm. This will soft-delete the credential.
        </motion.div>
      )}

      {/* Launch target button */}
      {launchInfo && (
        <Button
          onClick={handleLaunchTarget}
          disabled={launchState === "launching"}
          className="w-full rounded-xl py-3"
        >
          {launchState === "launching" ? (
            <>
              <Play size={16} className="animate-pulse" />
              Opening...
            </>
          ) : launchState === "done" ? (
            <>
              <Check size={16} className="text-green-300" />
              Opened
            </>
          ) : launchState === "error" ? (
            <>
              <Play size={16} />
              Retry
            </>
          ) : (
            <>
              <Play size={16} />
              {launchInfo.label}
            </>
          )}
        </Button>
      )}

      {launchError && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {launchError}
        </p>
      )}

      {hasSteps && (
        <Button
          variant="secondary"
          onClick={handleGuidedConnect}
          className="w-full rounded-xl py-3"
        >
          <Play size={16} />
          Start Guided Connection
        </Button>
      )}

      {/* Fields */}
      <div className="space-y-3">
        {credential.username && (
          <FieldRow
            label="Username"
            value={credential.username}
            onCopy={() => copy(credential.username!, "username")}
            copied={copiedField === "username"}
          />
        )}

        {credential.password && (
          <FieldRow
            label="Password"
            value={showPassword ? credential.password : "••••••••••••"}
            onCopy={() => copy(credential.password!, "password")}
            copied={copiedField === "password"}
            actions={
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        )}

        {credential.url && (
          <FieldRow
            label="URL"
            value={credential.url}
            onCopy={() => copy(credential.url!, "url")}
            copied={copiedField === "url"}
            actions={
              <button
                onClick={() => fileService.openUrl(credential.url!)}
                className="p-1 text-gray-400 hover:text-lockgrid-500 transition-colors"
              >
                <ExternalLink size={14} />
              </button>
            }
          />
        )}

        {credential.totp_secret && <TotpField secret={credential.totp_secret} />}

        {/* Custom Fields */}
        {credential.custom_fields.map((field) => (
          <FieldRow
            key={field.id}
            label={field.field_name}
            value={
              field.field_type === "password"
                ? "••••••••••••"
                : field.field_value
            }
            onCopy={() => copy(field.field_value, field.field_name)}
            copied={copiedField === field.field_name}
          />
        ))}
      </div>

      {/* Tags */}
      {credential.tags.length > 0 && (
        <div>
          <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {credential.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color ?? undefined}>
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {credential.notes_plain && (
        <div>
          <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Notes
          </p>
          <div className="p-3 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary text-xs whitespace-pre-wrap">
            {credential.notes_plain}
          </div>
        </div>
      )}

      {/* Attachments */}
      <AttachmentsSection credentialId={credential.id} />

      {/* Meta */}
      <div className="pt-2 border-t border-border dark:border-border-dark">
        <p className="text-2xs text-gray-400">
          Created {new Date(credential.created_at).toLocaleDateString()}
          {" / "}
          Updated {new Date(credential.updated_at).toLocaleDateString()}
        </p>
      </div>

      <AnimatePresence>
        {showRunner && (
          <GuidedConnectionRunner
            key="guided-runner"
            credential={credential}
            onClose={() => setShowRunner(false)}
          />
        )}
        {showHistory && (
          <CredentialHistory
            key="history"
            credentialId={credential.id}
            credentialTitle={credential.title}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function hasGuidedSteps(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as ConnectionConfig;
    return Array.isArray(parsed?.steps) && parsed.steps.length > 0;
  } catch {
    return false;
  }
}

type LaunchInfo =
  | { kind: "url"; value: string; label: string }
  | { kind: "file"; value: string; label: string }
  | { kind: "command"; command: string; args: string[]; label: string };

function resolveLaunchTarget(credential: Credential): LaunchInfo | null {
  const config = parseConnectionConfig(credential.connection_config);
  const type = credential.connection_type;

  if (type === "command") {
    if (!config.command) return null;
    return {
      kind: "command",
      command: config.command,
      args: config.args ?? [],
      label: `Run ${config.command}`,
    };
  }

  if (type === "rdp" || type === "ssh" || type === "file") {
    if (config.path) {
      return {
        kind: "file",
        value: config.path,
        label:
          type === "rdp"
            ? "Open Remote Desktop"
            : type === "ssh"
              ? "Open SSH Session"
              : "Open File",
      };
    }
  }

  if (credential.url) {
    return {
      kind: "url",
      value: credential.url,
      label: type === "web" ? "Open Website" : "Open Link",
    };
  }

  return null;
}

function parseConnectionConfig(raw: string | null): ConnectionConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ConnectionConfig;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore
  }
  return {};
}

function FieldRow({
  label,
  value,
  onCopy,
  copied,
  actions,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="group">
      <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary group-hover:bg-surface-tertiary dark:group-hover:bg-surface-dark-tertiary transition-colors">
        <span className="flex-1 text-xs font-mono truncate select-text">
          {value}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
          <button
            onClick={onCopy}
            className="p-1 text-gray-400 hover:text-lockgrid-500 transition-colors"
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
