import fetch from "node-fetch";
import { logger } from './logger';

export type NluResult = {
  intent: "find_movie" | "find_season" | "find_filtered";
  title: string;
  year: number | null;
  type: "movie" | "series" | null;
  season?: number;
  episode?: number;
  filters?: {
    genre?: string;
    country?: string;
    ratingMin?: number;
    ratingMax?: number;
    yearMin?: number;
    yearMax?: number;
  };
};

type KinopoiskMovie = {
  id?: number;
  kpId?: number;
  name?: string;
  alternativeName?: string;
  year?: number;
  type?: string;
  rating?: {
    kp?: number;
    imdb?: number;
  };
  genres?: Array<{ name: string }>;
  countries?: Array<{ name: string }>;
};

type Season = {
  number: number;
  name: string;
  enName?: string;
  episodes: Episode[];
};

type Episode = {
  number: number;
  name: string;
  enName?: string;
  date?: string;
};

type MovieSearchResult = {
  speak: string;
  url: string | null;
  movie?: KinopoiskMovie;
};

const KP_TOKEN = process.env.KP_TOKEN || "KFSEQJK-D4XMD8Q-Q41EGEZ-A0QEK63";
const REQUEST_TIMEOUT = 5000;

// Маппинг русских названий жанров на названия Kinopoisk API
const GENRE_MAPPING: Record<string, string> = {
  'боевик': 'боевик',
  'комедия': 'комедия', 
  'драма': 'драма',
  'ужасы': 'ужасы',
  'ужастик': 'ужасы',
  'триллер': 'триллер',
  'фантастика': 'фантастика',
  'фэнтези': 'фэнтези',
  'мелодрама': 'мелодрама',
  'детектив': 'детектив',
  'криминал': 'криминал',
  'приключения': 'приключения',
  'семейный': 'семейный',
  'мультфильм': 'мультфильм',
  'документальный': 'документальный',
  'военный': 'военный',
  'история': 'история',
  'биография': 'биография',
  'спорт': 'спорт',
  'музыка': 'музыка',
  'вестерн': 'вестерн',
  'аниме': 'аниме',
  'короткометражка': 'короткометражка'
};

function normalizeGenre(genre: string): string {
  const normalized = genre.toLowerCase().trim();
  return GENRE_MAPPING[normalized] || normalized;
}

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
  if (nlu.intent === "find_season") {
    return await findSeasonEpisode(nlu);
  }
  if (nlu.intent === "find_filtered") {
    return await findMovieWithFilters(nlu);
  }
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
    
    // Формируем плеер-URL с сезоном и эпизодом если есть
    let playerUrl = `https://www.kinopoisk.vip/${kind}/${movieId}/`;
    if (nlu.season && nlu.episode && isSeries) {
      playerUrl += `${nlu.season}-sezon-${nlu.episode}-seriya/`;
    } else if (nlu.season && isSeries) {
      playerUrl += `${nlu.season}-sezon/`;
    }
    
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

// Поиск сезонов и эпизодов
async function findSeasonEpisode(nlu: NluResult): Promise<MovieSearchResult> {
  try {
    logger.info(`Searching for series season: ${nlu.title}`, { season: nlu.season, episode: nlu.episode });

    // Сначала найдём сериал
    const params = new URLSearchParams({
      query: nlu.title,
      limit: "5"
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
        speak: `Ошибка поиска сериала: ${response.status}`, 
        url: null 
      };
    }

    const data = await response.json() as any;
    const docs: KinopoiskMovie[] = Array.isArray(data?.docs) ? data.docs : [];

    // Ищем только сериалы
    const series = docs.filter(doc => 
      String(doc.type ?? "").toLowerCase().includes("series")
    );

    if (series.length === 0) {
      return { 
        speak: `Не нашёл сериал "${nlu.title}"`, 
        url: null 
      };
    }

    const bestMatch = pickBest({...nlu, type: "series"}, series);
    if (!bestMatch) {
      return { 
        speak: `Нашёл сериалы, но не смог выбрать лучший`, 
        url: null 
      };
    }

    const movieId = bestMatch.id ?? bestMatch.kpId;
    if (!movieId) {
      return { 
        speak: `Нашёл сериал, но не смог определить ID`, 
        url: null 
      };
    }

    // Формируем URL с сезоном и эпизодом
    let playerUrl = `https://www.kinopoisk.vip/series/${movieId}/`;
    let speakText = `Открываю сериал "${bestMatch.name || nlu.title}"`;
    
    if (nlu.season && nlu.episode) {
      playerUrl += `${nlu.season}-sezon-${nlu.episode}-seriya/`;
      speakText += ` ${nlu.season} сезон ${nlu.episode} серия`;
    } else if (nlu.season) {
      playerUrl += `${nlu.season}-sezon/`;
      speakText += ` ${nlu.season} сезон`;
    }

    logger.info(`Found series: ${bestMatch.name}`, { 
      id: movieId, 
      season: nlu.season,
      episode: nlu.episode,
      url: playerUrl 
    });

    return {
      speak: speakText,
      url: playerUrl,
      movie: bestMatch
    };

  } catch (error) {
    logger.error('Series search error', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { 
      speak: `Ошибка при поиске сериала: ${errorMsg}`, 
      url: null 
    };
  }
}

// Фильтрованный поиск фильмов
async function findMovieWithFilters(nlu: NluResult): Promise<MovieSearchResult> {
  try {
    logger.info('Searching with filters', { filters: nlu.filters });

    const params = new URLSearchParams({
      limit: "10",
      page: "1"
    });

    // Добавляем фильтры
    if (nlu.filters) {
      if (nlu.filters.ratingMin !== undefined || nlu.filters.ratingMax !== undefined) {
        const min = nlu.filters.ratingMin || 0;
        const max = nlu.filters.ratingMax || 10;
        params.append('rating.imdb', `${min}-${max}`);
      }

      if (nlu.filters.yearMin !== undefined || nlu.filters.yearMax !== undefined) {
        const min = nlu.filters.yearMin || 1900;
        const max = nlu.filters.yearMax || new Date().getFullYear();
        params.append('year', `${min}-${max}`);
      }

      if (nlu.filters.genre) {
        const normalizedGenre = normalizeGenre(nlu.filters.genre);
        params.append('genres.name', normalizedGenre);
      }

      if (nlu.filters.country) {
        params.append('countries.name', nlu.filters.country);
      }
    }

    // Если есть название, добавляем его как основной фильтр
    if (nlu.title) {
      params.append('name', nlu.title);
    }

    const searchUrl = `https://api.kinopoisk.dev/v1.4/movie?${params.toString()}`;
    
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
        speak: `Ошибка поиска с фильтрами: ${response.status}`, 
        url: null 
      };
    }

    const data = await response.json() as any;
    const docs: KinopoiskMovie[] = Array.isArray(data?.docs) ? data.docs : [];

    if (docs.length === 0) {
      return { 
        speak: `Не нашёл фильмы по заданным критериям`, 
        url: null 
      };
    }

    // Берём первый результат (API уже отсортировал по релевантности)
    const bestMatch = docs[0];
    const movieId = bestMatch.id ?? bestMatch.kpId;
    
    if (!movieId) {
      return { 
        speak: `Нашёл фильм, но не смог определить ID`, 
        url: null 
      };
    }

    const isSeries = String(bestMatch.type ?? "").toLowerCase().includes("series");
    const kind = isSeries ? "series" : "film";
    const playerUrl = `https://www.kinopoisk.vip/${kind}/${movieId}/`;
    
    const movieName = bestMatch.name || bestMatch.alternativeName || "фильм";
    const yearStr = bestMatch.year ? ` (${bestMatch.year})` : "";
    const ratingStr = bestMatch.rating?.imdb ? `, рейтинг ${bestMatch.rating.imdb}` : "";
    
    logger.info(`Found filtered movie: ${movieName}${yearStr}`, { 
      id: movieId, 
      type: kind, 
      url: playerUrl,
      rating: bestMatch.rating
    });

    return {
      speak: `Подобрал "${movieName}"${yearStr}${ratingStr}`,
      url: playerUrl,
      movie: bestMatch
    };

  } catch (error) {
    logger.error('Filtered search error', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { 
      speak: `Ошибка при поиске с фильтрами: ${errorMsg}`, 
      url: null 
    };
  }
}

// NLU промпт для обработки голосового запроса
export const MOVIE_NLU_SYSTEM_PROMPT = `Ты — NLU-модуль голосового ассистента ПК.
Из любой русской фразы выделяй параметры для поиска контента.

Верни СТРОГО JSON без комментариев по схеме:
{
  "intent": "find_movie"|"find_season"|"find_filtered", // тип поиска
  "title": "string",                                     // название
  "year": number|null,                                   // конкретный год
  "type": "movie"|"series"|null,                         // тип контента
  "season": number|null,                                 // номер сезона
  "episode": number|null,                                // номер эпизода
  "filters": {                                           // фильтры для подбора
    "genre": "string"|null,                             // жанр
    "country": "string"|null,                           // страна
    "ratingMin": number|null,                           // мин рейтинг
    "ratingMax": number|null,                           // макс рейтинг
    "yearMin": number|null,                             // с какого года
    "yearMax": number|null                              // по какой год
  }|null
}

ИНТЕНТЫ:
- "find_movie" — обычный поиск по названию
- "find_season" — поиск конкретного сезона/серии ("включи 3 сезон 2 серию...")
- "find_filtered" — подбор по критериям ("подбери боевик", "что посмотреть хорошее")

ПРАВИЛА:
- Служебные слова игнорируй: «найди/включи/открой/посмотреть/хочу/подбери»
- Числительные переводи в числа: «третий сезон» → season:3, «вторую серию» → episode:2
- Жанры нормализуй: «боевик» → "боевик", «комедии» → "комедия", «ужастик» → "ужасы"
- Годы-диапазоны: «двухтысячных» → yearMin:2000,yearMax:2009, «девяностых» → yearMin:1990,yearMax:1999
- Рейтинги: «хорошие» → ratingMin:7, «отличные» → ratingMin:8, «топовые» → ratingMin:8.5
- Для подбора без названия используй "find_filtered" с пустым title
- Ответ — только JSON.`;

export const MOVIE_NLU_EXAMPLES = [
  {
    input: "найди фильм бойцовский клуб девяносто девятого года",
    output: '{"intent":"find_movie","title":"Бойцовский клуб","year":1999,"type":"movie","season":null,"episode":null,"filters":null}'
  },
  {
    input: "хочу сериал во все тяжкие", 
    output: '{"intent":"find_movie","title":"Во все тяжкие","year":null,"type":"series","season":null,"episode":null,"filters":null}'
  },
  {
    input: "включи третий сезон шерлока",
    output: '{"intent":"find_season","title":"Шерлок","year":null,"type":"series","season":3,"episode":null,"filters":null}'
  },
  {
    input: "открой во все тяжкие пятый сезон вторую серию",
    output: '{"intent":"find_season","title":"Во все тяжкие","year":null,"type":"series","season":5,"episode":2,"filters":null}'
  },
  {
    input: "подбери хороший боевик",
    output: '{"intent":"find_filtered","title":"","year":null,"type":"movie","season":null,"episode":null,"filters":{"genre":"боевик","country":null,"ratingMin":7,"ratingMax":null,"yearMin":null,"yearMax":null}}'
  },
  {
    input: "что посмотреть отличное из двухтысячных",
    output: '{"intent":"find_filtered","title":"","year":null,"type":null,"season":null,"episode":null,"filters":{"genre":null,"country":null,"ratingMin":8,"ratingMax":null,"yearMin":2000,"yearMax":2009}}'
  },
  {
    input: "найди американские комедии",
    output: '{"intent":"find_filtered","title":"","year":null,"type":"movie","season":null,"episode":null,"filters":{"genre":"комедия","country":"США","ratingMin":null,"ratingMax":null,"yearMin":null,"yearMax":null}}'
  }
];