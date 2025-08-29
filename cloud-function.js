// Alice skill for Yandex Cloud Functions
// Connects to your local PC via ngrok

const WEBHOOK_URL = 'https://18374d97e1f4.ngrok-free.app/command';
const ALICE_TOKEN = 'VoicePC_SecureToken_2024_abcd1234efgh5678';

// Command mappings
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

// Main handler for Yandex Cloud Functions
module.exports.handler = async (event, context) => {
  const req = JSON.parse(event.body || '{}');
  
  const userText = req.request?.command || '';
  const sessionId = req.session?.session_id || 'unknown';
  
  console.log(`[${sessionId}] User said: "${userText}"`);
  
  try {
    // Send request to your PC server
    const https = require('https');
    const url = require('url');
    
    const requestData = JSON.stringify({
      request: { command: userText },
      session: { session_id: sessionId }
    });
    
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
    
    // Return Alice response
    let aliceResponse;
    if (result.response) {
      aliceResponse = {
        text: result.response.text,
        tts: result.response.tts || result.response.text
      };
    } else {
      aliceResponse = {
        text: 'Произошла ошибка при выполнении команды.',
        tts: 'Произошла ошибка при выполнении команды.'
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        response: {
          text: aliceResponse.text,
          tts: aliceResponse.tts,
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