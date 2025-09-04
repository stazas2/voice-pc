// Валидатор для входящих запросов и команд
const logger = require('./logger');

class Validator {
    constructor() {
        // Список потенциально опасных команд
        this.suspiciousCommands = [
            'rm -rf',
            'del /f /s /q',
            'format',
            'fdisk',
            'shutdown -f',
            'taskkill /f',
            'net user',
            'reg delete',
            'powershell -exec',
            'cmd /c',
            'rundll32'
        ];
        
        // Разрешенные команды (whitelist)
        this.allowedCommands = [
            'say_ok',
            'unknown_command',
            'open_notepad',
            'open_chrome',
            'shutdown_now',
            'shutdown_delayed',
            'shutdown_cancel',
            'sleep_now',
            'open_app',
            'media_pause',
            'media_play',
            'media_next',
            'media_previous',
            'media_stop',
            'volume_up',
            'volume_down',
            'volume_mute',
            'volume_unmute',
            'volume_set',
            'open_downloads',
            'open_documents',
            'open_desktop',
            'open_latest_download',
            'system_cpu',
            'system_disk',
            'system_memory',
            'system_ip',
            'system_info',
            'screenshot',
            'screen_record',
            'minimize_all',
            'show_desktop',
            'lock_screen',
            'empty_recycle_bin',
            'close_window',
            'focus_window',
            'maximize_window',
            // Notion integration
            'notion_today_tasks',
            'notion_upcoming_events', 
            'notion_create_task',
            // Chrome control
            'chrome_new_tab',
            'chrome_close_tab',
            'chrome_refresh',
            'chrome_fullscreen_media',
            'chrome_media_pause',
            'chrome_scroll_down',
            'chrome_scroll_up',
            'chrome_click_link',
            'chrome_find_text',
            // Profile system
            'activate_profile',
            'tile_windows',
            // Context commands
            'repeat_last',
            'close_last_opened',
            'cancel_last'
        ];
    }
    
    // Валидация запроса от Алисы
    validateAliceRequest(event) {
        try {
            let body;
            
            // Yandex Cloud Functions передает данные напрямую как объект
            if (typeof event === 'object' && event.request && event.session) {
                body = event;
            }
            // HTTP запросы передают через event.body как строку
            else if (event.body) {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            }
            else {
                throw new Error('Request body is empty or invalid format');
            }
            
            if (!body.request) {
                throw new Error('Request object is missing');
            }
            
            if (!body.session) {
                throw new Error('Session object is missing');
            }
            
            return {
                isValid: true,
                data: body
            };
            
        } catch (error) {
            logger.logError(error, { event });
            return {
                isValid: false,
                error: error.message
            };
        }
    }
    
    // Валидация команды на безопасность
    validateCommand(command, userText = '') {
        // Проверка на пустую команду
        if (!command || typeof command !== 'string') {
            return {
                isValid: false,
                reason: 'Empty or invalid command'
            };
        }
        
        // Проверка по whitelist
        if (!this.allowedCommands.includes(command)) {
            logger.warn('Command not in whitelist', { command, userText });
            return {
                isValid: false,
                reason: 'Command not in allowed list'
            };
        }
        
        // Проверка на подозрительные команды в тексте пользователя
        const suspiciousFound = this.suspiciousCommands.find(suspicious => 
            userText.toLowerCase().includes(suspicious.toLowerCase()) ||
            command.toLowerCase().includes(suspicious.toLowerCase())
        );
        
        if (suspiciousFound) {
            logger.warn('Suspicious command detected', { 
                command, 
                userText, 
                suspiciousPattern: suspiciousFound 
            });
            return {
                isValid: false,
                reason: `Suspicious pattern detected: ${suspiciousFound}`
            };
        }
        
        return {
            isValid: true
        };
    }
    
    // Валидация параметров команды
    validateCommandParams(params) {
        if (!params) return { isValid: true };
        
        // Проверка на SQL инъекции
        const sqlInjectionPatterns = [
            /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i,
            /union\s+select/i,
            /drop\s+table/i,
            /insert\s+into/i,
            /delete\s+from/i
        ];
        
        const paramsStr = JSON.stringify(params);
        
        for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(paramsStr)) {
                return {
                    isValid: false,
                    reason: 'Potential SQL injection detected'
                };
            }
        }
        
        // Проверка на чрезмерно длинные параметры
        if (paramsStr.length > 1000) {
            return {
                isValid: false,
                reason: 'Parameters too long'
            };
        }
        
        return { isValid: true };
    }
    
    // Валидация URL сервера
    validateServerUrl(url) {
        if (!url) {
            return {
                isValid: false,
                reason: 'Server URL is not configured'
            };
        }
        
        try {
            const urlObj = new URL(url);
            
            // Проверка протокола
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return {
                    isValid: false,
                    reason: 'Invalid protocol'
                };
            }
            
            // Проверка на localhost в production
            if (urlObj.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
                return {
                    isValid: false,
                    reason: 'Localhost URL not allowed in production'
                };
            }
            
            return { isValid: true };
            
        } catch (error) {
            return {
                isValid: false,
                reason: 'Invalid URL format'
            };
        }
    }
}

// Экспортируем singleton
module.exports = new Validator();