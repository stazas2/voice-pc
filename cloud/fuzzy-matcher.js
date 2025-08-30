// Нечёткое сопоставление команд для обработки синонимов и опечаток

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

// Ключевые слова для группировки команд
const COMMAND_GROUPS = {
  volume: ['громкость', 'звук', 'аудио'],
  browser: ['хром', 'браузер', 'chrome', 'интернет'],
  notepad: ['блокнот', 'текстовик', 'notepad'],
  close: ['закрой', 'убей', 'выйди', 'закрыть'],
  open: ['открой', 'запусти', 'включи', 'стартуй'],
  focus: ['переключись', 'активируй', 'перейди', 'фокус'],
  maximize: ['разверни', 'максимизируй', 'увеличь', 'полный экран']
};

function findBestMatch(userText, commandMappings) {
  const text = userText.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;
  
  // Точное совпадение всегда приоритет
  if (commandMappings[text]) {
    return { command: commandMappings[text], confidence: 1.0 };
  }
  
  // Поиск по сходству
  for (const [phrase, command] of Object.entries(commandMappings)) {
    const similarity = calculateSimilarity(text, phrase);
    
    // Только если сходство больше 70%
    if (similarity > 0.7 && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = command;
    }
  }
  
  // Попробуем поиск по ключевым словам
  if (!bestMatch || bestScore < 0.8) {
    const keywordMatch = findByKeywords(text, commandMappings);
    if (keywordMatch && keywordMatch.confidence > bestScore) {
      bestMatch = keywordMatch.command;
      bestScore = keywordMatch.confidence;
    }
  }
  
  return bestScore > 0.7 ? { command: bestMatch, confidence: bestScore } : null;
}

function findByKeywords(text, commandMappings) {
  const words = text.split(/\s+/);
  let bestMatch = null;
  let maxKeywords = 0;
  
  for (const [phrase, command] of Object.entries(commandMappings)) {
    let keywordScore = 0;
    
    // Считаем совпадения ключевых слов
    for (const [group, keywords] of Object.entries(COMMAND_GROUPS)) {
      const textHasKeyword = keywords.some(kw => text.includes(kw));
      const phraseHasKeyword = keywords.some(kw => phrase.includes(kw));
      
      if (textHasKeyword && phraseHasKeyword) {
        keywordScore++;
      }
    }
    
    if (keywordScore > maxKeywords) {
      maxKeywords = keywordScore;
      bestMatch = command;
    }
  }
  
  return maxKeywords > 0 ? { command: bestMatch, confidence: 0.6 + maxKeywords * 0.1 } : null;
}

module.exports = { findBestMatch, calculateSimilarity };