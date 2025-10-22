import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from './types';

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'actions.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

export class Logger {
  private metrics = {
    totalRequests: 0,
    successfulCommands: 0,
    failedCommands: 0,
    responseTimes: [] as number[],
    commandCounts: new Map<string, number>(),
    lastCommandTime: 0
  };

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
    
    // Update metrics
    this.metrics.totalRequests++;
    
    if (entry.result === 'success') {
      this.metrics.successfulCommands++;
    } else if (entry.result === 'error') {
      this.metrics.failedCommands++;
    }

    // Track command counts
    if (entry.command) {
      const currentCount = this.metrics.commandCounts.get(entry.command) || 0;
      this.metrics.commandCounts.set(entry.command, currentCount + 1);
    }

    // Track response times (keep only last 100 for memory efficiency)
    if (typeof entry.payload === 'object' && entry.payload?.responseTime) {
      this.metrics.responseTimes.push(entry.payload.responseTime);
      if (this.metrics.responseTimes.length > 100) {
        this.metrics.responseTimes.shift();
      }
    }

    this.metrics.lastCommandTime = Date.now();
    
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

  getMetrics() {
    const responseTimes = this.metrics.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Calculate P95
    let p95ResponseTime = 0;
    if (responseTimes.length > 0) {
      const sorted = [...responseTimes].sort((a, b) => a - b);
      const p95Index = Math.ceil(sorted.length * 0.95) - 1;
      p95ResponseTime = sorted[p95Index] || 0;
    }

    // Get top 5 commands
    const topCommands = Array.from(this.metrics.commandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([command, count]) => ({ command, count }));

    return {
      totalRequests: this.metrics.totalRequests,
      successfulCommands: this.metrics.successfulCommands,
      failedCommands: this.metrics.failedCommands,
      avgResponseTime,
      p95ResponseTime: Math.round(p95ResponseTime),
      lastCommandTime: this.metrics.lastCommandTime,
      topCommands
    };
  }

  info(message: string, data?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data
    };

    // Не выводим в консоль, чтобы не портить JSON-ответы для облачной функции
    // Все логи пишутся только в файл

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write info log:', error);
    }
  }

  warn(message: string, data?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data: data?.message || data
    };

    // Не выводим в консоль, чтобы не портить JSON-ответы для облачной функции

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (writeError) {
      console.error('Failed to write warn log:', writeError);
    }
  }

  error(message: string, error?: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message || error
    };

    // Не выводим в консоль, чтобы не портить JSON-ответы для облачной функции

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }
  }
}

export const logger = new Logger();