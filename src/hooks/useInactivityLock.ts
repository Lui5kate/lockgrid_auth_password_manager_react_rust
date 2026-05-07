import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/stores/authStore";

export function useInactivityLock(timeoutMinutes: number = 5) {
  const lock = useAuthStore((s) => s.lock);
  const isLocked = useAuthStore((s) => s.status?.is_locked ?? true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLocked || timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock();
      }, timeoutMs);
    }

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLocked, timeoutMinutes, lock]);
}
