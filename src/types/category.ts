export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}
