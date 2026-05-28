/** Parse Kinopoisk list item aria-label into catalog fields */
export function parseKinopoiskName(raw) {
  const actorsMatch = raw.match(/В ролях:\s*(.+)$/);
  const actors = actorsMatch
    ? actorsMatch[1].split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const beforeActors = raw.split('В ролях:')[0] ?? raw;
  const genreMatch = beforeActors.match(/•\s*([^•]+?)\s*Режиссёр:/);
  const genres = genreMatch
    ? genreMatch[1]
        .trim()
        .split(/\s+/)
        .map((g) => g.toLowerCase())
        .filter(Boolean)
    : [];

  const yearMatch =
    beforeActors.match(/,\s*(\d{4}),/) ?? beforeActors.match(/(\d{4}),/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const yearIdx = beforeActors.search(/,?\s*\d{4},/);
  let titlePart =
    yearIdx > 0 ? beforeActors.slice(0, yearIdx) : beforeActors.split(/\d{4}/)[0] ?? beforeActors;
  titlePart = titlePart.replace(/,\s*$/, '').trim();

  let title = titlePart;
  const cyrEnd = titlePart.search(
    /(?<=[а-яА-ЯёЁ0-9+«»])\s*(?=[A-Z][a-z])/,
  );
  if (cyrEnd > 0) {
    title = titlePart.slice(0, cyrEnd).trim();
  } else {
    const engMatch = titlePart.match(/^(.+?)([A-Z][a-z].*)$/);
    if (engMatch && /[а-яА-ЯёЁ]/.test(engMatch[1])) {
      title = engMatch[1].trim();
    }
  }

  return { title, year, genres, actors };
}

export function buildMovie(id, raw, rating, description) {
  const p = parseKinopoiskName(raw);
  return {
    id,
    title: p.title,
    year: p.year,
    genres: p.genres.length ? p.genres : ['драма'],
    actors: p.actors,
    rating: rating ?? 8.0,
    description: description ?? '',
  };
}
