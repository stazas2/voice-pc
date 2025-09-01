// Генерация ответов для Алисы с эмоциями
const config = require('../config/config');

// Утилита для получения случайного ответа из массива
function getRandomResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)];
}

// Утилита для получения специализированного ответа по категории
function getCategoryResponse(category, fallback = 'success') {
  const categoryResponses = config.responses[category];
  if (categoryResponses && categoryResponses.success) {
    return getRandomResponse(categoryResponses.success);
  }
  return getRandomResponse(config.responses[fallback]);
}

function generateResponse(commandPayload, result, userText) {
  if (result.ok) {
    switch (commandPayload.command) {
      // Базовые команды с эмоциональными ответами
      case 'open_notepad':
        return '📝 ' + getRandomResponse([
          'Блокнот открыт! Готов к записям!',
          'Открываю блокнот! Время для творчества!',
          'Блокнот запущен! Записывайте идеи!'
        ]);
        
      case 'open_chrome':
        const siteName = commandPayload.url?.replace('https://', '').split('/')[0] || 'браузер';
        return '🌐 ' + getRandomResponse([
          `Открываю ${siteName}! Приятного сёрфинга!`,
          `Запускаю ${siteName}! Интернет ждёт!`,
          `${siteName} загружается! В путь по сети!`
        ]);
        
      case 'open_app':
        const appName = commandPayload.alias || 'приложение';
        return '🚀 ' + getRandomResponse([
          `Запускаю ${appName}! Работаем!`,
          `Открываю ${appName}! В бой!`,
          `${appName} стартует! Удачной работы!`
        ]);
        
      case 'shutdown_now':
        return '💤 ' + getRandomResponse([
          'Компьютер выключается! Спокойной ночи!',
          'Отправляю компьютер спать! До встречи!',
          'Выключение запущено! Хороших снов!'
        ]);
        
      case 'shutdown_delayed':
        const delayTime = result.data?.delay || 'неизвестное время';
        return `⏰ Компьютер выключится через ${delayTime}! ` + getRandomResponse([
          'Не забудьте сохранить работу!',
          'У вас есть время завершить дела!',
          'Время на последние приготовления!'
        ]);
        
      case 'shutdown_cancel':
        return '✋ ' + getRandomResponse([
          'Выключение отменено! Работаем дальше!',
          'Остаюсь включенным! Продолжаем!',
          'Отмена принята! ПК остается онлайн!'
        ]);
        
      case 'sleep_now':
        return '😴 ' + getRandomResponse([
          'Компьютер в спящий режим! Отдыхаем!',
          'Перевожу в сон! Энергия экономится!',
          'Спящий режим активирован! Сны приятные!'
        ]);
        
      // Медиа команды с музыкальными эмоциями
      case 'media_pause':
      case 'media_play':
      case 'media_next':
      case 'media_previous':
      case 'media_stop':
      case 'volume_up':
      case 'volume_down':
      case 'volume_mute':
      case 'volume_unmute':
      case 'volume_set':
        return getCategoryResponse('media');
        
      case 'chrome_media_pause':
        return '🎬 ' + getRandomResponse([
          'Видео поставлено на паузу! Перерывчик?',
          'Фильм остановлен! Время подумать!',
          'YouTube на паузе! Отдыхаем!'
        ]);
        
      // Файловые операции
      case 'open_downloads':
        return '📁 ' + getRandomResponse([
          'Открываю загрузки! Посмотрим, что скачали!',
          'Папка загрузок готова! Ищите файлы!',
          'Загрузки открыты! Всё на месте!'
        ]);
      case 'open_documents':
        return '📄 ' + getRandomResponse([
          'Документы открыты! Творите и работайте!',
          'Папка документов готова! Время работать!',
          'Открываю документы! Всё организовано!'
        ]);
      case 'open_desktop':
        return '🖥️ ' + getRandomResponse([
          'Рабочий стол показан! Чистота и порядок!',
          'Десктоп готов! Всё на своих местах!',
          'Рабочий стол открыт! Красота!'
        ]);
      case 'open_latest_download':
        return '⬇️ ' + getRandomResponse([
          'Открываю последний файл! Что скачали?',
          'Последняя загрузка готова! Смотрим!',
          'Свежий файл открывается! Интересно!'
        ]);
        
      // Системная информация с данными
      case 'system_cpu':
        return `💻 Процессор загружен на ${result.data?.cpu || 'неизвестно'}! ` + 
               getRandomResponse(['Всё под контролем!', 'Мониторим работу!', 'Система в норме!']);
      case 'system_memory':
        return `🧠 Память использована на ${result.data?.memory || 'неизвестно'}! ` + 
               getRandomResponse(['Оперативка работает!', 'Ресурсы контролируем!', 'Всё оптимально!']);
      case 'system_disk':
        return `💾 Место на диске: ${result.data?.disk || 'неизвестно'}! ` + 
               getRandomResponse(['Пространство есть!', 'Диск в порядке!', 'Места хватает!']);
      case 'system_ip':
        return `🌐 Ваш IP: ${result.data?.ip || 'скрыт'}! ` + 
               getRandomResponse(['Адрес определён!', 'Соединение активно!', 'В сети вы есть!']);
      case 'system_info':
        return getCategoryResponse('system') + ' Информация собрана!';
        
      // Скриншоты и запись
      case 'screenshot':
        return '📸 ' + getRandomResponse([
          'Скриншот сделан! Момент сохранён!',
          'Фото экрана готово! Зафиксировали!',
          'Снимок экрана! Красота заснята!'
        ]);
      case 'screen_record':
        const duration = commandPayload.duration || 10;
        return `🎥 Записываю экран ${duration} секунд! ` + getRandomResponse([
          'Экшн начинается!', 'Камера, мотор!', 'Запись пошла!'
        ]);
        
      // Windows управление
      case 'minimize_all':
      case 'show_desktop':
      case 'lock_screen':
      case 'empty_recycle_bin':
      case 'close_window':
      case 'focus_window':
      case 'maximize_window':
        return getCategoryResponse('system');
        
      // Chrome управление  
      case 'chrome_new_tab':
      case 'chrome_close_tab':
      case 'chrome_refresh':
      case 'chrome_fullscreen_media':
      case 'chrome_scroll_down':
      case 'chrome_scroll_up':
      case 'chrome_find_text':
      case 'chrome_click_link':
        return getCategoryResponse('chrome');
        
      // Notion интеграция
      case 'notion_today_tasks':
        const taskCount = result.data?.count || 0;
        const taskList = result.data?.tasks || '';
        if (taskCount === 0) {
          return '📋 На сегодня задач нет! Отличный день для отдыха! ✨';
        }
        return `📋 Ваши задачи на сегодня: ${taskList}. Всего ${taskCount} задач.`;
      case 'notion_upcoming_events':
        const eventCount = result.data?.count || 0;
        return `📅 ${eventCount} событий на неделе! ` + getCategoryResponse('notion');
      case 'notion_create_task':
        return `✅ Задача "${result.data?.title || 'новая'}" создана! ` + getCategoryResponse('notion');
        
      // Profile system
      case 'activate_profile':
        const profileName = result.data?.profileName || 'неизвестный';
        return `🎯 Профиль "${profileName}" активирован! ` + getRandomResponse([
          'Рабочая среда настроена!',
          'Всё организовано как надо!',
          'Идеальное рабочее пространство!'
        ]);
      case 'tile_windows':
        const layout = result.details?.layout || 'split';
        return `🏗️ Окна организованы в режиме "${layout}"! ` + getRandomResponse([
          'Порядок наведён!',
          'Всё на своих местах!',
          'Красота и функциональность!'
        ]);
        
      case 'say_ok':
      default:
        if (userText.includes('навык') || userText === '') {
          return getRandomResponse(config.responses.welcome);
        } else {
          return getRandomResponse(config.responses.success);
        }
    }
  } else {
    return getRandomResponse(config.responses.error);
  }
}

module.exports = { generateResponse };