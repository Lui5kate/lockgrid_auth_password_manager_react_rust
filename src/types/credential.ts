export interface Credential {
  id: string;
  title: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes_plain: string | null;
  category_id: string | null;
  is_favorite: boolean;
  icon_url: string | null;
  connection_type: ConnectionType | null;
  connection_config: string | null;
  totp_secret: string | null;
  sort_order: number;
  tags: Tag[];
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export interface CredentialSummary {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  category_id: string | null;
  is_favorite: boolean;
  icon_url: string | null;
  connection_type: ConnectionType | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface CreateCredentialInput {
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes_plain?: string;
  category_id?: string;
  is_favorite: boolean;
  icon_url?: string;
  connection_type?: ConnectionType;
  connection_config?: string;
  totp_secret?: string;
  tag_ids: string[];
  custom_fields: CreateCustomFieldInput[];
}

export interface UpdateCredentialInput {
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  notes_plain?: string;
  category_id?: string;
  is_favorite?: boolean;
  icon_url?: string;
  connection_type?: ConnectionType;
  connection_config?: string;
  totp_secret?: string;
  tag_ids?: string[];
  custom_fields?: CreateCustomFieldInput[];
}

export interface CredentialFilter {
  category_id?: string;
  tag_id?: string;
  favorites_only: boolean;
  search_query?: string;
}

export type ConnectionType = "web" | "rdp" | "ssh" | "file" | "command";

export interface CustomField {
  id: string;
  field_name: string;
  field_value: string;
  field_type: FieldType;
  sort_order: number;
}

export interface CreateCustomFieldInput {
  field_name: string;
  field_value: string;
  field_type: FieldType;
  sort_order: number;
}

export type FieldType = "text" | "password" | "url" | "email" | "textarea";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface HistoryEntry {
  id: string;
  credential_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface ConnectionConfig {
  path?: string;
  command?: string;
  args?: string[];
  steps?: ConnectionStep[];
}

export interface ConnectionStep {
  order: number;
  description: string;
  screenshot_id?: string;
}
