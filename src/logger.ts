import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from './types';

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'actions.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

export class Logger {
  constructor() {
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  private rotateLog(): void {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const backupFile = `${LOG_FILE}.1`;
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
        fs.renameSync(LOG_FILE, backupFile);
      }
    }
  }

  logAction(entry: LogEntry): void {
    this.rotateLog();
    
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString()
    }) + '\n';

    try {
      fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, data?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data
    };
    
    console.log(`[INFO] ${entry.timestamp}: ${message}`, data ? JSON.stringify(data) : '');
    
    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write info log:', error);
    }
  }

  error(message: string, error?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message || error
    };
    
    console.error(`[ERROR] ${entry.timestamp}: ${message}`, error);
    
    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }
  }
}

export const logger = new Logger();