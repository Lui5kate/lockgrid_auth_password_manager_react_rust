import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Shield } from "lucide-react";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="drag-region flex items-center justify-between h-9 bg-surface-secondary dark:bg-surface-dark-secondary border-b border-border dark:border-border-dark px-3 select-none">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-lockgrid-600 no-drag" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tracking-wide">
          LOCKGRID AUTH
        </span>
      </div>

      <div className="flex items-center no-drag">
        <button
          onClick={() => appWindow.minimize()}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded"
          aria-label="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded"
          aria-label="Maximize"
        >
          <Square size={10} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="p-2 hover:bg-red-500 hover:text-white transition-colors rounded"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
