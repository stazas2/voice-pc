// Тестирование модульной структуры облачной функции локально
const { handler } = require('./cloud/index.js');

// Тест 1: Активация навыка
async function testActivation() {
  console.log('\n=== ТЕСТ 1: Активация навыка ===');
  const event = {
    request: { command: 'головной отрыв' },
    session: { session_id: 'test-1' }
  };
  
  const result = await handler(event, {});
  console.log('Запрос:', event.request.command);
  console.log('Ответ:', result.response.text);
}

// Тест 2: Команда блокнот
async function testNotepad() {
  console.log('\n=== ТЕСТ 2: Команда блокнот ===');
  const event = {
    request: { command: 'запусти блокнот' },
    session: { session_id: 'test-2' }
  };
  
  const result = await handler(event, {});
  console.log('Запрос:', event.request.command);
  console.log('Ответ:', result.response.text);
}

// Тест 3: Команда скриншот
async function testScreenshot() {
  console.log('\n=== ТЕСТ 3: Команда скриншот ===');
  const event = {
    request: { command: 'сделай скрин' },
    session: { session_id: 'test-3' }
  };
  
  const result = await handler(event, {});
  console.log('Запрос:', event.request.command);
  console.log('Ответ:', result.response.text);
}

// Тест 4: Неизвестная команда
async function testUnknown() {
  console.log('\n=== ТЕСТ 4: Неизвестная команда ===');
  const event = {
    request: { command: 'неизвестная команда' },
    session: { session_id: 'test-4' }
  };
  
  const result = await handler(event, {});
  console.log('Запрос:', event.request.command);
  console.log('Ответ:', result.response.text);
}

// Запускаем все тесты
async function runTests() {
  console.log('🧪 Тестирование модульной структуры облачной функции...\n');
  
  try {
    await testActivation();
    await testNotepad();
    await testScreenshot();
    await testUnknown();
    
    console.log('\n✅ Все тесты завершены!');
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error);
  }
}

runTests();