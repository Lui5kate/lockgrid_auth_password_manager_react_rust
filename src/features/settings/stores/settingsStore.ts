import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface SettingsState {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  isLoaded: boolean;

  fetchSettings: () => Promise<void>;
  saveSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoLockMinutes: 5,
  clipboardClearSeconds: 15,
  isLoaded: false,

  fetchSettings: async () => {
    try {
      const settings: Record<string, string> = await invoke("get_settings");
      set({
        autoLockMinutes: parseInt(settings.auto_lock_minutes ?? "5") || 5,
        clipboardClearSeconds:
          parseInt(settings.clipboard_clear_seconds ?? "15") || 15,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  saveSetting: async (key: string, value: string) => {
    await invoke("set_setting", { key, value });
    if (key === "auto_lock_minutes") {
      set({ autoLockMinutes: parseInt(value) || 5 });
    } else if (key === "clipboard_clear_seconds") {
      set({ clipboardClearSeconds: parseInt(value) || 15 });
    }
    // Re-fetch keeps any other key we may not be tracking yet in sync
    await get().fetchSettings();
  },
}));
