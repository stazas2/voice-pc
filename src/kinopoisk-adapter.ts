import fetch from "node-fetch";
import { logger } from './logger';

export type NluResult = {
  intent: "find_movie";
  title: string;
  year: number | null;
  type: "movie" | "series" | null;
};

type KinopoiskMovie = {
  id?: number;
  kpId?: number;
  name?: string;
  alternativeName?: string;
  year?: number;
  type?: string;
};

type MovieSearchResult = {
  speak: string;
  url: string | null;
  movie?: KinopoiskMovie;
};

const KP_TOKEN = process.env.KP_TOKEN || "KFSEQJK-D4XMD8Q-Q41EGEZ-A0QEK63";
const REQUEST_TIMEOUT = 5000;

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

function pickBest(nlu: NluResult, docs: KinopoiskMovie[]): KinopoiskMovie | null {
  const want = normalize(nlu.title);
  let best: KinopoiskMovie | null = null;
  let bestScore = -1;

  for (const movie of docs) {
    const name = normalize(movie?.name ?? movie?.alternativeName ?? "");
    let score = 0;

    // Точное совпадение названия
    if (name === want) {
      score += 3;
    } else if (name.includes(want) || want.includes(name)) {
      score += 1;
    }

    // Совпадение года
    if (nlu.year && movie?.year) {
      const yearDiff = Math.abs(movie.year - nlu.year);
      if (yearDiff === 0) score += 2;
      else if (yearDiff <= 1) score += 1;
    }

    // Совпадение типа
    if (nlu.type && movie?.type) {
      const movieType = String(movie.type).toLowerCase();
      if ((nlu.type === "movie" && movieType.includes("movie")) ||
          (nlu.type === "series" && movieType.includes("series"))) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = movie;
    }
  }

  return best;
}

export async function findKinopoiskPlayerUrl(nlu: NluResult): Promise<MovieSearchResult> {
  if (nlu.intent !== "find_movie") {
    return { speak: "Неправильный интент для поиска фильма", url: null };
  }

  try {
    logger.info(`Searching for movie: ${nlu.title}`, { year: nlu.year, type: nlu.type });

    const params = new URLSearchParams({
      query: nlu.title,
      limit: "10"
    });

    const searchUrl = `https://api.kinopoisk.dev/v1.4/movie/search?${params.toString()}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(searchUrl, {
      headers: {
        'X-API-KEY': KP_TOKEN,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(`Kinopoisk API error: ${response.status} ${response.statusText}`);
      return { 
        speak: `Ошибка поиска на КиноПоиске: ${response.status}`, 
        url: null 
      };
    }

    const data = await response.json() as any;
    const docs: KinopoiskMovie[] = Array.isArray(data?.docs) ? data.docs : [];

    if (docs.length === 0) {
      return { 
        speak: `Не нашёл фильм "${nlu.title}" на КиноПоиске`, 
        url: null 
      };
    }

    const bestMatch = pickBest(nlu, docs);
    if (!bestMatch) {
      return { 
        speak: `Нашёл результаты, но не смог выбрать лучший`, 
        url: null 
      };
    }

    const movieId = bestMatch.id ?? bestMatch.kpId;
    if (!movieId) {
      return { 
        speak: `Нашёл фильм, но не смог определить ID`, 
        url: null 
      };
    }

    // Определяем тип контента для URL
    const isSeries = String(bestMatch.type ?? "").toLowerCase().includes("series");
    const kind = isSeries ? "series" : "film";
    
    // Формируем плеер-URL (kinopoisk.cx вместо kinopoisk.ru)
    const playerUrl = `https://www.kinopoisk.vip/${kind}/${movieId}/`;
    
    const movieName = bestMatch.name || bestMatch.alternativeName || nlu.title;
    const yearStr = bestMatch.year ? ` (${bestMatch.year})` : "";
    
    logger.info(`Found movie: ${movieName}${yearStr}`, { 
      id: movieId, 
      type: kind, 
      url: playerUrl 
    });

    return {
      speak: `Открываю "${movieName}"${yearStr}`,
      url: playerUrl,
      movie: bestMatch
    };

  } catch (error) {
    logger.error('Kinopoisk search error', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { 
      speak: `Ошибка при поиске фильма: ${errorMsg}`, 
      url: null 
    };
  }
}

// NLU промпт для обработки голосового запроса
export const MOVIE_NLU_SYSTEM_PROMPT = `Ты — NLU-модуль голосового ассистента ПК.
Из любой русской фразы выделяй параметры для поиска фильма.

Верни СТРОГО JSON без комментариев по схеме:
{
  "intent": "find_movie",           // обязательно, если речь о фильме/сериале
  "title": "string",                // нормализованное название (без «фильм», кавычек)
  "year":  number|null,             // год, если явно произнесён, иначе null
  "type":  "movie"|"series"|null    // сериал/фильм, если явно сказано
}

Правила:
- Игнорируй служебные слова: «найди/включи/открой/посмотреть/хочу посмотреть» и т.п.
- Убирай слова «фильм/кино/картина», кавычки.
- «первая/вторая/третья часть» и номера продолжений учитывай в title (например «Человек-паук 2»).
- «за девяносто девятый/двухтысячный» → преобразуй в year=1999/2000.
- Если тип явно «сериал» → type="series", «фильм» → type="movie"; иначе null.
- НИКОГДА не придумывай год, если он не прозвучал.
- Ответ — только JSON.`;

export const MOVIE_NLU_EXAMPLES = [
  {
    input: "найди фильм бойцовский клуб девяносто девятого года",
    output: '{"intent":"find_movie","title":"Бойцовский клуб","year":1999,"type":"movie"}'
  },
  {
    input: "хочу сериал во все тяжкие", 
    output: '{"intent":"find_movie","title":"Во все тяжкие","year":null,"type":"series"}'
  },
  {
    input: "открой человек паук 2",
    output: '{"intent":"find_movie","title":"Человек-паук 2","year":null,"type":null}'
  },
  {
    input: "посмотреть терминатор первую часть 1984",
    output: '{"intent":"find_movie","title":"Терминатор","year":1984,"type":"movie"}'
  }
];