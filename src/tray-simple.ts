import { exec } from 'child_process';
import { logger } from './logger';

export interface TrayManager {
  show(): Promise<void>;
  updateStatus(status: 'online' | 'offline' | 'busy'): void;
  notify(message: string, type?: 'success' | 'error' | 'info'): void;
  close(): void;
}

export class WindowsTrayManager implements TrayManager {
  private currentStatus: 'online' | 'offline' | 'busy' = 'offline';

  async show(): Promise<void> {
    logger.info('Voice PC запущен с UX улучшениями');
  }

  updateStatus(status: 'online' | 'offline' | 'busy'): void {
    this.currentStatus = status;
    
    const statusMessages = {
      online: '🟢 Voice PC: Online',
      offline: '🔴 Voice PC: Offline',
      busy: '🟡 Voice PC: Busy'
    };

    logger.info(statusMessages[status]);
  }

  notify(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };

    // Windows PowerShell уведомления
    try {
      const command = `powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', 'Voice PC ${icons[type]}', 'OK', '${type === 'error' ? 'Error' : 'Information'}')" | Out-Null`;
      exec(command);
    } catch (error) {
      logger.info(`[${type.toUpperCase()}] ${message}`);
    }
  }

  close(): void {
    logger.info('Voice PC закрывается...');
  }
}

export const trayManager = new WindowsTrayManager();