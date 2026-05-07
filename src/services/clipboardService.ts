import { invoke } from "@tauri-apps/api/core";

export const clipboardService = {
  copyAndClear(text: string, clearAfterSeconds: number = 15): Promise<void> {
    return invoke("copy_and_clear", {
      text,
      clearAfterSeconds,
    });
  },

  clear(): Promise<void> {
    return invoke("clear_clipboard");
  },
};
