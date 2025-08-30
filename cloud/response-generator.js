// Генерация ответов для Алисы
function generateResponse(commandPayload, result, userText) {
  if (result.ok) {
    switch (commandPayload.command) {
      case 'open_notepad':
        return 'Блокнот открыт.';
        
      case 'open_chrome':
        return `Открываю ${commandPayload.url?.replace('https://', '').split('/')[0] || 'браузер'}.`;
        
      case 'open_app':
        return `Запускаю ${commandPayload.alias || 'приложение'}.`;
        
      case 'shutdown_now':
        return 'Компьютер выключается.';
        
      case 'sleep_now':
        return 'Компьютер переходит в спящий режим.';
        
      // Медиа команды
      case 'media_pause':
        return 'Ставлю на паузу.';
      case 'media_play':
        return 'Продолжаю воспроизведение.';
      case 'media_next':
        return 'Переключаю на следующий трек.';
      case 'media_previous':
        return 'Переключаю на предыдущий трек.';
      case 'media_stop':
        return 'Останавливаю музыку.';
      case 'volume_up':
        return 'Увеличиваю громкость.';
      case 'volume_down':
        return 'Уменьшаю громкость.';
      case 'volume_mute':
        return 'Выключаю звук.';
      case 'volume_unmute':
        return 'Включаю звук.';
        
      // Файловые операции
      case 'open_downloads':
        return 'Открываю папку загрузок.';
      case 'open_documents':
        return 'Открываю папку документов.';
      case 'open_desktop':
        return 'Показываю рабочий стол.';
      case 'open_latest_download':
        return 'Открываю последний скачанный файл.';
        
      // Системная информация
      case 'system_cpu':
        return `Загрузка процессора: ${result.data?.cpu || 'неизвестно'}%.`;
      case 'system_memory':
        return `Использовано памяти: ${result.data?.memory || 'неизвестно'}%.`;
      case 'system_disk':
        return `Свободно места: ${result.data?.disk || 'неизвестно'}.`;
      case 'system_ip':
        return `Ваш IP адрес: ${result.data?.ip || 'неизвестен'}.`;
      case 'system_info':
        return 'Получаю информацию о системе.';
        
      // Скриншоты и запись
      case 'screenshot':
        return 'Делаю скриншот.';
      case 'screen_record':
        return `Записываю экран ${commandPayload.duration || 10} секунд.`;
        
      // Windows управление
      case 'minimize_all':
        return 'Сворачиваю все окна.';
      case 'show_desktop':
        return 'Показываю рабочий стол.';
      case 'lock_screen':
        return 'Блокирую компьютер.';
      case 'empty_recycle_bin':
        return 'Очищаю корзину.';
        
      case 'say_ok':
      default:
        if (userText.includes('навык') || userText === '') {
          return 'Привет! Я управляю твоим компьютером. Попробуй: "блокнот", "пауза", "скриншот" или "загрузка процессора".';
        } else {
          return 'OK. Система работает.';
        }
    }
  } else {
    return `Ошибка: ${result.error}`;
  }
}

module.exports = { generateResponse };