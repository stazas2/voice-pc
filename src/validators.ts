import { z } from 'zod';

export const commandSchema = z.object({
  command: z.enum(['open_notepad', 'open_chrome', 'shutdown_now', 'sleep_now', 'open_app', 'say_ok']),
  url: z.string().url().optional(),
  alias: z.string().min(1).optional(),
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