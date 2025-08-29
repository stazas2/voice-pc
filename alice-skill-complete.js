// Полный код навыка Алисы для консоли разработчика
// Webhook URL: https://aa989a8b303e.ngrok-free.app/webhook

const WEBHOOK_URL = 'https://87175e170555.ngrok-free.app/webhook';
const ALICE_TOKEN = 'VoicePC_SecureToken_2024_abcd1234efgh5678';

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
  'запусти проводник': { command: 'open_app', alias: 'explorer' },
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
  
  // Если ничего не найдено - возвращаем say_ok
  return { command: 'say_ok' };
}

// Основная функция навыка
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        request: { command: userText },
        session: { session_id: sessionId }
      })
    });
    
    const result = await response.json();
    console.log(`[${sessionId}] Server response:`, result);
    
    // Формируем ответ Алисе
    let aliceResponse;
    
    if (result.response) {
      aliceResponse = {
        text: result.response.text,
        tts: result.response.tts || result.response.text
      };
    } else {
      aliceResponse = generateErrorResponse('Неизвестная ошибка');
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
      const domain = command.url ? command.url.replace('https://', '').split('/')[0] : 'браузер';
      return {
        text: `Открываю ${domain}.`,
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
    default:
      return {
        text: 'OK. Система работает.',
        tts: 'OK. Система работает.'
      };
  }
}

// Генерация ответа об ошибке
function generateErrorResponse(error) {
  return {
    text: `Ошибка: ${error}`,
    tts: 'Произошла ошибка при выполнении команды.'
  };
}

// Экспорт функции (для Яндекс.Облако)
module.exports.handler = voiceCommandHandler;