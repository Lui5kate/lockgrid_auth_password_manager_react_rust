import { invoke } from "@tauri-apps/api/core";
import type {
  Credential,
  CredentialSummary,
  CreateCredentialInput,
  UpdateCredentialInput,
  CredentialFilter,
  HistoryEntry,
} from "@/types/credential";
import type { PasswordGenConfig } from "@/types/settings";

export const credentialService = {
  create(input: CreateCredentialInput): Promise<Credential> {
    return invoke("create_credential", { input });
  },

  get(id: string): Promise<Credential> {
    return invoke("get_credential", { id });
  },

  list(filter: CredentialFilter): Promise<CredentialSummary[]> {
    return invoke("list_credentials", { filter });
  },

  update(id: string, input: UpdateCredentialInput): Promise<Credential> {
    return invoke("update_credential", { id, input });
  },

  delete(id: string): Promise<void> {
    return invoke("delete_credential", { id });
  },

  getHistory(credentialId: string): Promise<HistoryEntry[]> {
    return invoke("get_credential_history", { credentialId });
  },

  generatePassword(config: PasswordGenConfig): Promise<string> {
    return invoke("generate_password", { config });
  },

  calculateStrength(password: string): Promise<number> {
    return invoke("calculate_password_strength", { password });
  },
};
