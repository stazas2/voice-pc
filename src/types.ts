export interface CommandRequest {
  command: 'open_notepad' | 'open_chrome' | 'shutdown_now' | 'shutdown_delayed' | 'shutdown_cancel' | 'sleep_now' | 'open_app' | 'say_ok' |
    // Media commands
    'media_pause' | 'media_play' | 'media_next' | 'media_previous' | 'media_stop' |
    'volume_up' | 'volume_down' | 'volume_mute' | 'volume_unmute' | 'volume_set' |
    // File operations
    'open_downloads' | 'open_documents' | 'open_desktop' | 'open_latest_download' |
    // System information
    'system_cpu' | 'system_memory' | 'system_disk' | 'system_ip' | 'system_info' |
    // Windows management
    'minimize_all' | 'show_desktop' | 'lock_screen' | 'empty_recycle_bin' | 'volume_mute' | 'volume_unmute' | 'close_window' | 'focus_window' | 'maximize_window' |
    // Screenshot and recording
    'screenshot' | 'screen_record' |
    // Notion integration
    'notion_today_tasks' | 'notion_upcoming_events' | 'notion_create_task' |
    // Chrome control
    'chrome_new_tab' | 'chrome_close_tab' | 'chrome_refresh' | 'chrome_fullscreen_media' | 'chrome_fullscreen_browser' | 'chrome_media_pause' |
    // Chrome CDP advanced
    'chrome_scroll_down' | 'chrome_scroll_up' | 'chrome_click_link' | 'chrome_find_text' |
    // Profile system
    'activate_profile' | 'tile_windows' |
    // Context commands
    'repeat_last' | 'close_last_opened' | 'cancel_last' |
    // Full disk search
    'full_disk_search' |
    // Movie search
    'find_movie';
  url?: string;
  alias?: string;
  duration?: number; // for screen recording
  level?: number; // for volume_set (0-100)
  delay?: number; // for shutdown_delayed (seconds)
  processName?: string; // for close_window
  title?: string; // for notion_create_task
  dueDate?: string; // for notion_create_task
  text?: string; // for chrome_find_text, chrome_click_link
  profileName?: string; // for activate_profile
  layout?: 'split' | 'quad' | 'triple'; // for tile_windows
  appName?: string; // for full_disk_search
  movieTitle?: string; // for find_movie
  movieYear?: number; // for find_movie
  movieType?: 'movie' | 'series'; // for find_movie
}

export interface ApiResponse {
  ok: boolean;
  action?: string;
  details?: Record<string, any>;
  data?: Record<string, any>; // for system information responses
  error?: string;
  // For confirmation flow
  needsConfirmation?: boolean;
  confirmationAction?: string;
  confirmationData?: Record<string, any>;
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