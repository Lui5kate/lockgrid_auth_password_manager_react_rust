import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "@/components/layout/TitleBar";
import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import { SetupScreen } from "@/features/auth/components/SetupScreen";
import { LoginScreen } from "@/features/auth/components/LoginScreen";
import { LockScreen } from "@/features/auth/components/LockScreen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useSettingsStore } from "@/features/settings/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import { useInactivityLock } from "@/hooks/useInactivityLock";
import { Spinner } from "@/components/ui";

export default function App() {
  const { status, isLoading, checkStatus } = useAuthStore();
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  useTheme();
  useInactivityLock(autoLockMinutes);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Refresh settings every time the vault is unlocked (value may have been
  // changed in a previous session or by the user just now).
  useEffect(() => {
    if (status && !status.is_locked && !status.is_first_run) {
      fetchSettings();
    }
  }, [status?.is_locked, status?.is_first_run, fetchSettings]);

  // Ctrl+L to lock (works everywhere)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        useAuthStore.getState().lock();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  let content: React.ReactNode;
  if (isLoading && !status) {
    content = (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-lockgrid-950 via-gray-900 to-gray-950">
        <Spinner size="lg" className="text-lockgrid-400" />
      </div>
    );
  } else if (status?.is_first_run) {
    content = <SetupScreen />;
  } else if (status?.is_locked) {
    content = status.has_pin ? <LockScreen /> : <LoginScreen />;
  } else {
    content = (
      <AnimatePresence mode="wait">
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full"
        >
          <ThreeColumnLayout />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-hidden">{content}</div>
    </div>
  );
}
