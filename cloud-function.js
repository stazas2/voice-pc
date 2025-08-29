// Alice skill for Yandex Cloud Functions
  const WEBHOOK_URL = 'https://2d19b7c3c5f5.ngrok-free.app/command';
  const ALICE_TOKEN = 'VoicePC_SecureToken_2024_abcd1234efgh5678';

  // Command mappings (твои команды остаются)
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

  function parseUserCommand(userText) {
    const text = userText.toLowerCase().trim();
    if (COMMAND_MAPPINGS[text]) {
      return COMMAND_MAPPINGS[text];
    }
    return { command: 'say_ok' };
  }

  module.exports.handler = async (event, context) => {
    // ИСПРАВЛЕНО: event уже содержит данные от Алисы
    const req = event;

    const userText = req.request?.command || '';
    const sessionId = req.session?.session_id || 'unknown';

    console.log(`[${sessionId}] User said: "${userText}"`);

    try {
      // Парсим команду пользователя в формат API
      const commandPayload = parseUserCommand(userText);
      console.log(`[${sessionId}] Mapped to:`, commandPayload);

      const https = require('https');
      const url = require('url');

      const requestData = JSON.stringify(commandPayload);

      const options = url.parse(WEBHOOK_URL);
      options.method = 'POST';
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'X-ALICE-TOKEN': ALICE_TOKEN
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.write(requestData);
        req.end();
      });

      console.log(`[${sessionId}] PC response:`, result);

      // Формируем ответ для Алисы на основе результата
      let responseText;
      if (result.ok) {
        switch (commandPayload.command) {
          case 'open_notepad':
            responseText = 'Блокнот открыт.';
            break;
          case 'open_chrome':
            responseText = `Открываю ${commandPayload.url?.replace('https://',
  '').split('/')[0] || 'браузер'}.`;
            break;
          case 'say_ok':
          default:
            responseText = 'OK. Система работает.';
        }
      } else {
        responseText = `Ошибка: ${result.error}`;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          response: {
            text: responseText,
            tts: responseText,
            end_session: false
          },
          version: '1.0'
        })
      };

    } catch (error) {
      console.error(`[${sessionId}] Error:`, error);

      return {
        statusCode: 200,
        body: JSON.stringify({
          response: {
            text: 'Сервер недоступен. Проверьте подключение к компьютеру.',
            tts: 'Сервер недоступен.',
            end_session: false
          },
          version: '1.0'
        })
      };
    }
  };