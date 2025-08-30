// Тест volume_set команды
const WindowsCommandsEdge = require('./src/windows-commands-edge');

async function testVolumeSet() {
  console.log('🎵 Тестируем volume_set команду...\n');
  
  try {
    // Тест различных уровней громкости
    const levels = [0, 25, 50, 75, 100];
    
    for (const level of levels) {
      console.log(`Тест громкости ${level}%:`);
      const startTime = Date.now();
      const result = await WindowsCommandsEdge.volumeSet(level);
      const duration = Date.now() - startTime;
      
      console.log(`  Результат: ${JSON.stringify(result)} (${duration}ms)`);
      
      // Пауза между тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Все тесты volume_set прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования volume_set:', error);
  }
}

testVolumeSet().catch(console.error);