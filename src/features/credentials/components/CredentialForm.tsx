import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, RefreshCw, Copy, Check } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { PasswordStrength } from "@/components/shared/PasswordStrength";
import { ConnectionConfigEditor } from "@/features/guided-connection/components/ConnectionConfigEditor";
import { TagSelector } from "@/features/tags/components/TagSelector";
import { useCredentialStore } from "../stores/credentialStore";
import { useCategoryStore } from "@/features/categories/stores/categoryStore";
import { credentialService } from "@/services/credentialService";
import { useClipboard } from "@/hooks/useClipboard";
import type {
  Credential,
  CreateCustomFieldInput,
  ConnectionType,
} from "@/types/credential";
import type { PasswordGenConfig } from "@/types/settings";

interface CredentialFormProps {
  credential?: Credential | null;
  onClose: () => void;
}

export function CredentialForm({ credential, onClose }: CredentialFormProps) {
  const isEdit = !!credential;
  const { createCredential, updateCredential } = useCredentialStore();
  const { categories } = useCategoryStore();
  const { copy, copiedField } = useClipboard();

  const [title, setTitle] = useState(credential?.title ?? "");
  const [username, setUsername] = useState(credential?.username ?? "");
  const [password, setPassword] = useState(credential?.password ?? "");
  const [url, setUrl] = useState(credential?.url ?? "");
  const [notes, setNotes] = useState(credential?.notes_plain ?? "");
  const [categoryId, setCategoryId] = useState(credential?.category_id ?? "");
  const [isFavorite, setIsFavorite] = useState(credential?.is_favorite ?? false);
  const [connectionType, setConnectionType] = useState<string>(
    credential?.connection_type ?? "",
  );
  const [connectionConfig, setConnectionConfig] = useState<string>(
    credential?.connection_config ?? "",
  );
  const [totpSecret, setTotpSecret] = useState<string>(
    credential?.totp_secret ?? "",
  );
  const [customFields, setCustomFields] = useState<CreateCustomFieldInput[]>(
    credential?.custom_fields?.map((cf) => ({
      field_name: cf.field_name,
      field_value: cf.field_value,
      field_type: cf.field_type,
      sort_order: cf.sort_order,
    })) ?? [],
  );
  const [tagIds, setTagIds] = useState<string[]>(
    credential?.tags?.map((t) => t.id) ?? [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Password generator state
  const [genLength, setGenLength] = useState(20);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  async function generatePassword() {
    try {
      const config: PasswordGenConfig = {
        length: genLength,
        uppercase: genUppercase,
        lowercase: true,
        numbers: genNumbers,
        symbols: genSymbols,
        exclude_ambiguous: false,
      };
      const pw = await credentialService.generatePassword(config);
      setPassword(pw);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const totpNormalized = totpSecret.replace(/\s+/g, "").toUpperCase();

      if (isEdit && credential) {
        await updateCredential(credential.id, {
          title: title.trim(),
          username: username || undefined,
          password: password || undefined,
          url: url || undefined,
          notes_plain: notes || undefined,
          category_id: categoryId || undefined,
          is_favorite: isFavorite,
          connection_type: (connectionType as ConnectionType) || undefined,
          connection_config: connectionConfig || undefined,
          totp_secret: totpNormalized,
          tag_ids: tagIds,
          custom_fields: customFields,
        });
      } else {
        await createCredential({
          title: title.trim(),
          username: username || undefined,
          password: password || undefined,
          url: url || undefined,
          notes_plain: notes || undefined,
          category_id: categoryId || undefined,
          is_favorite: isFavorite,
          connection_type: (connectionType as ConnectionType) || undefined,
          connection_config: connectionConfig || undefined,
          totp_secret: totpNormalized || undefined,
          tag_ids: tagIds,
          custom_fields: customFields,
        });
      }
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  function addCustomField() {
    setCustomFields([
      ...customFields,
      {
        field_name: "",
        field_value: "",
        field_type: "text",
        sort_order: customFields.length,
      },
    ]);
  }

  function removeCustomField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  function updateCustomField(
    index: number,
    field: Partial<CreateCustomFieldInput>,
  ) {
    setCustomFields(
      customFields.map((cf, i) => (i === index ? { ...cf, ...field } : cf)),
    );
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
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Credential" : "New Credential"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. GitHub, AWS Console"
            autoFocus
          />

          {/* Username */}
          <Input
            label="Username / Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="user@example.com"
          />

          {/* Password with generator */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Password
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or generate"
                className="input-base flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={generatePassword}
                title="Generate password"
              >
                <RefreshCw size={14} />
              </Button>
              {password && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(password, "password")}
                >
                  {copiedField === "password" ? (
                    <Check size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              )}
            </div>
            {/* Generator options */}
            <div className="flex items-center gap-3 text-2xs text-gray-500 pt-1">
              <label className="flex items-center gap-1">
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={genLength}
                  onChange={(e) => setGenLength(Number(e.target.value))}
                  className="w-16 h-1 accent-lockgrid-500"
                />
                <span>{genLength}</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={genUppercase}
                  onChange={(e) => setGenUppercase(e.target.checked)}
                  className="accent-lockgrid-500"
                />
                ABC
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={genNumbers}
                  onChange={(e) => setGenNumbers(e.target.checked)}
                  className="accent-lockgrid-500"
                />
                123
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={genSymbols}
                  onChange={(e) => setGenSymbols(e.target.checked)}
                  className="accent-lockgrid-500"
                />
                !@#
              </label>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* URL */}
          <Input
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-base"
            >
              <option value="">None</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Connection Type
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="input-base"
            >
              <option value="">None</option>
              <option value="web">Web</option>
              <option value="rdp">Remote Desktop (RDP)</option>
              <option value="ssh">SSH</option>
              <option value="file">Local File</option>
              <option value="command">Command</option>
            </select>
          </div>

          {/* Guided Connection Config */}
          {connectionType && (
            <ConnectionConfigEditor
              connectionType={connectionType as ConnectionType}
              value={connectionConfig}
              onChange={setConnectionConfig}
            />
          )}

          {/* TOTP Secret */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              TOTP Secret (2FA)
            </label>
            <input
              type="text"
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="Base32 secret, e.g. JBSWY3DPEHPK3PXP"
              className="input-base font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-2xs text-gray-400">
              Leave empty to disable. Codes generate every 30s locally.
            </p>
          </div>

          {/* Favorite */}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="text-gray-600 dark:text-gray-400">Mark as favorite</span>
          </label>

          {/* Tags */}
          <TagSelector selectedIds={tagIds} onChange={setTagIds} />

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="input-base resize-y text-xs"
            />
          </div>

          {/* Custom Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Custom Fields
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={addCustomField}>
                <Plus size={12} />
                Add Field
              </Button>
            </div>
            {customFields.map((cf, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={cf.field_name}
                  onChange={(e) => updateCustomField(i, { field_name: e.target.value })}
                  placeholder="Field name"
                  className="input-base flex-1 text-xs"
                />
                <input
                  type="text"
                  value={cf.field_value}
                  onChange={(e) => updateCustomField(i, { field_value: e.target.value })}
                  placeholder="Value"
                  className="input-base flex-1 text-xs"
                />
                <select
                  value={cf.field_type}
                  onChange={(e) => updateCustomField(i, { field_type: e.target.value as any })}
                  className="input-base w-24 text-xs"
                >
                  <option value="text">Text</option>
                  <option value="password">Secret</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border dark:border-border-dark">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
