// Маппинг команд Алисы на API команды
const COMMAND_MAPPINGS = {
  // Команды активации навыка
  'запусти навык головной отрыв': { command: 'say_ok' },
  'запусти головной отрыв': { command: 'say_ok' },
  'головной отрыв': { command: 'say_ok' },
  '': { command: 'say_ok' },
  
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
  'запусти командную строку': { command: 'open_app', alias: 'cmd' },
  'открой командную строку': { command: 'open_app', alias: 'cmd' },
  'запусти паверши': { command: 'open_app', alias: 'powershell' },
  'открой паверши': { command: 'open_app', alias: 'powershell' },
  
  // Медиа управление
  'пауза': { command: 'media_pause' },
  'поставь на паузу': { command: 'media_pause' },
  'продолжи': { command: 'media_play' },
  'продолжи воспроизведение': { command: 'media_play' },
  'играй': { command: 'media_play' },
  'следующий трек': { command: 'media_next' },
  'следующая песня': { command: 'media_next' },
  'предыдущий трек': { command: 'media_previous' },
  'предыдущая песня': { command: 'media_previous' },
  'стоп': { command: 'media_stop' },
  'останови музыку': { command: 'media_stop' },
  'громкость выше': { command: 'volume_up' },
  'сделай громче': { command: 'volume_up' },
  'громкость ниже': { command: 'volume_down' },
  'сделай тише': { command: 'volume_down' },
  'выключи звук': { command: 'volume_mute' },
  'включи звук': { command: 'volume_unmute' },
  
  // Файловые операции  
  'открой загрузки': { command: 'open_downloads' },
  'покажи загрузки': { command: 'open_downloads' },
  'открой документы': { command: 'open_documents' },
  'покажи документы': { command: 'open_documents' },
  'открой рабочий стол': { command: 'open_desktop' },
  'покажи рабочий стол': { command: 'open_desktop' },
  'последний скачанный': { command: 'open_latest_download' },
  'что скачал последним': { command: 'open_latest_download' },
  
  // Системная информация
  'загрузка процессора': { command: 'system_cpu' },
  'процессор загружен': { command: 'system_cpu' },
  'свободное место': { command: 'system_disk' },
  'место на диске': { command: 'system_disk' },
  'сколько памяти': { command: 'system_memory' },
  'загрузка памяти': { command: 'system_memory' },
  'мой айпи': { command: 'system_ip' },
  'какой айпи': { command: 'system_ip' },
  'системная информация': { command: 'system_info' },
  'информация о системе': { command: 'system_info' },
  
  // Скриншоты и запись
  'сделай скрин': { command: 'screenshot' },
  'скриншот': { command: 'screenshot' },
  'сфоткай экран': { command: 'screenshot' },
  'запиши экран': { command: 'screen_record', duration: 10 },
  'запись экрана': { command: 'screen_record', duration: 10 },
  
  // Windows управление
  'сверни все окна': { command: 'minimize_all' },
  'сверни окна': { command: 'minimize_all' },
  'покажи рабочий стол': { command: 'show_desktop' },
  'заблокируй компьютер': { command: 'lock_screen' },
  'заблокируй экран': { command: 'lock_screen' },
  'очисти корзину': { command: 'empty_recycle_bin' },
  'опустоши корзину': { command: 'empty_recycle_bin' },
  
  // Дополнительные сайты
  'открой твич': { command: 'open_chrome', url: 'https://twitch.tv' },
  'открой гитхаб': { command: 'open_chrome', url: 'https://github.com' },
  'открой чатгпт': { command: 'open_chrome', url: 'https://chat.openai.com' },
  'открой клод': { command: 'open_chrome', url: 'https://claude.ai' },
  'открой вк': { command: 'open_chrome', url: 'https://vk.com' },
  'открой телеграм': { command: 'open_chrome', url: 'https://web.telegram.org' },
  
  // Fallback команды
  'тест': { command: 'say_ok' },
  'проверка': { command: 'say_ok' },
  'статус': { command: 'say_ok' }
};

module.exports = { COMMAND_MAPPINGS };