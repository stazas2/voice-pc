import { z } from 'zod';

export const commandSchema = z.object({
  command: z.enum([
    'open_notepad', 'open_chrome', 'shutdown_now', 'shutdown_delayed', 'shutdown_cancel', 'sleep_now', 'open_app', 'say_ok',
    // Media commands
    'media_pause', 'media_play', 'media_next', 'media_previous', 'media_stop',
    'volume_up', 'volume_down', 'volume_mute', 'volume_unmute', 'volume_set',
    // File operations
    'open_downloads', 'open_documents', 'open_desktop', 'open_latest_download',
    // System information
    'system_cpu', 'system_memory', 'system_disk', 'system_ip', 'system_info',
    // Windows management
    'minimize_all', 'show_desktop', 'lock_screen', 'empty_recycle_bin', 'volume_mute', 'volume_unmute', 'close_window', 'focus_window', 'maximize_window',
    // Screenshot and recording
    'screenshot', 'screen_record',
    // Notion integration
    'notion_today_tasks', 'notion_upcoming_events', 'notion_create_task',
    // Chrome control
    'chrome_new_tab', 'chrome_close_tab', 'chrome_refresh', 'chrome_fullscreen_media', 'chrome_fullscreen_browser', 'chrome_media_pause',
    // Chrome CDP advanced
    'chrome_scroll_down', 'chrome_scroll_up', 'chrome_click_link', 'chrome_find_text',
    // Profile system
    'activate_profile', 'tile_windows',
    // Context commands
    'repeat_last', 'close_last_opened', 'cancel_last',
    // Full disk search
    'full_disk_search',
    // Movie search
    'find_movie'
  ]),
  url: z.string().url().optional(),
  alias: z.string().min(1).optional(),
  duration: z.number().min(1).max(300).optional(), // 1-300 seconds for screen recording
  level: z.number().min(0).max(100).optional(), // 0-100 for volume_set
  delay: z.number().min(1).max(3600).optional(), // 1-3600 seconds for shutdown_delayed
  processName: z.string().min(1).optional(), // for close_window
  title: z.string().min(1).optional(), // for notion_create_task
  dueDate: z.string().optional(), // for notion_create_task
  text: z.string().min(1).optional(), // for chrome_find_text, chrome_click_link
  profileName: z.string().min(1).optional(), // for activate_profile
  layout: z.enum(['split', 'quad', 'triple']).optional(), // for tile_windows
  appName: z.string().min(1).optional(), // for full_disk_search
  movieTitle: z.string().min(1).optional(), // for find_movie
  movieYear: z.number().min(1900).max(2030).optional(), // for find_movie
  movieType: z.enum(['movie', 'series']).optional() // for find_movie
}).strict();

export const validateCommand = (data: unknown) => {
  return commandSchema.safeParse(data);
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const sanitizeAlias = (alias: string): string => {
  return alias.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
};