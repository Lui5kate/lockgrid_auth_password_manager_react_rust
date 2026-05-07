import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Sun, Moon, Monitor, Download, Upload, Shield } from "lucide-react";
import { Button } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { invoke } from "@tauri-apps/api/core";

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const {
    autoLockMinutes,
    clipboardClearSeconds,
    fetchSettings,
    saveSetting,
  } = useSettingsStore();
  const setupPin = useAuthStore((s) => s.setupPin);
  const [pinSetup, setPinSetup] = useState("");
  const [pinMessage, setPinMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSetPin() {
    if (pinSetup.length < 4) {
      setPinMessage("PIN must be at least 4 digits");
      return;
    }
    try {
      await setupPin(pinSetup);
      setPinMessage("PIN set successfully!");
      setPinSetup("");
    } catch (e) {
      setPinMessage(String(e));
    }
  }

  async function handleExportBackup() {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: "lockgrid-backup.lgbk",
        filters: [{ name: "LockGrid Backup", extensions: ["lgbk"] }],
      });
      if (path) {
        const password = prompt("Enter a password for the backup:");
        if (password) {
          await invoke("export_backup", { path, password });
          alert("Backup exported successfully!");
        }
      }
    } catch (e) {
      alert("Backup failed: " + String(e));
    }
  }

  async function handleImportBackup() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "LockGrid Backup", extensions: ["lgbk"] }],
      });
      if (path) {
        const password = prompt("Enter the backup password:");
        if (password) {
          const result: {
            credentials_imported: number;
            credentials_skipped: number;
            categories_imported: number;
            tags_imported: number;
          } = await invoke("import_backup", { path, password });
          alert(
            `Backup imported:\n` +
              `• ${result.credentials_imported} credentials\n` +
              `• ${result.categories_imported} categories\n` +
              `• ${result.tags_imported} tags\n` +
              (result.credentials_skipped > 0
                ? `• ${result.credentials_skipped} credentials skipped (already exist)`
                : ""),
          );
        }
      }
    } catch (e) {
      alert("Import failed: " + String(e));
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md max-h-[80vh] bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Theme */}
          <Section title="Appearance">
            <div className="flex gap-2">
              <ThemeButton
                icon={<Sun size={16} />}
                label="Light"
                active={theme === "light"}
                onClick={() => setTheme("light")}
              />
              <ThemeButton
                icon={<Moon size={16} />}
                label="Dark"
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
              />
              <ThemeButton
                icon={<Monitor size={16} />}
                label="System"
                active={theme === "system"}
                onClick={() => setTheme("system")}
              />
            </div>
          </Section>

          {/* Security */}
          <Section title="Security">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-lock after inactivity (minutes)
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={autoLockMinutes}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      saveSetting("auto_lock_minutes", String(v));
                    }}
                    className="flex-1 accent-lockgrid-500"
                  />
                  <span className="text-xs font-mono w-8 text-right">
                    {autoLockMinutes}m
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Clear clipboard after (seconds)
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={clipboardClearSeconds}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      saveSetting("clipboard_clear_seconds", String(v));
                    }}
                    className="flex-1 accent-lockgrid-500"
                  />
                  <span className="text-xs font-mono w-8 text-right">
                    {clipboardClearSeconds}s
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Quick Unlock PIN
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="password"
                    value={pinSetup}
                    onChange={(e) => setPinSetup(e.target.value.replace(/\D/g, ""))}
                    placeholder="4-8 digit PIN"
                    maxLength={8}
                    className="input-base flex-1 text-center tracking-widest font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSetPin}
                    disabled={pinSetup.length < 4}
                  >
                    <Shield size={14} />
                    Set
                  </Button>
                </div>
                {pinMessage && (
                  <p className={`text-xs mt-1 ${pinMessage.includes("success") ? "text-green-500" : "text-red-500"}`}>
                    {pinMessage}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Backup */}
          <Section title="Backup & Restore">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleExportBackup}
              >
                <Download size={14} />
                Export Backup
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleImportBackup}
              >
                <Upload size={14} />
                Import Backup
              </Button>
            </div>
          </Section>

          {/* About */}
          <Section title="About">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                LockGrid Auth v0.1.0
              </p>
              <p>Encryption: AES-256-GCM + SQLCipher</p>
              <p>Key derivation: Argon2id (64 MiB, 3 iterations)</p>
              <p>All data stored locally. Nothing leaves your device.</p>
            </div>
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ThemeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
        active
          ? "border-lockgrid-500 bg-lockgrid-50 dark:bg-lockgrid-900/20 text-lockgrid-600 dark:text-lockgrid-400"
          : "border-transparent bg-gray-50 dark:bg-surface-dark-secondary text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary"
      }`}
    >
      {icon}
      <span className="text-2xs font-medium">{label}</span>
    </button>
  );
}
