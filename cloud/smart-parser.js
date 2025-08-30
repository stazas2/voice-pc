const { COMMAND_MAPPINGS } = require('./command-mappings');
const { parseContextCommand } = require('./context-memory');
const { findBestMatch } = require('./fuzzy-matcher');

const NUMBER_WORDS = {
  'ноль': 0, 'один': 1, 'два': 2, 'три': 3, 'четыре': 4, 'пять': 5,
  'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
  'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15,
  'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20,
  'тридцать': 30, 'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90, 'сто': 100
};

const VOLUME_PATTERNS = [
  /волум\s+(?:на\s+)?(?:компьютер[еа]?|пк)\s+(\d+)/i,
  /волум\s+(?:на\s+)?(?:компьютер[еа]?|пк)\s+([\w\s]+)/i,
  /волум\s+(\d+)/i,
  /волум\s+([\w\s]+)/i,
  /звук\s+(?:на\s+)?(?:компьютер[еа]?|пк)\s+(\d+)/i,
  /звук\s+(\d+)/i,
  /звук\s+([\w\s]+)/i,
  /установи\s+волум\s+(?:на\s+)?(?:компьютер[еа]?|пк)\s+(\d+)/i,
  /установи\s+волум\s+(\d+)/i,
  /поставь\s+волум\s+(?:на\s+)?(?:компьютер[еа]?|пк)\s+(\d+)/i,
  /поставь\s+волум\s+(\d+)/i
];

function parseVolumeCommand(text) {
  text = text.trim().toLowerCase();
  
  for (const pattern of VOLUME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1];
      
      if (/^\d+$/.test(value)) {
        const level = Math.max(0, Math.min(100, parseInt(value)));
        return { command: 'volume_set', level };
      }
      
      const words = value.toLowerCase().replace(/процент[ов]?/g, '').trim();
      if (NUMBER_WORDS[words] !== undefined) {
        return { command: 'volume_set', level: NUMBER_WORDS[words] };
      }
      
      const combined = words.split(/\s+/).reduce((sum, word) => {
        return sum + (NUMBER_WORDS[word] || 0);
      }, 0);
      if (combined > 0 && combined <= 100) {
        return { command: 'volume_set', level: combined };
      }
    }
  }
  
  return null;
}

const DURATION_PATTERNS = [
  /запиши\s+экран\s+(\d+)\s*сек/i,
  /запись\s+экрана\s+(\d+)\s*сек/i,
  /запиши\s+(\d+)\s*сек/i
];

function parseScreenRecordCommand(text) {
  text = text.trim().toLowerCase();
  
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const duration = Math.max(1, Math.min(300, parseInt(match[1])));
      return { command: 'screen_record', duration };
    }
  }
  
  return null;
}

function hasNumbers(text) {
  return /\d/.test(text);
}

function smartParse(text, sessionId = null) {
  text = text.trim();
  
  // Проверяем контекстные команды
  if (sessionId) {
    const contextCmd = parseContextCommand(sessionId, text);
    if (contextCmd) return contextCmd;
  }
  
  // ПРИОРИТЕТ: Команды с числами парсим специально
  const volumeCmd = parseVolumeCommand(text);
  if (volumeCmd) return volumeCmd;
  
  const recordCmd = parseScreenRecordCommand(text);
  if (recordCmd) return recordCmd;
  
  // Точные совпадения
  const exactMatch = COMMAND_MAPPINGS[text.toLowerCase()];
  if (exactMatch) return exactMatch;
  
  // Нечёткий поиск ТОЛЬКО для команд БЕЗ чисел
  if (!hasNumbers(text)) {
    const fuzzyMatch = findBestMatch(text, COMMAND_MAPPINGS);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.75) {
      return fuzzyMatch.command;
    }
  }
  
  return null;
}

module.exports = { smartParse, parseVolumeCommand, parseScreenRecordCommand };