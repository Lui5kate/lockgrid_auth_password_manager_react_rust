import { invoke } from "@tauri-apps/api/core";
import type { Attachment } from "@/types/attachment";

export const attachmentService = {
  list(credentialId: string): Promise<Attachment[]> {
    return invoke("list_attachments", { credentialId });
  },

  upload(credentialId: string, sourcePath: string): Promise<Attachment> {
    return invoke("upload_attachment", { credentialId, sourcePath });
  },

  download(id: string, targetPath: string): Promise<void> {
    return invoke("download_attachment", { id, targetPath });
  },

  delete(id: string): Promise<void> {
    return invoke("delete_attachment", { id });
  },
};
