import { invoke } from "@tauri-apps/api/core";
import type { Category } from "@/types/category";

export const categoryService = {
  list(): Promise<Category[]> {
    return invoke("list_categories");
  },

  create(name: string, icon: string, color: string): Promise<Category> {
    return invoke("create_category", { name, icon, color });
  },

  update(
    id: string,
    name: string,
    icon: string,
    color: string,
    sortOrder: number,
  ): Promise<void> {
    return invoke("update_category", {
      id,
      name,
      icon,
      color,
      sortOrder,
    });
  },

  delete(id: string): Promise<void> {
    return invoke("delete_category", { id });
  },
};
