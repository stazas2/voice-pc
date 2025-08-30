// Тест облачной функции локально
const { handler } = require('./cloud-function.js');

// Имитируем запрос от Алисы
const mockAliceRequest = {
  request: {
    command: 'блокнот',
    original_utterance: 'блокнот',
    type: 'SimpleUtterance',
    markup: { dangerous_context: false },
    payload: {}
  },
  session: {
    session_id: 'test-session-123',
    message_id: 1,
    user_id: 'test-user',
    new: false
  },
  meta: {
    locale: 'ru-RU',
    timezone: 'UTC',
    client_id: 'test-client',
    interfaces: {}
  },
  version: '1.0'
};

console.log('🧪 Тестирую облачную функцию...');
console.log('Запрос Алисы:', JSON.stringify(mockAliceRequest, null, 2));

handler(mockAliceRequest, {})
  .then(response => {
    console.log('✅ Ответ функции:');
    console.log(JSON.stringify(response, null, 2));
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
  });