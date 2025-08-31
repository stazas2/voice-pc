import fs from 'fs';
import path from 'path';

export interface ParsedCommand {
  phrase: string;
  command: string;
  parameters?: { [key: string]: any };
  category: string;
  description?: string;
}

export interface CommandCategory {
  name: string;
  description: string;
  commands: ParsedCommand[];
}

export class CommandMappingParser {
  private mappingsPath: string;
  private backupPath: string;

  constructor() {
    this.mappingsPath = path.join(__dirname, '..', 'cloud', 'config', 'command-mappings.js');
    this.backupPath = path.join(__dirname, '..', 'cloud', 'config', 'command-mappings.backup.js');
  }

  // Parse command-mappings.js file into structured format
  parseCommandMappings(): CommandCategory[] {
    try {
      const fileContent = fs.readFileSync(this.mappingsPath, 'utf8');
      
      // Extract COMMAND_MAPPINGS object using regex
      const mappingsMatch = fileContent.match(/const COMMAND_MAPPINGS = \{([\s\S]*?)\};/);
      if (!mappingsMatch) {
        throw new Error('Could not find COMMAND_MAPPINGS object in file');
      }

      const mappingsText = mappingsMatch[1];
      
      // Parse comments to identify categories
      const categories = this.extractCategories(fileContent, mappingsText);
      
      return categories;
    } catch (error) {
      console.error('Error parsing command mappings:', error);
      throw error;
    }
  }

  private extractCategories(fullContent: string, mappingsText: string): CommandCategory[] {
    const categories: CommandCategory[] = [];
    const lines = fullContent.split('\n');
    
    let currentCategory = 'General';
    let currentDescription = '';
    
    const mappingsStart = fullContent.indexOf('const COMMAND_MAPPINGS = {');
    const mappingsEnd = fullContent.indexOf('};', mappingsStart);
    const mappingsLines = fullContent.substring(mappingsStart, mappingsEnd).split('\n');
    
    const commands: ParsedCommand[] = [];
    
    for (const line of mappingsLines) {
      const trimmed = line.trim();
      
      // Detect category comments - more flexible patterns
      if (trimmed.startsWith('//')) {
        // Large category headers with decorations
        if (trimmed.includes('===') || trimmed.includes('🚀') || trimmed.includes('WINDOWS')) {
          const categoryMatch = trimmed.match(/\/\/\s*[=🚀\s]*(.+?)(?:\s*===|\s*🚀|\s*\(|$)/);
          if (categoryMatch) {
            // Save previous category if it has commands
            if (commands.length > 0) {
              categories.push({
                name: currentCategory,
                description: currentDescription,
                commands: [...commands]
              });
              commands.length = 0;
            }
            
            currentCategory = categoryMatch[1].trim();
            currentDescription = this.getCategoryDescription(currentCategory);
          }
        }
        // Simple category comments (single line descriptions)
        else if (!trimmed.includes('Load environment') && !trimmed.includes('Track server') && 
                 trimmed.length > 5 && !trimmed.includes('Apply') && !trimmed.includes('Routes')) {
          // This might be a category name if it's not too long and doesn't look like a regular comment
          const simpleCategory = trimmed.replace('//', '').trim();
          if (simpleCategory.length < 50 && !simpleCategory.includes('command') && !simpleCategory.includes('endpoint')) {
            // Save previous category if it has commands
            if (commands.length > 0) {
              categories.push({
                name: currentCategory,
                description: currentDescription,
                commands: [...commands]
              });
              commands.length = 0;
            }
            
            currentCategory = simpleCategory;
            currentDescription = this.getCategoryDescription(currentCategory);
          }
        }
      }
      
      // Detect regular comments for descriptions
      else if (trimmed.startsWith('//') && !trimmed.includes('===')) {
        currentDescription = trimmed.replace('//', '').trim();
      }
      
      // Parse command entries
      else if (trimmed.includes(':') && trimmed.includes('command:')) {
        const command = this.parseCommandLine(trimmed);
        if (command) {
          command.category = currentCategory;
          commands.push(command);
        }
      }
    }
    
    // Add final category
    if (commands.length > 0) {
      categories.push({
        name: currentCategory,
        description: currentDescription,
        commands: [...commands]
      });
    }
    
    return categories;
  }

  private parseCommandLine(line: string): ParsedCommand | null {
    try {
      // Extract phrase (key) and command object - more flexible regex
      const match = line.match(/['"`]([^'"`]+)['"`]\s*:\s*\{([^}]+)\}/);
      if (!match) return null;
      
      const phrase = match[1];
      const objectContent = match[2];
      
      // Extract command
      const commandMatch = objectContent.match(/command:\s*['"`]([^'"`]+)['"`]/);
      if (!commandMatch) return null;
      const command = commandMatch[1];
      
      // Parse parameters more carefully
      const parameters: { [key: string]: any } = {};
      
      // Extract string parameters
      const stringParams = objectContent.match(/(\w+):\s*['"`]([^'"`]+)['"`]/g);
      if (stringParams) {
        stringParams.forEach(param => {
          const paramMatch = param.match(/(\w+):\s*['"`]([^'"`]+)['"`]/);
          if (paramMatch && paramMatch[1] !== 'command') {
            parameters[paramMatch[1]] = paramMatch[2];
          }
        });
      }
      
      // Extract numeric parameters
      const numericParams = objectContent.match(/(\w+):\s*(\d+)/g);
      if (numericParams) {
        numericParams.forEach(param => {
          const paramMatch = param.match(/(\w+):\s*(\d+)/);
          if (paramMatch) {
            parameters[paramMatch[1]] = parseInt(paramMatch[2]);
          }
        });
      }

      return {
        phrase,
        command,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        category: 'General',
        description: this.getCommandDescription(command)
      };
    } catch (error) {
      console.error('Error parsing command line:', line, error);
      return null;
    }
  }

  private getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      'General': 'Общие команды и активация навыка',
      'Блокнот': 'Команды для работы с блокнотом',
      'Браузер': 'Команды для открытия веб-сайтов',
      'Выключение и сон': 'Управление питанием компьютера',
      'Приложения': 'Запуск программ по алиасам',
      'Медиа управление': 'Управление воспроизведением медиа',
      'Файловые операции': 'Работа с файлами и папками',
      'Системная информация': 'Получение информации о системе',
      'Скриншоты и запись': 'Создание скриншотов и запись экрана',
      'WINDOWS УПРАВЛЕНИЕ': 'Управление окнами через Windows API',
      'Минимизация окон': 'Сворачивание всех окон',
      'Показ рабочего стола': 'Показать рабочий стол',
      'Блокировка экрана': 'Блокировка компьютера',
      'Очистка корзины': 'Очистка корзины Windows',
      'Точное управление громкостью': 'Установка точного уровня громкости',
      'Закрытие конкретных окон': 'Закрытие определенных приложений',
      'Фокусировка на конкретных окнах': 'Переключение между приложениями',
      'Максимизация конкретных окон': 'Разворот окон на весь экран'
    };
    
    return descriptions[category] || category;
  }

  private getCommandDescription(command: string): string {
    const descriptions: { [key: string]: string } = {
      'say_ok': 'Ответить "OK" для активации',
      'open_notepad': 'Открыть блокнот Windows',
      'open_chrome': 'Открыть Chrome с URL',
      'shutdown_now': 'Выключить компьютер',
      'sleep_now': 'Перевести в спящий режим',
      'open_app': 'Запустить приложение по алиасу',
      'media_pause': 'Поставить на паузу',
      'media_play': 'Продолжить воспроизведение',
      'media_next': 'Следующий трек',
      'media_previous': 'Предыдущий трек',
      'media_stop': 'Остановить воспроизведение',
      'volume_up': 'Увеличить громкость',
      'volume_down': 'Уменьшить громкость',
      'volume_mute': 'Выключить звук',
      'volume_unmute': 'Включить звук',
      'volume_set': 'Установить точный уровень громкости',
      'open_downloads': 'Открыть папку загрузок',
      'open_documents': 'Открыть папку документов',
      'open_desktop': 'Открыть рабочий стол',
      'open_latest_download': 'Открыть последний загруженный файл',
      'system_cpu': 'Показать загрузку CPU',
      'system_disk': 'Показать свободное место на диске',
      'system_memory': 'Показать использование памяти',
      'system_ip': 'Показать IP адрес',
      'system_info': 'Системная информация',
      'screenshot': 'Сделать скриншот',
      'screen_record': 'Записать экран',
      'minimize_all': 'Свернуть все окна',
      'show_desktop': 'Показать рабочий стол',
      'lock_screen': 'Заблокировать экран',
      'empty_recycle_bin': 'Очистить корзину',
      'close_window': 'Закрыть окно приложения',
      'focus_window': 'Переключиться на приложение',
      'maximize_window': 'Развернуть окно'
    };
    
    return descriptions[command] || command;
  }

  // Save updated commands back to JS file
  async saveCommandMappings(categories: CommandCategory[]): Promise<void> {
    try {
      // Create backup first
      const originalContent = fs.readFileSync(this.mappingsPath, 'utf8');
      fs.writeFileSync(this.backupPath, originalContent);
      
      // Generate new file content
      const newContent = this.generateMappingsFile(categories);
      
      // Write to file
      fs.writeFileSync(this.mappingsPath, newContent);
      
      console.log('Command mappings saved successfully');
    } catch (error) {
      console.error('Error saving command mappings:', error);
      throw error;
    }
  }

  private generateMappingsFile(categories: CommandCategory[]): string {
    const header = `// Маппинг команд Алисы на API команды
const COMMAND_MAPPINGS = {`;
    
    const footer = `};

module.exports = { COMMAND_MAPPINGS };`;
    
    let mappingsContent = '';
    
    for (const category of categories) {
      // Add category header
      mappingsContent += `  // ${category.name}\n`;
      if (category.description && category.description !== category.name) {
        mappingsContent += `  // ${category.description}\n`;
      }
      
      // Add commands
      for (const cmd of category.commands) {
        const params = cmd.parameters ? this.formatParameters(cmd.parameters) : '';
        mappingsContent += `  '${cmd.phrase}': { command: '${cmd.command}'${params} },\n`;
      }
      
      mappingsContent += '\n';
    }
    
    return header + '\n' + mappingsContent + footer;
  }

  private formatParameters(params: { [key: string]: any }): string {
    let result = '';
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        result += `, ${key}: '${value}'`;
      } else {
        result += `, ${key}: ${value}`;
      }
    }
    
    return result;
  }

  // Validate commands for duplicates and conflicts
  validateCommands(categories: CommandCategory[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const phrases = new Set<string>();
    
    for (const category of categories) {
      for (const cmd of category.commands) {
        // Check for duplicate phrases
        if (phrases.has(cmd.phrase)) {
          errors.push(`Duplicate phrase found: "${cmd.phrase}"`);
        } else {
          phrases.add(cmd.phrase);
        }
        
        // Check for empty phrases
        if (!cmd.phrase.trim()) {
          errors.push('Empty phrase found');
        }
        
        // Check for empty commands
        if (!cmd.command.trim()) {
          errors.push(`Empty command for phrase: "${cmd.phrase}"`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const commandParser = new CommandMappingParser();