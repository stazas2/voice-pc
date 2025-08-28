export interface CommandRequest {
  command: 'open_notepad' | 'open_chrome' | 'shutdown_now' | 'sleep_now' | 'open_app' | 'say_ok';
  url?: string;
  alias?: string;
}

export interface ApiResponse {
  ok: boolean;
  action?: string;
  details?: Record<string, any>;
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