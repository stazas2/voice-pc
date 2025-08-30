// Парсинг команд пользователя
const { COMMAND_MAPPINGS } = require('./command-mappings');
const { smartParse } = require('./smart-parser');
const { saveCommandToContext } = require('./context-memory');

function parseUserCommand(userText, sessionId = null) {
  const text = userText.toLowerCase().trim();
  
  // Попробуем умный парсинг (числа, контекст)
  const smartResult = smartParse(text, sessionId);
  if (smartResult) {
    return smartResult;
  }
  
  // Fallback на статичные маппинги
  if (COMMAND_MAPPINGS[text]) {
    return COMMAND_MAPPINGS[text];
  }
  
  return { command: 'say_ok' };
}

function saveCommand(sessionId, userText, commandPayload, result) {
  return saveCommandToContext(sessionId, userText, commandPayload, result);
}

module.exports = { parseUserCommand, saveCommand };