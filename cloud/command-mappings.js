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
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚀 WINDOWS УПРАВЛЕНИЕ (Edge-js API - высокая производительность)
  // ═══════════════════════════════════════════════════════════════════
  
  // Минимизация окон (EnumWindows + ShowWindow API)
  'сверни все окна': { command: 'minimize_all' },
  'сверни окна': { command: 'minimize_all' },
  'закрой все окна': { command: 'minimize_all' },
  
  // Показ рабочего стола (FindWindow + ShowWindow API)
  'покажи рабочий стол': { command: 'show_desktop' },
  'покажи десктоп': { command: 'show_desktop' },
  'рабочий стол': { command: 'show_desktop' },
  
  // Блокировка экрана (LockWorkStation API)
  'заблокируй компьютер': { command: 'lock_screen' },
  'заблокируй экран': { command: 'lock_screen' },
  'заблокируй пк': { command: 'lock_screen' },
  'блокировка': { command: 'lock_screen' },
  
  // Очистка корзины (SHEmptyRecycleBin API)  
  'очисти корзину': { command: 'empty_recycle_bin' },
  'опустоши корзину': { command: 'empty_recycle_bin' },
  'удали всё из корзины': { command: 'empty_recycle_bin' },
  
  // Точное управление громкостью (SendMessage API)
  'громкость ноль': { command: 'volume_set', level: 0 },
  'громкость десять': { command: 'volume_set', level: 10 },
  'громкость двадцать': { command: 'volume_set', level: 20 },
  'громкость тридцать': { command: 'volume_set', level: 30 },
  'громкость сорок': { command: 'volume_set', level: 40 },
  'громкость пятьдесят': { command: 'volume_set', level: 50 },
  'громкость шестьдесят': { command: 'volume_set', level: 60 },
  'громкость семьдесят': { command: 'volume_set', level: 70 },
  'громкость восемьдесят': { command: 'volume_set', level: 80 },
  'громкость девяносто': { command: 'volume_set', level: 90 },
  'громкость сто': { command: 'volume_set', level: 100 },
  'громкость максимум': { command: 'volume_set', level: 100 },
  'звук максимум': { command: 'volume_set', level: 100 },
  'звук на максимум': { command: 'volume_set', level: 100 },
  'звук на ноль': { command: 'volume_set', level: 0 },
  'звук половину': { command: 'volume_set', level: 50 },
  'звук треть': { command: 'volume_set', level: 33 },
  'звук четверть': { command: 'volume_set', level: 25 },
  
  // Закрытие конкретных окон (PostMessage + WM_CLOSE API)
  'закрой хром': { command: 'close_window', processName: 'chrome' },
  'закрой браузер': { command: 'close_window', processName: 'chrome' },
  'убей хром': { command: 'close_window', processName: 'chrome' },
  'закрой блокнот': { command: 'close_window', processName: 'notepad' },
  'убей блокнот': { command: 'close_window', processName: 'notepad' },
  'закрой проводник': { command: 'close_window', processName: 'explorer' },
  'убей проводник': { command: 'close_window', processName: 'explorer' },
  'закрой терминал': { command: 'close_window', processName: 'WindowsTerminal' },
  'закрой консоль': { command: 'close_window', processName: 'cmd' },
  'убей консоль': { command: 'close_window', processName: 'cmd' },
  'закрой калькулятор': { command: 'close_window', processName: 'calc' },
  'убей калькулятор': { command: 'close_window', processName: 'calc' },
  'закрой паинт': { command: 'close_window', processName: 'mspaint' },
  'убей паинт': { command: 'close_window', processName: 'mspaint' },
  'закрой ворд': { command: 'close_window', processName: 'winword' },
  'убей ворд': { command: 'close_window', processName: 'winword' },
  'закрой эксель': { command: 'close_window', processName: 'excel' },
  'убей эксель': { command: 'close_window', processName: 'excel' },
  'закрой дискорд': { command: 'close_window', processName: 'Discord' },
  'убей дискорд': { command: 'close_window', processName: 'Discord' },
  'закрой телеграм': { command: 'close_window', processName: 'Telegram' },
  'убей телеграм': { command: 'close_window', processName: 'Telegram' },
  
  // Фокусировка на конкретных окнах (SetForegroundWindow API)
  'переключись на хром': { command: 'focus_window', processName: 'chrome' },
  'переключись на браузер': { command: 'focus_window', processName: 'chrome' },
  'активируй хром': { command: 'focus_window', processName: 'chrome' },
  'переключись на блокнот': { command: 'focus_window', processName: 'notepad' },
  'активируй блокнот': { command: 'focus_window', processName: 'notepad' },
  'переключись на проводник': { command: 'focus_window', processName: 'explorer' },
  'активируй проводник': { command: 'focus_window', processName: 'explorer' },
  'переключись на терминал': { command: 'focus_window', processName: 'WindowsTerminal' },
  'активируй терминал': { command: 'focus_window', processName: 'WindowsTerminal' },
  'переключись на консоль': { command: 'focus_window', processName: 'cmd' },
  'активируй консоль': { command: 'focus_window', processName: 'cmd' },
  'переключись на калькулятор': { command: 'focus_window', processName: 'calc' },
  'активируй калькулятор': { command: 'focus_window', processName: 'calc' },
  'переключись на дискорд': { command: 'focus_window', processName: 'Discord' },
  'активируй дискорд': { command: 'focus_window', processName: 'Discord' },
  'переключись на телеграм': { command: 'focus_window', processName: 'Telegram' },
  'активируй телеграм': { command: 'focus_window', processName: 'Telegram' },
  'переключись на код': { command: 'focus_window', processName: 'Code' },
  'активируй код': { command: 'focus_window', processName: 'Code' },
  'переключись на vscode': { command: 'focus_window', processName: 'Code' },
  'активируй vscode': { command: 'focus_window', processName: 'Code' },
  
  // Максимизация конкретных окон (ShowWindow + SW_MAXIMIZE API)
  'разверни хром': { command: 'maximize_window', processName: 'chrome' },
  'разверни браузер': { command: 'maximize_window', processName: 'chrome' },
  'максимизируй хром': { command: 'maximize_window', processName: 'chrome' },
  'разверни блокнот': { command: 'maximize_window', processName: 'notepad' },
  'максимизируй блокнот': { command: 'maximize_window', processName: 'notepad' },
  'разверни проводник': { command: 'maximize_window', processName: 'explorer' },
  'максимизируй проводник': { command: 'maximize_window', processName: 'explorer' },
  'разверни терминал': { command: 'maximize_window', processName: 'WindowsTerminal' },
  'максимизируй терминал': { command: 'maximize_window', processName: 'WindowsTerminal' },
  'разверни консоль': { command: 'maximize_window', processName: 'cmd' },
  'максимизируй консоль': { command: 'maximize_window', processName: 'cmd' },
  'разверни калькулятор': { command: 'maximize_window', processName: 'calc' },
  'максимизируй калькулятор': { command: 'maximize_window', processName: 'calc' },
  'разверни дискорд': { command: 'maximize_window', processName: 'Discord' },
  'максимизируй дискорд': { command: 'maximize_window', processName: 'Discord' },
  'разверни телеграм': { command: 'maximize_window', processName: 'Telegram' },
  'максимизируй телеграм': { command: 'maximize_window', processName: 'Telegram' },
  'разверни код': { command: 'maximize_window', processName: 'Code' },
  'максимизируй код': { command: 'maximize_window', processName: 'Code' },
  'разверни vscode': { command: 'maximize_window', processName: 'Code' },
  'максимизируй vscode': { command: 'maximize_window', processName: 'Code' },
  
  // ═══════════════════════════════════════════════════════════════════
  
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