// Тест реального закрытия calc
const WindowsCommandsEdge = require('./src/windows-commands-edge');

async function testRealClose() {
  console.log('🧮 Тестируем реальное закрытие калькулятора...\n');
  
  try {
    console.log('Попытка закрыть calc:');
    const startTime = Date.now();
    const result = await WindowsCommandsEdge.closeWindow('calc');
    const duration = Date.now() - startTime;
    
    console.log(`Результат: ${JSON.stringify(result)} (${duration}ms)`);
    
    if (result.closedCount > 0) {
      console.log('✅ Калькулятор успешно закрыт!');
    } else {
      console.log('ℹ️ Калькулятор не найден или уже был закрыт');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testRealClose().catch(console.error);