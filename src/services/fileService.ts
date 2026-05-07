import { invoke } from "@tauri-apps/api/core";

export const fileService = {
  openUrl(url: string): Promise<void> {
    return invoke("open_url", { url });
  },

  openFile(path: string): Promise<void> {
    return invoke("open_file", { path });
  },

  executeCommand(command: string, args: string[]): Promise<string> {
    return invoke("execute_command", { command, args });
  },

  guidedConnect(credentialId: string): Promise<void> {
    return invoke("guided_connect", { credentialId });
  },
};
