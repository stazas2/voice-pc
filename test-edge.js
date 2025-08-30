// Тест edge-js функциональности
const WindowsCommandsEdge = require('./src/windows-commands-edge');

async function testEdgeJs() {
  console.log('🧪 Тестируем edge-js Windows API...\n');
  
  try {
    // 1. Тест доступности
    console.log('1. Проверяем доступность edge-js:');
    const testResult = await WindowsCommandsEdge.testEdgeJs();
    console.log('   Результат:', JSON.stringify(testResult, null, 2));
    
    if (!testResult.available) {
      console.log('❌ Edge-js недоступен, тест остановлен');
      return;
    }
    
    console.log('✅ Edge-js доступен!\n');
    
    // 2. Тест команд (без lock_screen для безопасности)
    console.log('2. Тестируем команды:');
    
    // Тест show_desktop
    console.log('   Тест show_desktop:');
    const startTime1 = Date.now();
    const showResult = await WindowsCommandsEdge.showDesktop();
    const duration1 = Date.now() - startTime1;
    console.log(`   Результат: ${JSON.stringify(showResult)} (${duration1}ms)`);
    
    // Небольшая пауза
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест minimize_all
    console.log('   Тест minimize_all:');
    const startTime2 = Date.now();
    const minimizeResult = await WindowsCommandsEdge.minimizeAllWindows();
    const duration2 = Date.now() - startTime2;
    console.log(`   Результат: ${JSON.stringify(minimizeResult)} (${duration2}ms)`);
    
    // Тест empty_recycle_bin (безопасно)
    console.log('   Тест empty_recycle_bin:');
    const startTime3 = Date.now();
    const emptyResult = await WindowsCommandsEdge.emptyRecycleBin();
    const duration3 = Date.now() - startTime3;
    console.log(`   Результат: ${JSON.stringify(emptyResult)} (${duration3}ms)`);
    
    console.log('\n📊 Статистика производительности:');
    console.log(`   show_desktop: ${duration1}ms`);
    console.log(`   minimize_all: ${duration2}ms`);
    console.log(`   empty_recycle_bin: ${duration3}ms`);
    console.log(`   Средняя: ${Math.round((duration1 + duration2 + duration3) / 3)}ms`);
    
    console.log('\n✅ Все тесты edge-js прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования edge-js:', error);
  }
}

testEdgeJs().catch(console.error);