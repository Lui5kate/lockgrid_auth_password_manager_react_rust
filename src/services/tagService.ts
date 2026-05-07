import { invoke } from "@tauri-apps/api/core";
import type { Tag } from "@/types/tag";

export const tagService = {
  list(): Promise<Tag[]> {
    return invoke("list_tags");
  },

  create(name: string, color?: string | null): Promise<Tag> {
    return invoke("create_tag", { name, color: color ?? null });
  },

  delete(id: string): Promise<void> {
    return invoke("delete_tag", { id });
  },
};
