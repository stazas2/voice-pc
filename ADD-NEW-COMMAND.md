# 📋 Инструкция по добавлению новых команд в Voice PC

## 🎯 Цель инструкции
Пошаговое руководство для корректного добавления новых голосовых команд в систему Voice PC без пропуска файлов.

---

## 📂 Структура: 6 обязательных файлов для изменения

### 1️⃣ **TypeScript типы** (src/types.ts)
**Что делать:** Добавить новую команду в union type `command`
```typescript
export interface CommandRequest {
  command: 'open_notepad' | 'open_chrome' | /* ДОБАВИТЬ СЮДА */ 'new_command' |
    // Media commands
    'media_pause' | 'media_play' | ...
```

**Если команда требует параметры:**
```typescript
  newParam?: string; // for new_command - ДОБАВИТЬ В КОНЕЦ ИНТЕРФЕЙСА
```

---

### 2️⃣ **TypeScript валидация** (src/validators.ts)
**Что делать:** Добавить команду в z.enum и параметры в schema
```typescript
export const commandSchema = z.object({
  command: z.enum([
    'open_notepad', 'open_chrome', /* ДОБАВИТЬ */ 'new_command',
    // Media commands
    'media_pause', 'media_play', ...
  ]),
  // Если есть новые параметры:
  newParam: z.string().min(1).optional(), // ДОБАВИТЬ В КОНЕЦ
}).strict();
```

---

### 3️⃣ **Локальный сервер - логика команды** (src/commands.ts)
**Что делать:** Добавить case в switch statement
```typescript
switch (request.command) {
  case 'open_notepad':
    // существующие команды...
    
  case 'new_command': // ДОБАВИТЬ НОВЫЙ CASE
    try {
      // Логика выполнения команды
      const result = await this.executeCommand('powershell', ['...'], 3000);
      return {
        ok: result.success,
        action: 'new_command',
        details: { message: 'Command executed successfully' }
      };
    } catch (error) {
      return { 
        ok: false, 
        error: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
```

**Паттерны для разных типов команд:**
- **PowerShell команды:** `this.executeCommand('powershell', ['-Command', 'Get-Process'], 3000)`
- **Edge.js команды:** `this.executeEdgeJsCommand({ command: 'focus_window', processName: 'chrome' })`
- **Chrome управление:** Сначала focus, затем SendKeys с задержкой 300ms
- **Notion API:** `await notionAdapter.methodName()`

---

### 4️⃣ **Cloud функция - валидатор** (cloud/utils/validator.js)
**Что делать:** Добавить команду в массив allowedCommands
```javascript
getAllowedCommands() {
  return [
    'open_notepad',
    'open_chrome',
    'new_command', // ДОБАВИТЬ СЮДА
    // Media commands
    'media_pause',
    'media_play',
    // ... остальные команды
  ];
}
```

---

### 5️⃣ **Cloud функция - ответы Алисы** (cloud/core/response-generator.js)
**Что делать:** Добавить case для генерации голосового ответа
```javascript
switch (commandPayload.command) {
  case 'open_notepad':
    return '📝 Блокнот открыт! Готов к записям!';
    
  case 'new_command': // ДОБАВИТЬ НОВЫЙ CASE
    if (result.success) {
      return '✅ ' + getRandomResponse([
        'Команда выполнена успешно!',
        'Готово! Всё сделано!',
        'Отлично! Задача выполнена!'
      ]);
    } else {
      return '❌ Не удалось выполнить команду. Попробуйте ещё раз.';
    }
    
  // другие команды...
}
```

---

### 6️⃣ **Cloud функция - голосовые фразы** (cloud/config/command-mappings.js)
**Что делать:** Добавить голосовые команды для распознавания
```javascript
module.exports = {
  // Существующие команды
  'открой блокнот': { command: 'open_notepad' },
  'блокнот': { command: 'open_notepad' },
  
  // ДОБАВИТЬ НОВЫЕ ГОЛОСОВЫЕ ФРАЗЫ
  'выполни новую команду': { command: 'new_command' },
  'новая команда': { command: 'new_command' },
  'запусти новое действие': { command: 'new_command' },
  
  // Если команда с параметрами:
  'команда с параметром': { command: 'new_command', newParam: 'value' },
};
```

---

## ⚡ Примеры реализации по категориям

### 🔴 Простая PowerShell команда
```typescript
// src/commands.ts
case 'simple_powershell':
  const result = await this.executeCommand('powershell', ['-Command', 'Get-Date'], 3000);
  return result.success ? 
    { ok: true, action: 'simple_powershell', details: { output: result.output } } :
    { ok: false, error: result.error };
```

### 🟠 Chrome команда с фокусировкой
```typescript
// src/commands.ts  
case 'chrome_action':
  // 1. Фокусируем Chrome
  await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' });
  // 2. Пауза
  await new Promise(resolve => setTimeout(resolve, 300));
  // 3. Отправляем клавиши
  const result = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^r\\")'], 3000);
  return result.success ? { ok: true, action: 'chrome_action' } : { ok: false, error: result.error };
```

### 🟡 Edge.js команда (быстрая)
```typescript
// src/commands.ts
case 'edge_js_command':
  if (!request.processName) {
    return { ok: false, error: 'Process name required' };
  }
  try {
    const result = await this.executeEdgeJsCommand({ command: 'focus_window', processName: request.processName });
    return { ok: result.ok, action: 'edge_js_command', details: result.details };
  } catch (error) {
    return { ok: false, error: `Edge.js error: ${error.message}` };
  }
```

### 🟢 Notion API команда
```typescript
// src/commands.ts
case 'notion_command':
  try {
    const result = await notionAdapter.getTodayTasks();
    return {
      ok: true,
      action: 'notion_command', 
      data: { 
        count: result.length,
        tasks: result.map(t => t.title).join(', ')
      }
    };
  } catch (error) {
    return { ok: false, error: `Notion error: ${error.message}` };
  }
```

---

## 🚀 Последовательность действий (Checklist)

### ✅ Шаг 1: Планирование
- [ ] Определить тип команды (PowerShell, Edge.js, Chrome, Notion, etc.)
- [ ] Определить нужные параметры команды
- [ ] Придумать голосовые фразы для команды

### ✅ Шаг 2: TypeScript файлы (локальный сервер)
- [ ] **src/types.ts**: Добавить в union type + параметры
- [ ] **src/validators.ts**: Добавить в z.enum + валидация параметров  
- [ ] **src/commands.ts**: Добавить case с логикой выполнения

### ✅ Шаг 3: Cloud функция (Yandex Cloud)
- [ ] **cloud/utils/validator.js**: Добавить в allowedCommands массив
- [ ] **cloud/core/response-generator.js**: Добавить case с ответом Алисы
- [ ] **cloud/config/command-mappings.js**: Добавить голосовые фразы

### ✅ Шаг 4: Тестирование и деплой
- [ ] `npm run build` - проверить компиляцию TypeScript
- [ ] Перезапустить локальный сервер через `start-voice-pc-final.bat`
- [ ] Тест локально: `curl -X POST "http://localhost:3000/command" -H "Content-Type: application/json" -H "X-ALICE-TOKEN: ..." -d "{\"command\":\"new_command\"}"`
- [ ] Развернуть cloud функцию в Yandex Cloud
- [ ] Тест через Алису: "Алиса, запусти навык головной отрыв" → "новая команда"

---

## 🚨 Частые ошибки и как их избежать

### ❌ TypeScript не компилируется
**Причина:** Не добавлена команда в src/types.ts или src/validators.ts
**Решение:** Проверить все union types и z.enum схемы

### ❌ Команда не найдена в cloud функции  
**Причина:** Не добавлена в cloud/utils/validator.js
**Решение:** Добавить команду в allowedCommands массив

### ❌ Алиса не понимает голосовую команду
**Причина:** Не добавлены фразы в cloud/config/command-mappings.js
**Решение:** Добавить минимум 2-3 синонима для команды

### ❌ Команда возвращает "ok: true", но не выполняется
**Причина:** Проблема в логике выполнения (чаще всего Chrome без фокуса)
**Решение:** Для Chrome команд добавить focus_window + задержку 300ms

### ❌ Команда не отвечает (таймаут)
**Причина:** Длительная операция (ProfilesManager, сложные PowerShell скрипты)
**Решение:** Увеличить таймаут или упростить логику

---

## 📝 Шаблон для копирования

```typescript
// 1. src/types.ts - добавить в command union
'template_command' |

// параметр (если нужен)
templateParam?: string; // for template_command

// 2. src/validators.ts - добавить в z.enum  
'template_command',

// параметр (если нужен)
templateParam: z.string().min(1).optional(), // for template_command

// 3. src/commands.ts - добавить case
case 'template_command':
  try {
    const result = await this.executeCommand('powershell', ['-Command', 'echo "Hello"'], 3000);
    return {
      ok: result.success,
      action: 'template_command',
      details: { message: 'Template executed' }
    };
  } catch (error) {
    return { ok: false, error: `Template error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
```

```javascript
// 4. cloud/utils/validator.js - добавить в массив
'template_command',

// 5. cloud/core/response-generator.js - добавить case  
case 'template_command':
  return '🎯 ' + getRandomResponse([
    'Команда шаблон выполнена!',
    'Шаблон работает отлично!',
    'Готово! Шаблон активирован!'
  ]);

// 6. cloud/config/command-mappings.js - добавить фразы
'выполни шаблон': { command: 'template_command' },
'запусти шаблон': { command: 'template_command' },
'шаблонная команда': { command: 'template_command' },
```

---

## 🎯 Итог
Следуя этой инструкции, новая команда будет корректно работать во всей системе: от голосового распознавания Алисой до выполнения на локальном ПК. **Все 6 файлов обязательны для изменения!**