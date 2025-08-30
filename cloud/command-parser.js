// Парсинг команд пользователя
const { COMMAND_MAPPINGS } = require('./command-mappings');

function parseUserCommand(userText) {
  const text = userText.toLowerCase().trim();
  if (COMMAND_MAPPINGS[text]) {
    return COMMAND_MAPPINGS[text];
  }
  return { command: 'say_ok' };
}

module.exports = { parseUserCommand };