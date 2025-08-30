export interface CommandRequest {
  command: 'open_notepad' | 'open_chrome' | 'shutdown_now' | 'sleep_now' | 'open_app' | 'say_ok' |
    // Media commands
    'media_pause' | 'media_play' | 'media_next' | 'media_previous' | 'media_stop' |
    'volume_up' | 'volume_down' | 'volume_mute' | 'volume_unmute' | 'volume_set' |
    // File operations
    'open_downloads' | 'open_documents' | 'open_desktop' | 'open_latest_download' |
    // System information
    'system_cpu' | 'system_memory' | 'system_disk' | 'system_ip' | 'system_info' |
    // Windows management
    'minimize_all' | 'show_desktop' | 'lock_screen' | 'empty_recycle_bin' | 'close_window' |
    // Screenshot and recording
    'screenshot' | 'screen_record';
  url?: string;
  alias?: string;
  duration?: number; // for screen recording
  level?: number; // for volume_set (0-100)
  processName?: string; // for close_window
}

export interface ApiResponse {
  ok: boolean;
  action?: string;
  details?: Record<string, any>;
  data?: Record<string, any>; // for system information responses
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  uptime: number;
  ts: string;
}

export interface LogEntry {
  timestamp: string;
  ip: string;
  command: string;
  payload: any;
  result: 'success' | 'error';
  error?: string;
}

export interface RateLimitEntry {
  ip: string;
  count: number;
  resetTime: number;
}