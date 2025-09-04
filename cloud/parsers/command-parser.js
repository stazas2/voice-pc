// Парсинг команд пользователя
const { COMMAND_MAPPINGS } = require('../config/command-mappings');
const { smartParse } = require('./smart-parser');
const nlpParser = require('./nlp-parser');
const { saveCommandToContext } = require('./context-memory');

function parseUserCommand(userText, sessionId = null) {
  const text = userText.toLowerCase().trim();
  
  // Проверка на пустую команду
  if (!text || text.length === 0) {
    return { command: 'unknown_command', error: 'Empty command' };
  }
  
  // Проверка на команду из одних пробелов/символов
  if (text.replace(/\s/g, '').length === 0) {
    return { command: 'unknown_command', error: 'Empty command content' };
  }
  
  // Попробуем умный парсинг (числа, контекст)
  const smartResult = smartParse(text, sessionId);
  if (smartResult) {
    return smartResult;
  }
  
  // Fallback на статичные маппинги
  if (COMMAND_MAPPINGS[text]) {
    return COMMAND_MAPPINGS[text];
  }
  
  // 🧠 Попробуем NLP парсер для естественного языка
  const nlpResult = nlpParser.parse(userText);
  if (nlpResult) {
    return nlpResult;
  }
  
  // Неизвестная команда
  return { command: 'unknown_command', originalText: text };
}

function saveCommand(sessionId, userText, commandPayload, result) {
  return saveCommandToContext(sessionId, userText, commandPayload, result);
}

module.exports = { parseUserCommand, saveCommand };