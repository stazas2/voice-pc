# 🎙️ Voice PC Controller

Управляйте Windows ПК голосовыми командами через Яндекс.Алису. Минимально-жизнеспособная система для выполнения команд на локальном компьютере через webhook.

**Архитектура:** Алиса → Навык → HTTPS webhook → ngrok → Node.js сервер → Windows команды

## ⚡ Быстрый старт

### 1. Установка

```powershell
# Клонировать или скачать проект
cd voice-pc

# Установить зависимости
npm install

# Создать .env файл
copy .env.example .env

# Отредактировать .env - установить сильный ALICE_TOKEN
notepad .env
```

### 2. Настройка ngrok

1. Скачать ngrok: https://ngrok.com/download
2. Зарегистрироваться и получить authtoken
3. Отредактировать `ngrok.yml`:

```powershell
notepad ngrok.yml
# Заменить YOUR_NGROK_TOKEN_HERE на ваш токен
```

### 3. Настройка брандмауэра (опционально)

```powershell
# Запустить PowerShell как Администратор
.\scripts\install-firewall.ps1
```

### 4. Запуск

```powershell
# Автоматический запуск сервера + ngrok
.\scripts\dev.ps1

# Или только сборка
.\scripts\dev.ps1 -BuildOnly

# Или без ngrok
.\scripts\dev.ps1 -SkipNgrok
```

## 🎯 Доступные команды

| Команда | Описание | Пример payload |
|---------|----------|----------------|
| `say_ok` | Healthcheck | `{"command":"say_ok"}` |
| `open_notepad` | Открыть блокнот | `{"command":"open_notepad"}` |
| `open_chrome` | Открыть URL в браузере | `{"command":"open_chrome","url":"https://youtube.com"}` |
| `shutdown_now` | Выключить ПК | `{"command":"shutdown_now"}` |
| `sleep_now` | Усыпить ПК | `{"command":"sleep_now"}` |
| `open_app` | Открыть приложение по алиасу | `{"command":"open_app","alias":"calculator"}` |

### Доступные алиасы приложений

Редактируйте `config/apps.json` для добавления новых приложений:

```json
{
  "photobooth": "D:\\apps\\booth\\booth.exe",
  "obs": "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe",
  "vscode": "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
  "calculator": "calc.exe",
  "paint": "mspaint.exe",
  "wordpad": "write.exe",
  "explorer": "explorer.exe",
  "taskmgr": "taskmgr.exe",
  "cmd": "cmd.exe",
  "powershell": "powershell.exe"
}
```

## 🔐 API Endpoints

### POST /command

Выполнить команду. Требует заголовок `X-ALICE-TOKEN`.

**Request:**
```json
{
  "command": "open_notepad|open_chrome|shutdown_now|sleep_now|open_app|say_ok",
  "url": "https://example.com",     // Для open_chrome
  "alias": "calculator"             // Для open_app
}
```

**Response (success):**
```json
{
  "ok": true,
  "action": "open_notepad",
  "details": {
    "app": "notepad.exe"
  }
}
```

**Response (error):**
```json
{
  "ok": false,
  "error": "Validation error: Invalid command"
}
```

### GET /health

Проверка состояния сервера (без авторизации).

**Response:**
```json
{
  "ok": true,
  "uptime": 3600,
  "ts": "2024-01-15T12:00:00.000Z"
}
```

### GET /

Web-интерфейс для тестирования команд и просмотра доступных алиасов.

## 🧪 Тестирование

### PowerShell примеры

```powershell
# Установить переменные
$token = "your_alice_token_here"
$url = "https://your-ngrok-url.ngrok-free.app"  # Или http://localhost:3000

# Healthcheck
Invoke-RestMethod -Uri "$url/health"

# Тест команды say_ok
Invoke-RestMethod -Uri "$url/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$token"} -Body '{"command":"say_ok"}'

# Открыть блокнот
Invoke-RestMethod -Uri "$url/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$token"} -Body '{"command":"open_notepad"}'

# Открыть YouTube
Invoke-RestMethod -Uri "$url/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$token"} -Body '{"command":"open_chrome","url":"https://youtube.com"}'

# Открыть калькулятор
Invoke-RestMethod -Uri "$url/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$token"} -Body '{"command":"open_app","alias":"calculator"}'
```

### cURL примеры (Git Bash / WSL)

```bash
TOKEN="your_alice_token_here"
URL="https://your-ngrok-url.ngrok-free.app"

# Healthcheck
curl "$URL/health"

# Say OK
curl -X POST "$URL/command" \
  -H "Content-Type: application/json" \
  -H "X-ALICE-TOKEN: $TOKEN" \
  -d '{"command":"say_ok"}'

# Open Notepad
curl -X POST "$URL/command" \
  -H "Content-Type: application/json" \
  -H "X-ALICE-TOKEN: $TOKEN" \
  -d '{"command":"open_notepad"}'
```

## 🔒 Безопасность

### Встроенные защиты:

- **Авторизация**: Проверка токена в заголовке `X-ALICE-TOKEN`
- **Rate Limiting**: 10 запросов/минута на IP
- **Валидация**: Строгая проверка входных данных с помощью Zod
- **Allowlist команд**: Только разрешенные команды
- **Логирование**: Все действия записываются в `logs/actions.log`
- **Изоляция**: Никаких произвольных shell-команд

### Рекомендации:

- Используйте сильный ALICE_TOKEN (длина 16+ символов)
- Настройте брандмауэр Windows
- Регулярно проверяйте логи
- Ограничьте доступ к ngrok URL

## 📁 Структура проекта

```
voice-pc/
├── package.json              # npm конфигурация
├── tsconfig.json            # TypeScript конфигурация
├── .env.example             # Пример переменных окружения
├── ngrok.yml                # Конфигурация ngrok
├── README.md                # Документация
├── .gitignore              # Git ignore файл
├── src/                     # Исходный код TypeScript
│   ├── server.ts           # Основной сервер Express
│   ├── types.ts            # TypeScript интерфейсы
│   ├── validators.ts       # Валидация с Zod
│   ├── security.ts         # Безопасность и rate limiting
│   ├── logger.ts           # Система логирования
│   └── commands.ts         # Windows команды
├── config/                  # Конфигурация
│   └── apps.json           # Алиасы приложений
├── scripts/                 # PowerShell скрипты
│   ├── dev.ps1             # Скрипт разработки
│   └── install-firewall.ps1 # Настройка брандмауэра
├── logs/                    # Лог файлы (создается автоматически)
└── dist/                    # Скомпилированный JavaScript (создается npm run build)
```

## 🔧 Разработка

### Команды npm

```bash
npm run dev        # Запуск в режиме разработки с auto-reload
npm run build      # Сборка TypeScript
npm start          # Запуск production версии
npm test           # Запуск тестов (если настроены)
npm run lint       # Линтинг кода
npm run format     # Форматирование кода
```

### Добавление новой команды

1. Добавить тип команды в `src/types.ts`:
```typescript
export interface CommandRequest {
  command: 'open_notepad' | 'open_chrome' | 'your_new_command' | ...;
  // дополнительные параметры
}
```

2. Обновить валидатор в `src/validators.ts`:
```typescript
export const commandSchema = z.object({
  command: z.enum(['open_notepad', 'open_chrome', 'your_new_command', ...]),
  // дополнительные поля
});
```

3. Реализовать команду в `src/commands.ts`:
```typescript
case 'your_new_command':
  // логика выполнения
  return { ok: true, action: 'your_new_command', details: {...} };
```

## 🤖 Настройка навыка Алисы

### Маппинг фраз → команды

```javascript
// Примеры интентов в навыке Яндекс.Диалогов
const intentMappings = {
  // Блокнот
  "запусти блокнот": {"command": "open_notepad"},
  "открой блокнот": {"command": "open_notepad"},
  
  // Браузер
  "открой хром на ютубе": {"command": "open_chrome", "url": "https://youtube.com"},
  "запусти браузер на гугле": {"command": "open_chrome", "url": "https://google.com"},
  "открой сайт (.+)": {"command": "open_chrome", "url": "$1"},
  
  // Система
  "выключи компьютер": {"command": "shutdown_now"},
  "усыпи компьютер": {"command": "sleep_now"},
  
  // Приложения
  "запусти калькулятор": {"command": "open_app", "alias": "calculator"},
  "открой фотобудку": {"command": "open_app", "alias": "photobooth"},
  "запусти (.+)": {"command": "open_app", "alias": "$1"} // если есть алиас
};
```

### Код webhook в навыке

```javascript
// В обработчике навыка Яндекс.Диалогов
const webhookUrl = "https://your-ngrok-url.ngrok-free.app/command";
const aliceToken = "your_alice_token_here";

async function handleVoiceCommand(userText) {
  // Распарсить userText → command payload
  const payload = parseUserIntent(userText);
  
  if (!payload) {
    // Fallback для нераспознанных команд
    payload = {"command": "say_ok"};
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ALICE-TOKEN': aliceToken
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.ok) {
      return "Команда выполнена успешно";
    } else {
      return "Ошибка выполнения команды";
    }
  } catch (error) {
    return "Сервер недоступен";
  }
}
```

## 🚨 Troubleshooting

### Частые проблемы:

**1. "ALICE_TOKEN не установлен"**
- Проверьте файл `.env`
- Убедитесь, что токен длиннее 10 символов

**2. "ngrok не найден"**
- Скачайте ngrok с https://ngrok.com
- Добавьте в PATH или поместите в папку проекта

**3. "Команда не выполняется"**
- Проверьте логи в `logs/actions.log`
- Убедитесь, что путь к приложению правильный

**4. "Rate limit exceeded"**
- Подождите минуту
- Проверьте, не делает ли навык слишком много запросов

**5. "Firewall блокирует"**
- Запустите `scripts/install-firewall.ps1` как администратор
- Или вручную разрешите Node.js в Windows Defender

### Логи и диагностика:

```powershell
# Посмотреть логи действий
Get-Content logs/actions.log -Tail 20

# Проверить процессы
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Проверить порт
netstat -an | Select-String ":3000"
```

## 📋 Чек-лист готовности к продакшену

- [ ] Установлен сильный ALICE_TOKEN в `.env`
- [ ] Настроен ngrok с authtoken
- [ ] Настроены правила брандмауэра
- [ ] Протестированы все команды
- [ ] Навык Алисы настроен и подключен
- [ ] Логирование работает
- [ ] Система мониторинга (опционально)

## 📄 Лицензия

MIT License - используйте как угодно, но на свой страх и риск.

## 🙋‍♂️ Поддержка

При проблемах:

1. Проверьте логи в `logs/actions.log`
2. Убедитесь, что все зависимости установлены
3. Проверьте конфигурацию `.env` и `ngrok.yml`
4. Запустите `scripts/dev.ps1 -BuildOnly` для проверки сборки