import { spawn } from 'child_process';
import { logger } from './logger';
import { chromeCDP } from './chrome-cdp';

interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfileApp {
  processName: string;
  alias?: string;
  url?: string;
  position: WindowPosition;
}

interface Profile {
  name: string;
  description: string;
  apps: ProfileApp[];
}

class ProfilesManager {
  private profiles: Profile[] = [
    {
      name: 'work',
      description: 'Рабочий профиль - VS Code слева, браузер справа',
      apps: [
        {
          processName: 'Code',
          alias: 'vscode',
          position: { x: 0, y: 0, width: 960, height: 1080 }
        },
        {
          processName: 'chrome',
          url: 'https://github.com',
          position: { x: 960, y: 0, width: 960, height: 1080 }
        }
      ]
    },
    {
      name: 'chill',
      description: 'Чилловый профиль - YouTube на пол экрана, Discord снизу',
      apps: [
        {
          processName: 'chrome',
          url: 'https://youtube.com',
          position: { x: 0, y: 0, width: 1920, height: 720 }
        },
        {
          processName: 'Discord',
          position: { x: 0, y: 720, width: 1920, height: 360 }
        }
      ]
    },
    {
      name: 'media',
      description: 'Медиа профиль - плеер на весь экран, управление снизу',
      apps: [
        {
          processName: 'chrome',
          url: 'https://music.yandex.ru',
          position: { x: 0, y: 0, width: 1920, height: 900 }
        },
        {
          processName: 'notepad',
          position: { x: 0, y: 900, width: 1920, height: 180 }
        }
      ]
    }
  ];

  private async executeCommand(command: string, args: string[] = [], timeout = 5000): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ success: false, error: `Command timed out after ${timeout}ms` });
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('exit', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: code !== 0 ? stderr.trim() : undefined
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({ success: false, error: error.message });
      });
    });
  }

  private async setWindowPosition(processName: string, position: WindowPosition): Promise<boolean> {
    try {
      // PowerShell скрипт для позиционирования окна
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -TypeDefinition '
          using System;
          using System.Diagnostics;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
        '
        
        $processes = Get-Process -Name "*${processName}*" -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
          if ($process.MainWindowHandle -ne [System.IntPtr]::Zero) {
            [Win32]::SetWindowPos($process.MainWindowHandle, [IntPtr]::Zero, ${position.x}, ${position.y}, ${position.width}, ${position.height}, 0x0040)
            [Win32]::ShowWindow($process.MainWindowHandle, 1)
            break
          }
        }
      `;

      const result = await this.executeCommand('powershell', ['-Command', script], 3000);
      return result.success;
    } catch (error) {
      logger.error(`Failed to set window position for ${processName}:`, error);
      return false;
    }
  }

  private async startApplication(app: ProfileApp): Promise<boolean> {
    try {
      let command = '';
      let args: string[] = [];

      if (app.alias) {
        // Используем алиас из apps.json
        command = 'start';
        args = ['""', app.alias];
      } else if (app.processName === 'chrome' && app.url) {
        // Запускаем Chrome с URL
        command = 'start';
        args = ['""', 'chrome', app.url];
      } else {
        // Пытаемся запустить по имени процесса
        command = 'start';
        args = ['""', app.processName];
      }

      const result = await this.executeCommand(command, args, 5000);
      
      if (result.success) {
        // Даём время приложению запуститься
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Устанавливаем позицию окна
        await this.setWindowPosition(app.processName, app.position);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to start application ${app.processName}:`, error);
      return false;
    }
  }

  async activateProfile(profileName: string): Promise<{ success: boolean; message: string; profile?: Profile }> {
    const profile = this.profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
    
    if (!profile) {
      return {
        success: false,
        message: `Профиль "${profileName}" не найден. Доступные: ${this.profiles.map(p => p.name).join(', ')}`
      };
    }

    try {
      logger.info(`Activating profile: ${profile.name}`);
      
      // Запускаем все приложения профиля
      const startResults = await Promise.all(
        profile.apps.map(app => this.startApplication(app))
      );
      
      const successCount = startResults.filter(Boolean).length;
      const totalCount = profile.apps.length;
      
      if (successCount === totalCount) {
        return {
          success: true,
          message: `Профиль "${profile.name}" активирован! Все ${totalCount} приложений запущены.`,
          profile
        };
      } else {
        return {
          success: false,
          message: `Профиль "${profile.name}" частично активирован. Запущено ${successCount} из ${totalCount} приложений.`,
          profile
        };
      }
    } catch (error) {
      logger.error(`Failed to activate profile ${profileName}:`, error);
      return {
        success: false,
        message: `Ошибка активации профиля: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async tileWindows(layout: 'split' | 'quad' | 'triple' = 'split'): Promise<{ success: boolean; message: string }> {
    try {
      let script = '';
      
      switch (layout) {
        case 'split':
          // Разделяем экран пополам
          script = `
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -TypeDefinition '
              using System;
              using System.Diagnostics;
              using System.Runtime.InteropServices;
              public class Win32 {
                [DllImport("user32.dll")]
                public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                [DllImport("user32.dll")]
                public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
              }
            '
            
            $screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
            $screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
            $halfWidth = $screenWidth / 2
            
            $windows = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 2
            
            for ($i = 0; $i -lt $windows.Count -and $i -lt 2; $i++) {
              $x = $i * $halfWidth
              [Win32]::SetWindowPos($windows[$i].MainWindowHandle, [IntPtr]::Zero, $x, 0, $halfWidth, $screenHeight, 0x0040)
              [Win32]::ShowWindow($windows[$i].MainWindowHandle, 3)
            }
          `;
          break;
          
        case 'quad':
          // Разделяем экран на 4 части
          script = `
            $screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
            $screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
            $halfWidth = $screenWidth / 2
            $halfHeight = $screenHeight / 2
            
            $windows = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 4
            $positions = @(
              @{x=0; y=0},
              @{x=$halfWidth; y=0},
              @{x=0; y=$halfHeight},
              @{x=$halfWidth; y=$halfHeight}
            )
            
            for ($i = 0; $i -lt $windows.Count -and $i -lt 4; $i++) {
              [Win32]::SetWindowPos($windows[$i].MainWindowHandle, [IntPtr]::Zero, $positions[$i].x, $positions[$i].y, $halfWidth, $halfHeight, 0x0040)
            }
          `;
          break;
      }

      const result = await this.executeCommand('powershell', ['-Command', script], 5000);
      
      if (result.success) {
        return {
          success: true,
          message: `Окна организованы в режиме "${layout}"`
        };
      } else {
        return {
          success: false,
          message: `Не удалось организовать окна: ${result.error || 'Unknown error'}`
        };
      }
    } catch (error) {
      logger.error('Failed to tile windows:', error);
      return {
        success: false,
        message: `Ошибка организации окон: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  getAvailableProfiles(): Profile[] {
    return this.profiles;
  }
}

export const profilesManager = new ProfilesManager();