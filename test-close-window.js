// Тест close_window команды
const WindowsCommandsEdge = require('./src/windows-commands-edge');

async function testCloseWindow() {
  console.log('🪟 Тестируем close_window команду...\n');
  
  try {
    // Тест закрытия calc (если есть)
    console.log('Тест закрытия calc (калькулятор):');
    const startTime = Date.now();
    const result = await WindowsCommandsEdge.closeWindow('calc');
    const duration = Date.now() - startTime;
    
    console.log(`  Результат: ${JSON.stringify(result)} (${duration}ms)`);
    
    // Небольшая пауза
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест закрытия notepad (если есть)
    console.log('Тест закрытия notepad (блокнот):');
    const startTime2 = Date.now();
    const result2 = await WindowsCommandsEdge.closeWindow('notepad');
    const duration2 = Date.now() - startTime2;
    
    console.log(`  Результат: ${JSON.stringify(result2)} (${duration2}ms)`);
    
    console.log('\n✅ Тесты close_window завершены!');
    console.log('ℹ️ Если процессы не найдены - это нормально, команда работает корректно');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования close_window:', error);
  }
}

testCloseWindow().catch(console.error);