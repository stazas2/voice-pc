# Voice PC Cloud Function API Documentation

API документация для системы голосового управления ПК через Yandex Alice.

## 📝 Общая информация

### Endpoint
```
POST https://functions.yandexcloud.net/ваш-id-функции
```

### Content-Type
```
application/json
```

### Аутентификация
Не требуется (используется внутренняя авторизация Yandex.Dialogs)

## 📥 Запросы от Алисы

### Структура запроса

```json
{
  "meta": {
    "locale": "ru-RU",
    "timezone": "UTC",
    "client_id": "ru.yandex.searchplugin/7.16",
    "interfaces": {
      "screen": {},
      "payments": {},
      "account_linking": {}
    }
  },
  "session": {
    "message_id": 0,
    "session_id": "2eac4854-fce721f3-b845abba-20d60",
    "skill_id": "3ad36498-f5rd-4079-a14b-788652932056",
    "user": {
      "user_id": "AC9WC3DF6FCE052E45A4566A48E6B7193774B84814CE49A922E163B8B29881DC"
    },
    "application": {
      "application_id": "47C73714B580ED2469056E71081159529FFC676A4C5B5A53E0CB50E0B0E9A7DB"
    },
    "user_id": "AC9WC3DF6FCE052E45A4566A48E6B7193774B84814CE49A922E163B8B29881DC",
    "new": true
  },
  "request": {
    "command": "открой блокнот",
    "original_utterance": "открой блокнот",
    "nlu": {
      "tokens": ["открой", "блокнот"],
      "entities": [],
      "intents": {}
    },
    "markup": {
      "dangerous_context": false
    },
    "type": "SimpleUtterance"
  },
  "state": {
    "session": {},
    "user": {},
    "application": {}
  },
  "version": "1.0"
}
```

### Ключевые поля

| Поле | Тип | Описание |
|------|-----|----------|
| `request.command` | string | Команда пользователя в нормализованном виде |
| `request.original_utterance` | string | Исходный текст пользователя |
| `session.user_id` | string | Уникальный ID пользователя |
| `session.session_id` | string | ID текущей сессии |
| `session.new` | boolean | Первый запрос в сессии? |

## 📤 Ответы Cloud Function

### Структура ответа

```json
{
  "response": {
    "text": "Открываю блокнот",
    "tts": "Открыва+ю блокн+от",
    "buttons": [
      {
        "title": "Помощь",
        "payload": {},
        "url": "https://voice-pc.stazas2.space/help",
        "hide": true
      }
    ],
    "end_session": false
  },
  "session": {
    "session_id": "2eac4854-fce721f3-b845abba-20d60",
    "message_id": 1,
    "user_id": "AC9WC3DF6FCE052E45A4566A48E6B7193774B84814CE49A922E163B8B29881DC"
  },
  "version": "1.0"
}
```

### Поля ответа

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `response.text` | string | ✅ | Текст ответа Алисы |
| `response.tts` | string | ❌ | Произношение (SSML разметка) |
| `response.buttons` | array | ❌ | Кнопки для устройств с экраном |
| `response.end_session` | boolean | ✅ | Завершить сессию? |
| `session` | object | ✅ | Информация о сессии |

## 🎛️ Поддерживаемые команды

### Категории команд

#### 1. Активация навыка
```json
{
  "phrases": ["запусти навык головной отрыв", "головной отрыв"],
  "command": "say_ok",
  "response": "Привет! Готова выполнять команды."
}
```

#### 2. Приложения
```json
{
  "phrases": ["открой блокнот", "запусти калькулятор"],
  "command": "open_notepad" | "open_app",
  "parameters": { "alias": "calculator" }
}
```

#### 3. Веб-сайты
```json
{
  "phrases": ["открой ютуб", "открой гугл"],
  "command": "open_chrome",
  "parameters": { "url": "https://youtube.com" }
}
```

#### 4. Медиа управление
```json
{
  "phrases": ["пауза", "громкость выше", "громкость 50"],
  "command": "media_pause" | "volume_up" | "volume_set",
  "parameters": { "level": 50 }
}
```

#### 5. Windows API команды
```json
{
  "phrases": ["закрой хром", "переключись на блокнот"],
  "command": "close_window" | "focus_window",
  "parameters": { "processName": "chrome" }
}
```

### Полный список команд

См. файл `config/command-mappings.js` для актуального списка всех команд.

## 🔧 Обработка команд

### Алгоритм парсинга

1. **Нормализация** - приведение текста к нижнему регистру
2. **Точное совпадение** - поиск в command-mappings.js
3. **Fuzzy matching** - нечеткий поиск для опечаток  
4. **Контекст** - учет предыдущих команд
5. **Числа** - парсинг числовых значений

### Приоритет поиска

1. **Команды с числами** - высший приоритет
2. **Контекстные команды** - учет истории диалога
3. **Точное совпадение** - из command-mappings.js
4. **Fuzzy search** - с порогом similarity > 0.6

## 📊 API для локального сервера

### Отправка команд на ПК

```http
POST https://your-domain.space/command
Content-Type: application/json

{
  "command": "open_notepad",
  "parameters": {},
  "user_id": "user123",
  "session_id": "session456"
}
```

### Ответ сервера

```json
{
  "success": true,
  "message": "Command executed successfully",
  "command": "open_notepad",
  "execution_time": 150,
  "method": "edge-js"
}
```

## 🚨 Обработка ошибок

### Типы ошибок

#### 1. Ошибка валидации
```json
{
  "response": {
    "text": "Некорректный запрос",
    "end_session": false
  }
}
```

#### 2. Сервер недоступен
```json
{
  "response": {
    "text": "Компьютер недоступен. Проверьте подключение.",
    "end_session": false
  }
}
```

#### 3. Неизвестная команда
```json
{
  "response": {
    "text": "Не понимаю эту команду. Попробуйте другую.",
    "buttons": [
      {
        "title": "Помощь",
        "url": "https://voice-pc.stazas2.space/help"
      }
    ],
    "end_session": false
  }
}
```

#### 4. Rate Limit
```json
{
  "response": {
    "text": "Слишком много запросов. Попробуйте через минуту.",
    "end_session": false
  }
}
```

## 🔒 Безопасность

### Валидация запросов

- ✅ Проверка структуры JSON
- ✅ Валидация обязательных полей
- ✅ Фильтрация опасных команд
- ✅ Rate limiting по user_id

### Разрешенные команды

Только команды из whitelist в `utils/validator.js`:

```javascript
allowedCommands: [
  'say_ok', 'open_notepad', 'open_chrome', 
  'volume_up', 'volume_down', 'screenshot',
  // ... полный список в файле
]
```

### Блокируемые паттерны

```javascript
suspiciousCommands: [
  'rm -rf', 'del /f /s /q', 'format', 
  'shutdown -f', 'taskkill /f',
  // ... полный список в файле
]
```

## 📈 Мониторинг

### Логирование

```javascript
// Успешное выполнение
logger.info('Command executed', {
  command: 'open_notepad',
  userText: 'открой блокнот',
  success: true,
  responseTime: '150ms'
});

// Ошибка
logger.error('Command failed', {
  command: 'open_chrome',
  error: 'Connection timeout',
  userId: 'user123'
});
```

### Метрики

- Время выполнения команд
- Успешность выполнения  
- Популярные команды
- Ошибки и их типы

## 🧪 Тестирование

### Тестовый запрос

```bash
curl -X POST https://functions.yandexcloud.net/ваш-id \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "command": "блокнот",
      "original_utterance": "открой блокнот"
    },
    "session": {
      "session_id": "test-session",
      "user_id": "test-user",
      "new": false
    }
  }'
```

### Ожидаемый ответ

```json
{
  "response": {
    "text": "Открываю блокнот",
    "end_session": false
  },
  "session": {
    "session_id": "test-session",
    "message_id": 1,
    "user_id": "test-user"
  },
  "version": "1.0"
}
```

## 📚 Дополнительные ресурсы

- [Документация Yandex.Dialogs](https://yandex.ru/dev/dialogs/alice/doc/request.html)
- [Cloud Functions API](https://cloud.yandex.ru/docs/functions/)
- [Веб-дашборд Voice PC](https://voice-pc.stazas2.space/dashboard)

---

**API обновляется автоматически при изменении command-mappings.js**