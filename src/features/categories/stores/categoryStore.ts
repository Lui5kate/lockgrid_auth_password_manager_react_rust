import { create } from "zustand";
import { categoryService } from "@/services/categoryService";
import type { Category } from "@/types/category";

interface CategoryState {
  categories: Category[];
  selectedCategoryId: string | null;
  isLoading: boolean;

  fetchCategories: () => Promise<void>;
  selectCategory: (id: string | null) => void;
  createCategory: (name: string, icon: string, color: string) => Promise<Category>;
  updateCategory: (
    id: string,
    name: string,
    icon: string,
    color: string,
    sortOrder: number,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  selectedCategoryId: null,
  isLoading: false,

  fetchCategories: async () => {
    try {
      set({ isLoading: true });
      const categories = await categoryService.list();
      set({ categories, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectCategory: (id: string | null) => {
    set({ selectedCategoryId: id });
  },

  createCategory: async (name: string, icon: string, color: string) => {
    const category = await categoryService.create(name, icon, color);
    await get().fetchCategories();
    return category;
  },

  updateCategory: async (
    id: string,
    name: string,
    icon: string,
    color: string,
    sortOrder: number,
  ) => {
    await categoryService.update(id, name, icon, color, sortOrder);
    await get().fetchCategories();
  },

  deleteCategory: async (id: string) => {
    await categoryService.delete(id);
    if (get().selectedCategoryId === id) {
      set({ selectedCategoryId: null });
    }
    await get().fetchCategories();
  },
}));
