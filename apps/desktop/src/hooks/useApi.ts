import { invoke } from "@tauri-apps/api/core";

// Create an event target for auth errors
export const authEvents = new EventTarget();

export async function apiRequest(method: string, path: string, body?: any) {
  try {
    const res = await invoke("api_request", { method, path, body: body || null });
    return res;
  } catch (err: any) {
    if (typeof err === 'string' && (err.includes('HTTP 401') || err.includes('HTTP 403'))) {
      authEvents.dispatchEvent(new Event('unauthorized'));
    }
    throw err;
  }
}

export async function getConfig() {
  return invoke("get_config");
}

export async function updateConfig(config: { api_endpoint: string; api_token: string; watch_path: string }) {
  return invoke("update_config", { config });
}

export async function getSyncStatus() {
  return invoke("get_sync_status");
}

export async function getSyncLogs() {
  return invoke<any[]>("get_sync_logs");
}

export async function getOfflineQueueCount() {
  return invoke<number>("get_offline_queue_count");
}

export async function forceSync() {
  return invoke("force_sync");
}
