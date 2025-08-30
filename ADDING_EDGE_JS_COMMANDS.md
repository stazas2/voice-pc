# 🚀 Добавление новых Edge-js команд

## 📍 Текущие Edge-js команды

В системе реализованы **4 команды** с edge-js оптимизацией:

### ✅ Существующие команды:
1. **`minimize_all`** - минимизация всех окон (EnumWindows API)
2. **`show_desktop`** - показ рабочего стола (FindWindow API)  
3. **`lock_screen`** - блокировка экрана (LockWorkStation API)
4. **`empty_recycle_bin`** - очистка корзины (SHEmptyRecycleBin API)

**Производительность:** 17-150ms вместо 600-1800ms (PowerShell)

---

## 📁 Где найти edge-js команды

### **Основные файлы:**
- `src/windows-api/base.js` - C# код с Windows API
- `src/windows-commands-edge.js` - JavaScript wrapper
- `src/commands.ts` - интеграция в основную систему
- `cloud/command-mappings.js` - голосовые команды Алисы

### **Логика определения:**
```javascript
// В commands.ts - какие команды используют edge-js
private shouldUseEdgeJs(command: string): boolean {
  const edgeJsCommands = [
    'lock_screen',      // ✅ Реализовано
    'minimize_all',     // ✅ Реализовано  
    'show_desktop',     // ✅ Реализовано
    'empty_recycle_bin' // ✅ Реализовано
  ];
  return edgeJsAvailable && edgeJsCommands.includes(command);
}
```

---

## 🛠️ Как добавить новую edge-js команду

### **Шаг 1: Добавить C# код в `src/windows-api/base.js`**

```javascript
const newCommandCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        // Подключение Windows API
        [DllImport("user32.dll")]  // или kernel32.dll, shell32.dll
        public static extern bool SomeWindowsFunction(IntPtr hWnd);
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                // Вызов Windows API
                bool result = SomeWindowsFunction(IntPtr.Zero);
                return new { 
                    success = result, 
                    method = "edge-js",
                    // дополнительные данные
                };
            }
            catch (Exception ex)
            {
                return new { 
                    success = false, 
                    error = ex.Message, 
                    method = "edge-js" 
                };
            }
        }
    }
`);

// Добавить в экспорт
module.exports = {
    // ... существующие
    newCommand: promisifyEdge(newCommandCs)
};
```

### **Шаг 2: Добавить wrapper в `src/windows-commands-edge.js`**

```javascript
static async newCommand() {
    try {
        const result = await windowsApi.newCommand(null);
        return result;
    } catch (error) {
        return { success: false, error: error.message, method: "edge-js" };
    }
}
```

### **Шаг 3: Добавить в список edge-js команд в `src/commands.ts`**

```javascript
private shouldUseEdgeJs(command: string): boolean {
  const edgeJsCommands = [
    'lock_screen',
    'minimize_all', 
    'show_desktop',
    'empty_recycle_bin',
    'new_command'  // ← Добавить сюда
  ];
  return edgeJsAvailable && edgeJsCommands.includes(command);
}
```

### **Шаг 4: Добавить обработчик в `executeEdgeJsCommand`**

```javascript
switch (request.command) {
  case 'lock_screen':
    result = await WindowsCommandsEdge.lockScreen();
    break;
  // ... остальные
  case 'new_command':  // ← Добавить case
    result = await WindowsCommandsEdge.newCommand();
    break;
  default:
    throw new Error(`Edge-js command not implemented: ${request.command}`);
}
```

### **Шаг 5: Добавить PowerShell fallback в `executePowerShellCommand`**

```javascript
switch (request.command) {
  // ... существующие
  case 'new_command':
    result = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'new-command.ps1')], 5000);
    break;
}
```

### **Шаг 6: Добавить в `cloud/command-mappings.js`**

```javascript
// В секции 🚀 WINDOWS УПРАВЛЕНИЕ
'голосовая команда': { command: 'new_command' },
'другой вариант': { command: 'new_command' },
```

### **Шаг 7: Пересобрать и скопировать**

```bash
npm run build
cp src/windows-commands-edge.js dist/
cp src/windows-api/base.js dist/windows-api/
```

---

## 💡 Примеры новых команд для реализации

### **1. Громкость системы (более точное управление):**
```csharp
[DllImport("user32.dll")]
public static extern int SendMessage(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam);

// Команды: volume_set_50, volume_get, volume_max
```

### **2. Управление окнами (конкретными):**
```csharp
[DllImport("user32.dll")]
public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);

// Команды: focus_chrome, close_notepad, maximize_window
```

### **3. Контроль питания экрана:**
```csharp
[DllImport("user32.dll")]
public static extern int SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

// Команды: monitor_off, monitor_on
```

### **4. Системные диалоги:**
```csharp
[DllImport("user32.dll")]
public static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

// Команды: show_alert, system_dialog
```

### **5. Работа с файлами (быстрее PowerShell):**
```csharp
[DllImport("kernel32.dll")]
public static extern bool CopyFile(string lpExistingFileName, string lpNewFileName, bool bFailIfExists);

// Команды: copy_file_fast, move_file_fast
```

---

## 🧪 Тестирование новых команд

### **1. Автономный тест:**
```javascript
// test-new-command.js
const WindowsCommandsEdge = require('./src/windows-commands-edge');

async function testNewCommand() {
    const result = await WindowsCommandsEdge.newCommand();
    console.log('Result:', result);
}

testNewCommand();
```

### **2. API тест:**
```bash
curl -X POST http://localhost:3001/command \
  -H "X-ALICE-TOKEN: VoicePC_SecureToken_2024_abcd1234efgh5678" \
  -H "Content-Type: application/json" \
  -d '{"command":"new_command"}'
```

### **3. Проверка fallback:**
```javascript
// Временно переименовать windows-commands-edge.js для тестирования fallback
mv src/windows-commands-edge.js src/windows-commands-edge.js.backup
# Запустить сервер - должен использовать PowerShell
```

---

## 📊 Производительность

### **Ожидаемые результаты edge-js команд:**
- **Простые API вызовы:** 10-30ms
- **Перебор окон:** 50-150ms  
- **Файловые операции:** 20-100ms
- **Системные запросы:** 15-50ms

### **vs PowerShell эквиваленты:**
- **Простые:** 300-800ms  
- **Сложные:** 800-2000ms
- **Ускорение:** 10-100x

---

## 🔍 Отладка

### **Логи edge-js:**
```
[INFO] ✅ Edge-js API loaded successfully  
[INFO] Executing command request {"command":"new_command"}
[INFO] Performance: {"method":"edge-js","duration":"25ms"}
```

### **Ошибки:**
```
[WARN] Edge-js error for new_command, falling back to PowerShell: [error]
```

### **Fallback:**
```
[WARN] ⚠️ Edge-js not available, using PowerShell fallback: Cannot find module
```

---

## ✅ Контрольный список для новой команды

- [ ] C# код добавлен в `src/windows-api/base.js`
- [ ] Wrapper создан в `src/windows-commands-edge.js`  
- [ ] Команда добавлена в `shouldUseEdgeJs()` список
- [ ] Case добавлен в `executeEdgeJsCommand()`
- [ ] PowerShell fallback добавлен в `executePowerShellCommand()`
- [ ] Голосовые команды добавлены в `cloud/command-mappings.js`
- [ ] Проект пересобран и файлы скопированы в dist/
- [ ] Автономный тест написан и выполнен
- [ ] API тест выполнен успешно
- [ ] Fallback тест выполнен успешно
- [ ] Производительность измерена и задокументирована

**Результат:** Новая команда работает с 10-100x ускорением и автоматическим fallback!