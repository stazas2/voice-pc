// Тестовый симулятор навыка Алисы
const { default: fetch } = require('node-fetch');

// Импортируем функции из alice-skill-complete.js
const WEBHOOK_URL = 'https://87175e170555.ngrok-free.app/webhook';

const COMMAND_MAPPINGS = {
  'запусти блокнот': { command: 'open_notepad' },
  'открой блокнот': { command: 'open_notepad' },
  'блокнот': { command: 'open_notepad' },
  'открой ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
  'запусти ютуб': { command: 'open_chrome', url: 'https://youtube.com' },
  'тест': { command: 'say_ok' },
  'проверка': { command: 'say_ok' }
};

function parseUserCommand(userText) {
  const text = userText.toLowerCase().trim();
  if (COMMAND_MAPPINGS[text]) {
    return COMMAND_MAPPINGS[text];
  }
  return { command: 'say_ok' };
}

async function testAliceSkill(userText) {
  const sessionId = 'test-' + Date.now();
  
  console.log(`\n🎤 Пользователь сказал: "${userText}"`);
  
  try {
    // Симулируем запрос от Алисы к навыку
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
    console.log(`✅ Ответ сервера:`, result);
    
    if (result.response) {
      console.log(`🤖 Алиса ответит: "${result.response.text}"`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Ошибка:`, error.message);
    return null;
  }
}

// Тестовые команды
async function runTests() {
  console.log('🚀 Тестирование навыка Алисы...\n');
  
  const testCommands = [
    'тест',
    'блокнот',
    'запусти блокнот',
    'открой ютуб',
    'проверка'
  ];
  
  for (const command of testCommands) {
    await testAliceSkill(command);
    await new Promise(resolve => setTimeout(resolve, 1000)); // пауза 1 сек
  }
  
  console.log('\n✅ Тестирование завершено!');
}

runTests().catch(console.error);