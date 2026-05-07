import { create } from "zustand";
import { tagService } from "@/services/tagService";
import type { Tag } from "@/types/tag";

interface TagState {
  tags: Tag[];
  isLoading: boolean;

  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string | null) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,

  fetchTags: async () => {
    try {
      set({ isLoading: true });
      const tags = await tagService.list();
      set({ tags, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createTag: async (name: string, color?: string | null) => {
    const tag = await tagService.create(name, color);
    await get().fetchTags();
    return tag;
  },

  deleteTag: async (id: string) => {
    await tagService.delete(id);
    await get().fetchTags();
  },
}));
