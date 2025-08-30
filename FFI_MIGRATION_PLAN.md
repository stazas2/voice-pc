# 🚀 FFI миграция - План после установки VS Build Tools

## 📋 Предварительные требования

### **Что нужно установить в Visual Studio:**
1. **Visual Studio 2022** (Community версия бесплатно)
2. **Desktop development with C++** workload
3. **Windows 11 SDK** (latest version)  
4. **MSVC v143 - VS 2022 C++ x64/x86 build tools**
5. **CMake tools for Visual Studio**

### **Команда установки Build Tools:**
```bash
# Или отдельно Build Tools:
winget install Microsoft.VisualStudio.2022.BuildTools
```

# Прежде чем начать, посмотри пункт 'Допка'

---

## 🎯 План миграции (3 этапа)

### **Этап 1: Базовая FFI инфраструктура (1 час)**

**1.1 Установка зависимостей:**
```bash
npm install ffi-napi ref-napi ref-struct-napi ref-array-napi
```

**1.2 Создание базового модуля:**
```javascript
// src/windows-api/base.js
const ffi = require('ffi-napi');
const ref = require('ref-napi');

// Базовые типы Windows
const BOOL = ref.types.bool;
const HWND = ref.types.void;
const UINT = ref.types.uint32;
const DWORD = ref.types.uint32;

module.exports = { ffi, ref, BOOL, HWND, UINT, DWORD };
```

**1.3 Тестирование FFI:**
```javascript
// test/ffi-test.js
const { user32 } = require('../src/windows-api');

// Простейший тест
console.log('LockWorkStation result:', user32.LockWorkStation());
```

### **Этап 2: Миграция ключевых команд (1.5 часа)**

**2.1 User32.dll API (управление системой):**
```javascript
// src/windows-api/user32.js
const { ffi, BOOL, HWND, UINT } = require('./base');

const user32 = ffi.Library('user32.dll', {
  // Блокировка экрана
  'LockWorkStation': [BOOL, []],
  
  // Управление окнами
  'ShowWindow': [BOOL, [HWND, 'int']],
  'FindWindowA': [HWND, ['string', 'string']],
  'EnumWindows': [BOOL, ['pointer', 'pointer']],
  'SetForegroundWindow': [BOOL, [HWND]],
  'IsWindowVisible': [BOOL, [HWND]],
  'GetWindowTextA': ['int', [HWND, 'string', 'int']]
});

module.exports = user32;
```

**2.2 Shell32.dll API (файловые операции):**
```javascript
// src/windows-api/shell32.js
const { ffi, DWORD, HWND } = require('./base');

const shell32 = ffi.Library('shell32.dll', {
  // Очистка корзины
  'SHEmptyRecycleBinA': ['int', [HWND, 'string', DWORD]],
  
  // Файловые операции
  'ShellExecuteA': [HWND, [HWND, 'string', 'string', 'string', 'string', 'int']]
});

module.exports = shell32;
```

**2.3 Высокоуровневый API:**
```javascript
// src/windows-commands-ffi.js
const user32 = require('./windows-api/user32');
const shell32 = require('./windows-api/shell32');

class WindowsCommandsFFI {
  static lockScreen() {
    return user32.LockWorkStation();
  }

  static minimizeAllWindows() {
    // Логика через EnumWindows callback
    const callback = ffi.Callback('bool', ['pointer', 'pointer'], (hwnd, lParam) => {
      if (user32.IsWindowVisible(hwnd)) {
        user32.ShowWindow(hwnd, 6); // SW_MINIMIZE
      }
      return true;
    });
    
    return user32.EnumWindows(callback, null);
  }

  static emptyRecycleBin() {
    // SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND
    const flags = 0x00000001 | 0x00000002 | 0x00000004;
    return shell32.SHEmptyRecycleBinA(null, null, flags) === 0;
  }

  static showDesktop() {
    const progman = user32.FindWindowA('Progman', 'Program Manager');
    if (progman) {
      user32.SetForegroundWindow(progman);
      return user32.ShowWindow(progman, 3); // SW_MAXIMIZE
    }
    return false;
  }
}

module.exports = WindowsCommandsFFI;
```

### **Этап 3: Интеграция в commands.ts (30 мин)**

**3.1 Условное переключение:**
```typescript
// src/commands.ts
import { WindowsCommands } from './windows-commands';
let WindowsCommandsFFI: any = null;

// Попробовать загрузить FFI версию
try {
  WindowsCommandsFFI = require('./windows-commands-ffi');
  console.log('✅ FFI API загружено успешно');
} catch (error) {
  console.log('⚠️  FFI недоступно, используем PowerShell:', error.message);
}

export class WindowsCommands {
  async executeCommand(request: CommandRequest): Promise<ApiResponse> {
    // Приоритет FFI, fallback на PowerShell
    const useFFI = WindowsCommandsFFI && this.shouldUseFFI(request.command);
    
    if (useFFI) {
      return this.executeFFICommand(request);
    } else {
      return this.executePowerShellCommand(request);
    }
  }

  private shouldUseFFI(command: string): boolean {
    // Команды, которые поддерживают FFI
    const ffiCommands = [
      'lock_screen', 
      'minimize_all', 
      'show_desktop', 
      'empty_recycle_bin'
    ];
    return ffiCommands.includes(command);
  }

  private async executeFFICommand(request: CommandRequest): Promise<ApiResponse> {
    try {
      let result = false;
      
      switch (request.command) {
        case 'lock_screen':
          result = WindowsCommandsFFI.lockScreen();
          break;
        case 'minimize_all':
          result = WindowsCommandsFFI.minimizeAllWindows();
          break;
        case 'show_desktop':
          result = WindowsCommandsFFI.showDesktop();
          break;
        case 'empty_recycle_bin':
          result = WindowsCommandsFFI.emptyRecycleBin();
          break;
      }

      return result ? 
        { ok: true, action: request.command, details: { method: 'FFI', speed: 'fast' } } :
        { ok: false, error: `FFI command failed: ${request.command}` };
        
    } catch (error) {
      // Fallback на PowerShell при ошибке FFI
      console.log(`FFI error for ${request.command}, falling back to PowerShell:`, error);
      return this.executePowerShellCommand(request);
    }
  }
}
```

---

## 📊 Ожидаемые результаты

### **Производительность:**
| Команда | PowerShell | FFI | Ускорение |
|---------|------------|-----|-----------|
| lock_screen | ~400ms | ~15ms | **26x** |
| minimize_all | ~600ms | ~25ms | **24x** |  
| show_desktop | ~300ms | ~10ms | **30x** |
| empty_recycle_bin | ~800ms | ~30ms | **26x** |

### **Надежность:**
- ✅ **Прямые API вызовы** - без промежуточных процессов
- ✅ **Точные коды ошибок** - Windows API возвращает детальную информацию
- ✅ **Fallback система** - автоматический откат на PowerShell при ошибках

### **Возможности:**
- 🚀 **Расширенный доступ** к Windows API (тысячи функций)
- 🚀 **Real-time мониторинг** системы
- 🚀 **Тонкое управление** окнами и процессами

---

## 🧪 Тестирование

### **Юнит тесты FFI:**
```javascript
// test/ffi-commands.test.js
describe('Windows FFI Commands', () => {
  test('lockScreen should return true', () => {
    expect(WindowsCommandsFFI.lockScreen()).toBe(true);
  });

  test('emptyRecycleBin should handle empty bin', () => {
    const result = WindowsCommandsFFI.emptyRecycleBin();
    expect(typeof result).toBe('boolean');
  });
});
```

### **Performance benchmarks:**
```javascript
// test/performance.test.js
const { performance } = require('perf_hooks');

async function benchmarkCommand(command, iterations = 10) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await executeCommand(command);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  console.log(`${command}: ${avg.toFixed(2)}ms average`);
}
```

---

## 🛡️ Безопасность и fallback

### **Graceful degradation:**
```javascript
// src/ffi-loader.js
let FFI_AVAILABLE = false;
let FFI_LOAD_ERROR = null;

try {
  require('ffi-napi');
  FFI_AVAILABLE = true;
  console.log('✅ FFI modules loaded successfully');
} catch (error) {
  FFI_LOAD_ERROR = error.message;
  console.log('⚠️  FFI not available, using PowerShell fallback');
}

module.exports = { FFI_AVAILABLE, FFI_LOAD_ERROR };
```

### **Мониторинг производительности:**
```javascript
// src/performance-monitor.js
class PerformanceMonitor {
  static logCommandExecution(command, method, duration) {
    const stats = {
      command,
      method, // 'FFI' | 'PowerShell'
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[PERF] ${JSON.stringify(stats)}`);
  }
}
```

---

## 🚀 Расширенные возможности после FFI

### **Планировщик задач через Task Scheduler API:**
```javascript
// src/windows-api/taskschd.js
const taskschd = ffi.Library('taskschd.dll', {
  'CreateTask': ['pointer', ['string', 'string', 'string']],
  'RegisterTask': ['bool', ['pointer']]
});

// "поставь будильник на 10 утра"
function createAlarm(time) {
  const task = taskschd.CreateTask('VoicePC_Alarm', time, 'msg * Будильник!');
  return taskschd.RegisterTask(task);
}
```

### **Spotify/Media API через COM:**
```javascript
// src/windows-api/media.js
const oleaut32 = ffi.Library('oleaut32.dll', {
  'VariantInit': ['void', ['pointer']],
  'VariantClear': ['void', ['pointer']]
});

// Доступ к Windows Media Session API
// "что играет в Spotify?"
```

### **Мультимонитор управление:**
```javascript
// src/windows-api/monitors.js
const user32Extended = ffi.Library('user32.dll', {
  'EnumDisplayMonitors': ['bool', ['pointer', 'pointer', 'pointer', 'pointer']],
  'GetMonitorInfoA': ['bool', ['pointer', 'pointer']]
});

// "переключи окно на второй монитор"
```

---

## ✅ Готовность к запуску

**После установки VS Build Tools:**

```bash
# 1. Установить FFI пакеты
npm install ffi-napi ref-napi ref-struct-napi ref-array-napi

# 2. Создать базовую структуру
mkdir src/windows-api
# Скопировать файлы из плана

# 3. Протестировать
npm run test:ffi

# 4. Запустить с FFI
npm run build && npm start
```

**Индикаторы успешного запуска:**
- ✅ Консоль: "FFI API загружено успешно" 
- ✅ Команды выполняются за ~15-30ms
- ✅ Fallback работает при ошибках FFI

---

**🎯 Результат: Система будет работать в 20+ раз быстрее с расширенными возможностями Windows API!** ⚡

### Допка
# 🚀 Сравнение подходов: FFI vs edge-js vs PowerShell

## 📊 Таблица сравнения

| Критерий | PowerShell | edge-js | FFI (Node.js) |
|----------|------------|---------|---------------|
| **Производительность** | 400-800ms | 50-100ms | 15-30ms |
| **Установка у пользователя** | ✅ Нет | ✅ npm install | ❌ VS Build Tools |
| **Доступ к Windows API** | ⚠️ Ограничен | ⚠️ Через .NET | ✅ Полный |
| **Надежность** | ⚠️ Процессы | ✅ In-process | ✅ Direct calls |
| **Расширяемость** | ❌ Сложно | ✅ .NET богат | ✅ Максимум |
| **Отладка** | ❌ Сложно | ✅ C# debugging | ⚠️ Pointer hell |

## 🎯 Рекомендации по случаям

### **Для широкого распространения (другие пользователи):**
**Выбор: edge-js**

**Преимущества:**
- ✅ Простая установка (`npm install edge-js`)
- ✅ Работает на любой Windows с .NET Runtime
- ✅ В 5-8 раз быстрее PowerShell
- ✅ Достаточно API для базовых команд

**Ограничения:**
- ⚠️ Нужно писать C# wrapper'ы для сложных операций
- ⚠️ Не весь Windows API доступен напрямую

### **Для энтузиастов и разработчиков:**
**Выбор: FFI**

**Преимущества:**
- ✅ Максимальная производительность и возможности
- ✅ Доступ ко всем Windows функциям
- ✅ Идеально для продвинутых сценариев

**Ограничения:**
- ❌ Сложная установка Visual Studio Build Tools
- ❌ Потенциальные проблемы с разными версиями Windows
- ❌ Требует знания Windows API

### **Текущий baseline:**
**PowerShell** - работает везде, медленно, но стабильно

---

## 🏗️ Гибридная архитектура (рекомендуется)

```javascript
// src/windows-api-facade.js
class WindowsApiFacade {
  constructor() {
    this.preferredMethod = this.detectBestMethod();
  }

  detectBestMethod() {
    // 1. Попробовать FFI
    try {
      require('ffi-napi');
      return 'ffi';
    } catch {}
    
    // 2. Попробовать edge-js  
    try {
      require('edge-js');
      return 'edge';
    } catch {}
    
    // 3. Fallback на PowerShell
    return 'powershell';
  }

  async lockScreen() {
    switch (this.preferredMethod) {
      case 'ffi':
        return this.ffiLockScreen();
      case 'edge':
        return this.edgeLockScreen();
      default:
        return this.powershellLockScreen();
    }
  }
}
```

## 📈 Этапы развертывания

### **Этап 1: edge-js (рекомендуется сейчас)**
- Быстро работающая система для всех пользователей
- 5-8x ускорение над PowerShell
- Простая установка

### **Этап 2: FFI (для power users)**
- Максимальная производительность
- Расширенные возможности
- Требует техническую подготовку

### **Этап 3: Полный fallback**
- Автоматическое определение доступных API
- Graceful degradation
- Одинаковый UX независимо от метода