import { create } from "zustand";
import { credentialService } from "@/services/credentialService";
import type {
  Credential,
  CredentialSummary,
  CreateCredentialInput,
  UpdateCredentialInput,
  CredentialFilter,
} from "@/types/credential";

interface CredentialState {
  credentials: CredentialSummary[];
  selectedCredential: Credential | null;
  selectedId: string | null;
  filter: CredentialFilter;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;

  fetchCredentials: () => Promise<void>;
  selectCredential: (id: string | null) => Promise<void>;
  createCredential: (input: CreateCredentialInput) => Promise<Credential>;
  updateCredential: (id: string, input: UpdateCredentialInput) => Promise<Credential>;
  deleteCredential: (id: string) => Promise<void>;
  setFilter: (filter: Partial<CredentialFilter>) => void;
  clearSelection: () => void;
}

export const useCredentialStore = create<CredentialState>((set, get) => ({
  credentials: [],
  selectedCredential: null,
  selectedId: null,
  filter: { favorites_only: false },
  isLoading: false,
  isDetailLoading: false,
  error: null,

  fetchCredentials: async () => {
    try {
      set({ isLoading: true, error: null });
      const credentials = await credentialService.list(get().filter);
      set({ credentials, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  selectCredential: async (id: string | null) => {
    if (!id) {
      set({ selectedId: null, selectedCredential: null });
      return;
    }
    try {
      set({ selectedId: id, isDetailLoading: true });
      const credential = await credentialService.get(id);
      set({ selectedCredential: credential, isDetailLoading: false });
    } catch (e) {
      set({ isDetailLoading: false, error: String(e) });
    }
  },

  createCredential: async (input: CreateCredentialInput) => {
    const credential = await credentialService.create(input);
    await get().fetchCredentials();
    set({ selectedId: credential.id, selectedCredential: credential });
    return credential;
  },

  updateCredential: async (id: string, input: UpdateCredentialInput) => {
    const credential = await credentialService.update(id, input);
    await get().fetchCredentials();
    if (get().selectedId === id) {
      set({ selectedCredential: credential });
    }
    return credential;
  },

  deleteCredential: async (id: string) => {
    await credentialService.delete(id);
    if (get().selectedId === id) {
      set({ selectedId: null, selectedCredential: null });
    }
    await get().fetchCredentials();
  },

  setFilter: (filter: Partial<CredentialFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
    get().fetchCredentials();
  },

  clearSelection: () => {
    set({ selectedId: null, selectedCredential: null });
  },
}));
