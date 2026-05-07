import { useMemo } from "react";
import { Plus, Trash2, GripVertical, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui";
import type {
  ConnectionType,
  ConnectionConfig,
  ConnectionStep,
} from "@/types/credential";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

interface ConnectionConfigEditorProps {
  connectionType: ConnectionType | "";
  value: string; // JSON string (connection_config field)
  onChange: (value: string) => void;
}

export function ConnectionConfigEditor({
  connectionType,
  value,
  onChange,
}: ConnectionConfigEditorProps) {
  const config = useMemo<ConnectionConfig>(() => parseConfig(value), [value]);

  function update(patch: Partial<ConnectionConfig>) {
    const next: ConnectionConfig = { ...config, ...patch };
    onChange(serialize(next));
  }

  function addStep() {
    const steps = [...(config.steps ?? [])];
    steps.push({
      order: steps.length + 1,
      description: "",
    });
    update({ steps });
  }

  function removeStep(index: number) {
    const steps = (config.steps ?? []).filter((_, i) => i !== index);
    update({ steps: reorder(steps) });
  }

  function updateStep(index: number, patch: Partial<ConnectionStep>) {
    const steps = (config.steps ?? []).map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    update({ steps });
  }

  if (!connectionType || connectionType === "web") {
    // Web uses the url field already present in the form. Only steps are useful here.
    return (
      <div className="space-y-2">
        <StepsEditor
          steps={config.steps ?? []}
          onAdd={addStep}
          onRemove={removeStep}
          onUpdate={updateStep}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border dark:border-border-dark p-3 bg-surface-secondary dark:bg-surface-dark-secondary">
      <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
        {connectionType.toUpperCase()} configuration
      </p>

      {(connectionType === "rdp" ||
        connectionType === "ssh" ||
        connectionType === "file") && (
        <PathField
          connectionType={connectionType}
          path={config.path ?? ""}
          onChange={(path) => update({ path })}
        />
      )}

      {connectionType === "command" && (
        <CommandFields
          command={config.command ?? ""}
          args={config.args ?? []}
          onCommand={(command) => update({ command })}
          onArgs={(args) => update({ args })}
        />
      )}

      <StepsEditor
        steps={config.steps ?? []}
        onAdd={addStep}
        onRemove={removeStep}
        onUpdate={updateStep}
      />
    </div>
  );
}

function PathField({
  connectionType,
  path,
  onChange,
}: {
  connectionType: "rdp" | "ssh" | "file";
  path: string;
  onChange: (p: string) => void;
}) {
  const placeholder =
    connectionType === "rdp"
      ? "C:\\path\\to\\server.rdp"
      : connectionType === "ssh"
        ? "user@host or session file path"
        : "C:\\path\\to\\file";

  async function browse() {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
      });
      if (typeof selected === "string") {
        onChange(selected);
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <div>
      <label className="block text-2xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Target path
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={path}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base flex-1 font-mono text-xs"
        />
        <Button type="button" variant="secondary" size="sm" onClick={browse}>
          <FolderOpen size={12} />
          Browse
        </Button>
      </div>
    </div>
  );
}

function CommandFields({
  command,
  args,
  onCommand,
  onArgs,
}: {
  command: string;
  args: string[];
  onCommand: (c: string) => void;
  onArgs: (a: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-2xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Command
        </label>
        <input
          type="text"
          value={command}
          onChange={(e) => onCommand(e.target.value)}
          placeholder="e.g. mstsc, ssh, ping"
          className="input-base font-mono text-xs"
        />
        <p className="text-2xs text-gray-400 mt-1">
          Allowed: mstsc, ssh, ping, nslookup
        </p>
      </div>
      <div>
        <label className="block text-2xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Arguments
        </label>
        <input
          type="text"
          value={args.join(" ")}
          onChange={(e) =>
            onArgs(
              e.target.value
                .split(" ")
                .map((a) => a.trim())
                .filter((a) => a.length > 0),
            )
          }
          placeholder="space-separated args"
          className="input-base font-mono text-xs"
        />
      </div>
    </div>
  );
}

function StepsEditor({
  steps,
  onAdd,
  onRemove,
  onUpdate,
}: {
  steps: ConnectionStep[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, p: Partial<ConnectionStep>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
          Guided steps (optional)
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus size={12} />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <p className="text-2xs text-gray-400 italic">
          Add step-by-step instructions that guide you through connecting to
          this service.
        </p>
      ) : (
        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-surface-dark"
            >
              <GripVertical
                size={12}
                className="text-gray-300 dark:text-gray-600 mt-2 flex-shrink-0"
              />
              <span className="text-2xs font-mono text-gray-400 w-5 text-center mt-2">
                {i + 1}
              </span>
              <input
                type="text"
                value={step.description}
                onChange={(e) =>
                  onUpdate(i, { description: e.target.value })
                }
                placeholder={`Step ${i + 1} instructions`}
                className="input-base flex-1 text-xs"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="p-1.5 text-red-400 hover:text-red-600 transition-colors mt-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parseConfig(raw: string): ConnectionConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ConnectionConfig;
  } catch {
    // fall through
  }
  return {};
}

function serialize(config: ConnectionConfig): string {
  const clean: ConnectionConfig = {};
  if (config.path) clean.path = config.path;
  if (config.command) clean.command = config.command;
  if (config.args && config.args.length > 0) clean.args = config.args;
  if (config.steps && config.steps.length > 0)
    clean.steps = reorder(config.steps);
  return Object.keys(clean).length === 0 ? "" : JSON.stringify(clean);
}

function reorder(steps: ConnectionStep[]): ConnectionStep[] {
  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}
