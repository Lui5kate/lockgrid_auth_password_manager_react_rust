import { invoke } from "@tauri-apps/api/core";
import type { AuthStatus } from "@/types/settings";

export const authService = {
  getAuthStatus(): Promise<AuthStatus> {
    return invoke("get_auth_status");
  },

  setupMasterPassword(password: string): Promise<void> {
    return invoke("setup_master_password", { password });
  },

  unlock(password: string): Promise<void> {
    return invoke("unlock", { password });
  },

  lockApp(): Promise<void> {
    return invoke("lock_app");
  },

  setupPin(pin: string): Promise<void> {
    return invoke("setup_pin", { pin });
  },

  verifyPin(pin: string): Promise<void> {
    return invoke("verify_pin", { pin });
  },
};
