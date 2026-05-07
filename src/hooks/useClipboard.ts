import { useState, useCallback } from "react";
import { clipboardService } from "@/services/clipboardService";
import { useSettingsStore } from "@/features/settings/stores/settingsStore";

export function useClipboard(clearAfterSecondsOverride?: number) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fallback = useSettingsStore((s) => s.clipboardClearSeconds);
  const clearAfterSeconds = clearAfterSecondsOverride ?? fallback;

  const copy = useCallback(
    async (text: string, fieldName?: string) => {
      try {
        await clipboardService.copyAndClear(text, clearAfterSeconds);
        setCopiedField(fieldName ?? "value");
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error("Clipboard copy failed:", e);
      }
    },
    [clearAfterSeconds],
  );

  return { copy, copiedField };
}
