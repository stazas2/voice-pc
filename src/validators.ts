import { z } from 'zod';

export const commandSchema = z.object({
  command: z.enum([
    'open_notepad', 'open_chrome', 'shutdown_now', 'sleep_now', 'open_app', 'say_ok',
    // Media commands
    'media_pause', 'media_play', 'media_next', 'media_previous', 'media_stop',
    'volume_up', 'volume_down', 'volume_mute', 'volume_unmute',
    // File operations
    'open_downloads', 'open_documents', 'open_desktop', 'open_latest_download',
    // System information
    'system_cpu', 'system_memory', 'system_disk', 'system_ip', 'system_info',
    // Windows management
    'minimize_all', 'show_desktop', 'lock_screen', 'empty_recycle_bin',
    // Screenshot and recording
    'screenshot', 'screen_record'
  ]),
  url: z.string().url().optional(),
  alias: z.string().min(1).optional(),
  duration: z.number().min(1).max(300).optional(), // 1-300 seconds for screen recording
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