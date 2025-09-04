// NLP-парсер для естественного языка
const logger = require('../utils/logger');

class NLPParser {
    constructor() {
        // Словарь синонимов приложений
        this.appSynonyms = {
            // Microsoft Office
            'ворд': 'winword',
            'word': 'winword',
            'майкрософт ворд': 'winword',
            'эксель': 'excel',
            'excel': 'excel',
            'майкрософт эксель': 'excel',
            'презентации': 'powerpnt',
            'пауэрпоинт': 'powerpnt',
            'powerpoint': 'powerpnt',
            
            // Мессенджеры
            'дискорд': 'discord',
            'discord': 'discord',
            'телеграм': 'telegram',
            'телега': 'telegram',
            'telegram': 'telegram',
            'скайп': 'skype',
            'skype': 'skype',
            'вотсап': 'whatsapp',
            'whatsapp': 'whatsapp',
            'вайбер': 'viber',
            'viber': 'viber',
            
            // Браузеры
            'хром': 'chrome',
            'chrome': 'chrome',
            'гугл хром': 'chrome',
            'фаерфокс': 'firefox',
            'firefox': 'firefox',
            'мозилла': 'firefox',
            'эдж': 'msedge',
            'edge': 'msedge',
            
            // Медиа
            'спотифай': 'spotify',
            'spotify': 'spotify',
            'стим': 'steam',
            'steam': 'steam',
            'влс': 'vlc',
            'vlc': 'vlc',
            
            // Творчество
            'фотошоп': 'photoshop',
            'photoshop': 'photoshop',
            'иллюстратор': 'illustrator',
            'illustrator': 'illustrator',
            'премьер': 'premiere',
            'premiere': 'premiere',
            
            // Системные
            'блокнот': 'notepad',
            'notepad': 'notepad',
            'калькулятор': 'calc',
            'calculator': 'calc',
            'calc': 'calc',
            'проводник': 'explorer',
            'explorer': 'explorer',
            'консоль': 'cmd',
            'командная строка': 'cmd',
            'cmd': 'cmd',
            'паверши': 'powershell',
            'powershell': 'powershell'
        };

        // Intent patterns для разных типов команд
        this.intentPatterns = {
            // Поиск фильмов (ВЫСШИЙ ПРИОРИТЕТ - проверяем первыми!)
            find_movie: [
                /^(?:найди|открой|включи|запусти|покажи)\s+(?:фильм|кино|картину)\s+(.+?)$/i,
                /^(?:найди|открой|включи|запусти|покажи)\s+(?:сериал)\s+(.+?)$/i,
                /^(?:хочу\s+посмотреть)\s+(?:фильм\s+)?(.+?)$/i,
                /^(?:хочу\s+)?(?:сериал)\s+(.+?)$/i,
                /^(?:поиск\s+фильма)\s+(.+?)$/i,
                /^(?:найди|найти)\s+(.+?)\s+(?:фильм|кино)$/i,
                /^(?:включи|запусти)\s+(.+?)(?:\s+(?:девяносто|две тысячи|двухтысячный)\s*\w*)?(?:\s+год[а-я]*)?$/i
            ],

            // Открытие сайтов  
            open_website: [
                /^(?:открой|перейди на|зайди на)\s+(?:сайт\s+)?(?!(?:фильм|кино|сериал)\s)(.+?)$/i,
                /^(?:можешь\s+)?(?:открыть|перейти на)\s+(?:сайт\s+)?(?!(?:фильм|кино|сериал)\s)(.+?)$/i
            ],

            // Запуск приложений (исключаем слово "сайт" и фильмы)
            open_app: [
                /^(?:запусти|включи|старт)\s+(?!(?:фильм|кино|сериал)\s)(.+?)(?:\s+приложение)?$/i,
                /^(?:можешь\s+)?(?:запустить|включить)\s+(?!(?:фильм|кино|сериал)\s)(.+?)(?:\s+приложение)?$/i,
                /^(?:давай\s+)?(?:запустим|откроем)\s+(?!(?:фильм|кино|сериал)\s)(.+?)$/i,
                /^открой\s+(?!сайт\s)(?!(?:фильм|кино|сериал)\s)(.+?)(?:\s+приложение)?$/i
            ],

            // Команды окон
            close_window: [
                /^(?:закрой|убей|выключи)\s+(?:окно|приложение|программу)$/i,
                /^(?:можешь\s+)?(?:закрыть|убить)\s+(?:окно|приложение|программу)$/i
            ],

            maximize_window: [
                /^(?:разверни|максимизируй|увеличь)\s+(?:окно|экран)$/i,
                /^(?:полный\s+экран|максимум|максимально)$/i,
                /^(?:можешь\s+)?(?:развернуть|максимизировать)\s+(?:окно|экран)$/i
            ],

            minimize_window: [
                /^(?:сверни|сожми|убери)\s+(?:окно|приложение)$/i,
                /^(?:можешь\s+)?(?:свернуть|убрать)\s+(?:окно|приложение)$/i
            ],

            // Системные команды
            system_command: [
                /^(?:выключи|перезагрузи|усыпи)\s+(?:компьютер|пк|ноутбук)$/i,
                /^(?:заблокируй|заблокировать)\s+(?:экран|компьютер|пк)$/i
            ]
        };

        // Сайты и их URL
        this.websiteMap = {
            'гугл': 'https://google.com',
            'google': 'https://google.com',
            'ютуб': 'https://youtube.com',
            'youtube': 'https://youtube.com',
            'ютюб': 'https://youtube.com',
            'вк': 'https://vk.com',
            'вконтакте': 'https://vk.com',
            'фейсбук': 'https://facebook.com',
            'facebook': 'https://facebook.com',
            'инстаграм': 'https://instagram.com',
            'instagram': 'https://instagram.com',
            'твиттер': 'https://twitter.com',
            'twitter': 'https://twitter.com',
            'гитхаб': 'https://github.com',
            'github': 'https://github.com',
            'чатгпт': 'https://chat.openai.com',
            'chatgpt': 'https://chat.openai.com',
            'клод': 'https://claude.ai',
            'claude': 'https://claude.ai'
        };
    }

    /**
     * Основной метод парсинга текста
     * @param {string} text - Текст от пользователя
     * @returns {Object|null} Команда или null если не распознано
     */
    parse(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        // Нормализуем текст
        const normalizedText = this.normalizeText(text);
        
        logger.debug('NLP parser analyzing text', { original: text, normalized: normalizedText });

        // Пробуем разные intent'ы
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                const match = normalizedText.match(pattern);
                if (match) {
                    const entity = match[1]?.trim();
                    const command = this.processIntent(intent, entity, normalizedText);
                    
                    if (command) {
                        logger.info('NLP parser found command', { 
                            intent, 
                            entity, 
                            command: command.command,
                            confidence: command.confidence || 'high'
                        });
                        return command;
                    }
                }
            }
        }

        logger.debug('NLP parser found no matches', { text: normalizedText });
        return null;
    }

    /**
     * Нормализация текста
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:]/g, '') // Убираем пунктуацию
            .replace(/\s+/g, ' '); // Убираем лишние пробелы
    }

    /**
     * Обработка intent'а в команду
     */
    processIntent(intent, entity, fullText) {
        switch (intent) {
            case 'open_app':
                return this.processAppIntent(entity);
                
            case 'open_website':
                return this.processWebsiteIntent(entity);
                
            case 'close_window':
                return { command: 'close_window' };
                
            case 'maximize_window':
                return { command: 'maximize_window' };
                
            case 'minimize_window':
                return { command: 'minimize_window' };
                
            case 'system_command':
                return this.processSystemIntent(fullText);
                
            case 'find_movie':
                return this.processMovieIntent(entity, fullText);
                
            default:
                return null;
        }
    }

    /**
     * Обработка команд запуска приложений
     */
    processAppIntent(appName) {
        if (!appName) return null;

        // Ищем в словаре синонимов
        const normalizedApp = appName.toLowerCase();
        const executableName = this.appSynonyms[normalizedApp];

        if (executableName) {
            return {
                command: 'open_app',
                alias: executableName
            };
        }

        // Если не нашли в словаре, пробуем как есть
        return {
            command: 'open_app',
            alias: normalizedApp
        };
    }

    /**
     * Обработка команд открытия сайтов
     */
    processWebsiteIntent(siteName) {
        if (!siteName) return null;

        const normalizedSite = siteName.toLowerCase();
        
        // ВАЖНО: Если это известное приложение, отправляем на app_intent
        if (this.appSynonyms[normalizedSite]) {
            return this.processAppIntent(normalizedSite);
        }
        
        const url = this.websiteMap[normalizedSite];

        if (url) {
            return {
                command: 'open_chrome',
                url: url
            };
        }

        // Проверяем, может ли это быть валидным доменом
        const guessedUrl = `https://${normalizedSite.replace(/\s+/g, '')}.com`;
        
        // Если в названии есть пробелы или спец. символы - скорее всего это приложение
        if (normalizedSite.includes(' ') || 
            normalizedSite.includes('.') && !normalizedSite.endsWith('.com') && !normalizedSite.endsWith('.ru')) {
            return this.processAppIntent(normalizedSite);
        }
        
        // Если выглядит как домен - пробуем открыть как сайт
        return {
            command: 'open_chrome',
            url: guessedUrl
        };
    }

    /**
     * Обработка системных команд
     */
    processSystemIntent(fullText) {
        const normalized = fullText.toLowerCase();
        
        if (normalized.includes('выключи')) {
            return {
                command: 'shutdown_now'
            };
        }
        
        if (normalized.includes('усыпи')) {
            return {
                command: 'sleep_now'
            };
        }
        
        if (normalized.includes('заблокируй')) {
            return {
                command: 'lock_screen'
            };
        }

        return null;
    }

    /**
     * Обработка команд поиска фильмов
     */
    processMovieIntent(movieTitle, fullText) {
        if (!movieTitle) return null;

        // Нормализуем название фильма
        let cleanTitle = movieTitle.trim();
        
        // Определяем тип контента
        let movieType = null;
        if (fullText.includes('сериал')) {
            movieType = 'series';
        } else if (fullText.includes('фильм') || fullText.includes('кино') || fullText.includes('картин')) {
            movieType = 'movie';
        }

        // Извлекаем год из текста
        let movieYear = null;
        const yearPatterns = [
            /(?:года?\s+)?(\d{4})\s*год[а-я]*/i,
            /(\d{4})\s*г[.]?/i,
            /(?:за\s+)?(\d{4})/i,
            /девяносто\s+девят(?:ого|ый)/i,
            /две\s+тысячи\s+(?:первый|второй|третий|четвёртый|пятый|шестой|седьмой|восьмой|девятый|десятый)/i,
            /двухтысячн[а-я]*\s*(?:первый|второй|третий|четвёртый|пятый|шестой|седьмой|восьмой|девятый|десятый)/i
        ];

        for (const pattern of yearPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                if (match[1]) {
                    movieYear = parseInt(match[1]);
                } else {
                    // Обработка текстовых годов
                    if (fullText.includes('девяносто девят')) movieYear = 1999;
                    if (fullText.includes('две тысячи первый')) movieYear = 2001;
                    if (fullText.includes('две тысячи второй')) movieYear = 2002;
                    if (fullText.includes('две тысячи третий')) movieYear = 2003;
                    if (fullText.includes('двухтысячный первый')) movieYear = 2001;
                    if (fullText.includes('двухтысячный второй')) movieYear = 2002;
                }
                
                // Убираем год из названия фильма
                cleanTitle = cleanTitle.replace(/\s*(\d{4})\s*год[а-я]*/i, '').trim();
                cleanTitle = cleanTitle.replace(/\s*(\d{4})\s*г[.]?/i, '').trim();
                break;
            }
        }

        // Убираем служебные слова из названия
        cleanTitle = cleanTitle
            .replace(/^(?:фильм|кино|картин[ауы])\s+/i, '')
            .replace(/\s+(?:фильм|кино|картин[ауы])$/i, '')
            .replace(/^(?:сериал)\s+/i, '')
            .replace(/\s+(?:сериал)$/i, '')
            .trim();

        if (!cleanTitle) return null;

        logger.info('Movie intent processed', { 
            original: fullText, 
            cleanTitle, 
            movieYear, 
            movieType 
        });

        const command = {
            command: 'find_movie',
            movieTitle: cleanTitle
        };

        if (movieYear) {
            command.movieYear = movieYear;
        }

        if (movieType) {
            command.movieType = movieType;
        }

        return command;
    }

    /**
     * Добавление нового синонима в словарь
     */
    addSynonym(synonym, executable) {
        this.appSynonyms[synonym.toLowerCase()] = executable;
        logger.info('Added new app synonym', { synonym, executable });
    }

    /**
     * Получение всех синонимов
     */
    getSynonyms() {
        return { ...this.appSynonyms };
    }
}

module.exports = new NLPParser();