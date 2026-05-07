import { create } from "zustand";
import { authService } from "@/services/authService";
import type { AuthStatus } from "@/types/settings";

interface AuthState {
  status: AuthStatus | null;
  isLoading: boolean;
  error: string | null;

  checkStatus: () => Promise<void>;
  setupMasterPassword: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: null,
  isLoading: false,
  error: null,

  checkStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      const status = await authService.getAuthStatus();
      set({ status, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  setupMasterPassword: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      await authService.setupMasterPassword(password);
      set({
        status: { is_locked: false, is_first_run: false, has_pin: false },
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      throw e;
    }
  },

  unlock: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      await authService.unlock(password);
      // Re-read full status so has_pin (updated server-side during unlock) is correct.
      const fresh = await authService.getAuthStatus();
      set({ status: fresh, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      throw e;
    }
  },

  lock: async () => {
    try {
      await authService.lockApp();
      set({
        status: { ...get().status!, is_locked: true },
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setupPin: async (pin: string) => {
    try {
      set({ isLoading: true, error: null });
      await authService.setupPin(pin);
      set({
        status: { ...get().status!, has_pin: true },
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      throw e;
    }
  },

  verifyPin: async (pin: string) => {
    try {
      set({ isLoading: true, error: null });
      await authService.verifyPin(pin);
      set({
        status: { ...get().status!, is_locked: false },
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
