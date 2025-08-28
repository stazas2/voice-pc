# Примеры настройки навыка Яндекс.Алисы

## Маппинг фраз → команды

### JavaScript код для обработки интентов

```javascript
// Маппинг пользовательских фраз на команды API
const COMMAND_MAPPINGS = {
  // Блокнот
  'запусти блокнот': { command: 'open_notepad' },
  'открой блокнот': { command: 'open_notepad' },
  'блокнот': { command: 'open_notepad' },
  
  // Браузер с конкретными сайтами
  'открой ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
  'запусти ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
  'открой гугл': { command: 'open_chrome', url: 'https://google.com' },
  'открой хром': { command: 'open_chrome', url: 'https://google.com' },
  'открой браузер': { command: 'open_chrome', url: 'https://google.com' },
  
  // Браузер с произвольными сайтами (через регулярные выражения)
  'открой сайт (.+)': { command: 'open_chrome', url: '$1' },
  'перейди на (.+)': { command: 'open_chrome', url: '$1' },
  
  // Выключение и сон
  'выключи компьютер': { command: 'shutdown_now' },
  'выключи пк': { command: 'shutdown_now' },
  'выключи ноутбук': { command: 'shutdown_now' },
  'усыпи компьютер': { command: 'sleep_now' },
  'усыпи пк': { command: 'sleep_now' },
  'переведи в сон': { command: 'sleep_now' },
  
  // Приложения по алиасам
  'запусти калькулятор': { command: 'open_app', alias: 'calculator' },
  'открой калькулятор': { command: 'open_app', alias: 'calculator' },
  'запусти фотобудку': { command: 'open_app', alias: 'photobooth' },
  'открой фотобудку': { command: 'open_app', alias: 'photobooth' },
  'запусти обс': { command: 'open_app', alias: 'obs' },
  'открой обс': { command: 'open_app', alias: 'obs' },
  'запусти пэинт': { command: 'open_app', alias: 'paint' },
  'открой пэинт': { command: 'open_app', alias: 'paint' },
  'запусти эксплорер': { command: 'open_app', alias: 'explorer' },
  'открой проводник': { command: 'open_app', alias: 'explorer' },
  'запусти диспетчер задач': { command: 'open_app', alias: 'taskmgr' },
  'открой диспетчер': { command: 'open_app', alias: 'taskmgr' },
  
  // Fallback команды
  'тест': { command: 'say_ok' },
  'проверка': { command: 'say_ok' },
  'статус': { command: 'say_ok' }
};

// Функция для обработки пользовательского ввода
function parseUserCommand(userText) {
  const text = userText.toLowerCase().trim();
  
  // Прямое соответствие
  if (COMMAND_MAPPINGS[text]) {
    return COMMAND_MAPPINGS[text];
  }
  
  // Поиск по регулярным выражениям
  for (const [pattern, command] of Object.entries(COMMAND_MAPPINGS)) {
    if (pattern.includes('(')) {
      const regex = new RegExp(pattern, 'i');
      const match = text.match(regex);
      if (match) {
        // Заменяем $1 на первую группу
        const result = { ...command };
        if (result.url && result.url.includes('$1')) {
          let url = match[1];
          // Добавляем протокол если нет
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          result.url = url;
        }
        if (result.alias && result.alias.includes('$1')) {
          result.alias = match[1];
        }
        return result;
      }
    }
  }
  
  // Если ничего не найдено - возвращаем say_ok
  return { command: 'say_ok' };
}
```

### Основная функция навыка

```javascript
const WEBHOOK_URL = 'https://your-ngrok-url.ngrok-free.app/command';
const ALICE_TOKEN = 'your_secure_token_here';

async function voiceCommandHandler(req, res) {
  const userText = req.body.request.command;
  const sessionId = req.body.session.session_id;
  
  console.log(`[${sessionId}] User said: "${userText}"`);
  
  try {
    // Парсим команду пользователя
    const commandPayload = parseUserCommand(userText);
    console.log(`[${sessionId}] Mapped to:`, commandPayload);
    
    // Отправляем на наш сервер
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ALICE-TOKEN': ALICE_TOKEN
      },
      body: JSON.stringify(commandPayload),
      timeout: 10000
    });
    
    const result = await response.json();
    console.log(`[${sessionId}] Server response:`, result);
    
    // Формируем ответ Алисе
    let aliceResponse;
    
    if (result.ok) {
      aliceResponse = generateSuccessResponse(commandPayload, result);
    } else {
      aliceResponse = generateErrorResponse(result.error);
    }
    
    res.json({
      response: {
        text: aliceResponse.text,
        tts: aliceResponse.tts || aliceResponse.text,
        end_session: false
      },
      version: '1.0'
    });
    
  } catch (error) {
    console.error(`[${sessionId}] Error:`, error);
    
    res.json({
      response: {
        text: 'Произошла ошибка при выполнении команды. Сервер недоступен.',
        tts: 'Произошла ошибка при выполнении команды.',
        end_session: false
      },
      version: '1.0'
    });
  }
}

// Генерация успешного ответа
function generateSuccessResponse(command, result) {
  switch (command.command) {
    case 'open_notepad':
      return {
        text: 'Блокнот открыт.',
        tts: 'Блокнот открыт.'
      };
      
    case 'open_chrome':
      const domain = extractDomain(command.url);
      return {
        text: `Открываю ${domain} в браузере.`,
        tts: `Открываю ${domain}.`
      };
      
    case 'shutdown_now':
      return {
        text: 'Компьютер выключается.',
        tts: 'Компьютер выключается. До свидания!'
      };
      
    case 'sleep_now':
      return {
        text: 'Компьютер переходит в спящий режим.',
        tts: 'Усыпляю компьютер.'
      };
      
    case 'open_app':
      return {
        text: `Запускаю ${command.alias}.`,
        tts: `Запускаю ${command.alias}.`
      };
      
    case 'say_ok':
      return {
        text: 'Система работает нормально.',
        tts: 'Всё в порядке.'
      };
      
    default:
      return {
        text: 'Команда выполнена.',
        tts: 'Готово.'
      };
  }
}

// Генерация ответа об ошибке
function generateErrorResponse(error) {
  if (error.includes('Rate limit')) {
    return {
      text: 'Слишком много команд. Попробуйте через минуту.',
      tts: 'Слишком много команд. Подождите немного.'
    };
  }
  
  if (error.includes('Unknown app alias')) {
    return {
      text: 'Приложение не найдено. Проверьте название.',
      tts: 'Приложение не найдено.'
    };
  }
  
  if (error.includes('Unauthorized')) {
    return {
      text: 'Ошибка авторизации сервера.',
      tts: 'Ошибка авторизации.'
    };
  }
  
  return {
    text: 'Не удалось выполнить команду.',
    tts: 'Команда не выполнена.'
  };
}

// Вспомогательная функция для извлечения домена
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'сайт';
  }
}
```

## Интенты в Яндекс.Диалогах

### Настройка интентов в админке

1. **Интент: OpenApp**
   - Слоты: `app_name` (строка)
   - Примеры фраз:
     - "запусти {app_name}"
     - "открой {app_name}"
     - "включи {app_name}"

2. **Интент: OpenWebsite**
   - Слоты: `website` (строка)
   - Примеры фраз:
     - "открой {website}"
     - "перейди на {website}"
     - "открой сайт {website}"

3. **Интент: SystemControl**
   - Слоты: `action` (перечисление: выключи, усыпи)
   - Примеры фраз:
     - "{action} компьютер"
     - "{action} пк"

4. **Интент: OpenNotepad**
   - Примеры фраз:
     - "запусти блокнот"
     - "открой блокнот"

### Обработка интентов

```javascript
function handleIntent(intent, slots) {
  switch (intent) {
    case 'OpenApp':
      const appName = slots.app_name;
      // Маппинг названий на алиасы
      const appAliases = {
        'калькулятор': 'calculator',
        'фотобудка': 'photobooth',
        'обс': 'obs',
        'пэинт': 'paint',
        'проводник': 'explorer',
        'диспетчер': 'taskmgr'
      };
      
      const alias = appAliases[appName.toLowerCase()];
      if (alias) {
        return { command: 'open_app', alias };
      }
      break;
      
    case 'OpenWebsite':
      let url = slots.website;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return { command: 'open_chrome', url };
      
    case 'SystemControl':
      const action = slots.action;
      if (action === 'выключи') {
        return { command: 'shutdown_now' };
      } else if (action === 'усыпи') {
        return { command: 'sleep_now' };
      }
      break;
      
    case 'OpenNotepad':
      return { command: 'open_notepad' };
  }
  
  return { command: 'say_ok' };
}
```

## Тестирование навыка

### Примеры фраз для тестирования

```
Пользователь: "Алиса, запусти блокнот"
Ожидаемый результат: Открытие notepad.exe

Пользователь: "Алиса, открой ютуб"
Ожидаемый результат: Открытие youtube.com в браузере

Пользователь: "Алиса, открой сайт github.com"
Ожидаемый результат: Открытие github.com в браузере

Пользователь: "Алиса, запусти калькулятор"
Ожидаемый результат: Открытие calc.exe

Пользователь: "Алиса, выключи компьютер"
Ожидаемый результат: Выключение ПК

Пользователь: "Алиса, усыпи компьютер"
Ожидаемый результат: Переход в спящий режим

Пользователь: "Алиса, тест"
Ожидаемый результат: "Всё в порядке"
```

### Отладка навыка

```javascript
// Добавить логирование для отладки
console.log('User input:', userText);
console.log('Parsed command:', commandPayload);
console.log('Server response:', result);

// Проверка доступности сервера перед отправкой команды
async function checkServerHealth() {
  try {
    const response = await fetch(WEBHOOK_URL.replace('/command', '/health'));
    const health = await response.json();
    return health.ok;
  } catch {
    return false;
  }
}

// Использование в основной функции
if (!(await checkServerHealth())) {
  return {
    text: 'Сервер управления недоступен.',
    tts: 'Сервер недоступен.'
  };
}
```

## Развертывание навыка

1. Создать навык в https://dialogs.yandex.ru/
2. Настроить webhook URL для навыка
3. Добавить интенты и примеры фраз
4. Загрузить код обработчика
5. Протестировать в симуляторе
6. Опубликовать навык

## Безопасность навыка

- Никогда не передавайте ALICE_TOKEN в открытом виде
- Используйте переменные окружения для секретов
- Ограничьте список разрешенных команд
- Добавьте проверку на подлинность запросов от Алисы