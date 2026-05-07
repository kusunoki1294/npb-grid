function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createCategory(type, label, details = {}) {
  return {
    id: `${type}:${slugify(label)}`,
    type,
    label,
    value: label,
    details,
  };
}

const team = (label, franchiseNames) =>
  createCategory('team', label, {
    heading: 'Team Rule',
    subtitle: 'Must have appeared for this franchise',
    note:
      'When paired with a team, the player must have played in at least one game for that franchise in the dataset.',
    history: franchiseNames,
  });

const award = (label) =>
  createCategory('award', label, {
    heading: 'Award / Honor',
    subtitle: label,
    note:
      'If this is paired with a team, the player must have earned this award or honor while playing for that team in the dataset. If it is paired with a non-team category, the player only needs to satisfy both categories somewhere in the dataset. Note: award categories are still incomplete and currently only cover some awards from 2002 onward.',
  });

const position = (label) =>
  createCategory('position', label, {
    heading: 'Position Rule',
    subtitle: label,
    note:
      'The player must have played this position for at least one game in the dataset. It does not need to be from the same season as another non-team category.',
  });

const battingSeasonMilestone = (label) =>
  createCategory('battingSeasonMilestone', label, {
    heading: 'Batting Season Category',
    subtitle: label,
    note:
      'If this is paired with a team, the player must have reached this batting season stat with that team in the dataset. If it is paired with a non-team category, it can come from any season in the dataset.',
  });

const battingCareerMilestone = (label) =>
  createCategory('battingCareerMilestone', label, {
    heading: 'Batting Career Category',
    subtitle: label,
    note:
      'Career categories use summed career stats in the dataset. When paired with a team, the player still must have played for that team.',
  });

const pitchingSeasonMilestone = (label) =>
  createCategory('pitchingSeasonMilestone', label, {
    heading: 'Pitching Season Category',
    subtitle: label,
    note:
      'If this is paired with a team, the player must have reached this pitching season stat with that team in the dataset. If it is paired with a non-team category, it can come from any season in the dataset.',
  });

const pitchingCareerMilestone = (label) =>
  createCategory('pitchingCareerMilestone', label, {
    heading: 'Pitching Career Category',
    subtitle: label,
    note:
      'Career categories use summed career stats in the dataset. When paired with a team, the player still must have played for that team.',
  });

const specialCategory = (label) =>
  createCategory('specialCategory', label, {
    heading: 'Special Category',
    subtitle: label,
    note:
      'Special categories use curated flags in the dataset. When paired with a team, the player still must have played for that team.',
  });

export const categories = [
  team('Yomiuri Giants', ['Yomiuri Giants']),
  team('Hanshin Tigers', ['Hanshin Tigers']),
  team('Yakult Swallows', ['Yakult Swallows', 'Sankoku Atoms', 'Yakult Atoms']),
  team('Chunichi Dragons', ['Chunichi Dragons']),
  team('Hiroshima Toyo Carp', ['Hiroshima Carp', 'Hiroshima Toyo Carp']),
  team('Yokohama DeNA BayStars', ['Yokohama DeNA BayStars', 'Yokohama BayStars', 'Taiyo Whales']),
  team('SoftBank Hawks', ['Fukuoka SoftBank Hawks', 'Fukuoka Daiei Hawks', 'Nankai Hawks']),
  team('Orix Buffaloes', ['Orix Buffaloes', 'Orix BlueWave', 'Orix Braves', 'Hankyu Braves', 'Kintetsu Buffaloes']),
  team('Chiba Lotte Marines', ['Chiba Lotte Marines', 'Lotte Orions']),
  team('Seibu Lions', ['Saitama Seibu Lions', 'Seibu Lions', 'Nishitetsu Lions']),
  team('Rakuten Eagles', ['Tohoku Rakuten Golden Eagles']),
  team('Nippon-Ham Fighters', ['Hokkaido Nippon-Ham Fighters', 'Nippon-Ham Fighters']),
  ...[
    'MVP Winner',
    'Sawamura Award Winner',
    'Rookie of the Year',
    'Best Nine',
    'Golden Glove',
    'All-Star',
    'Japan Series Champion',
    'Japan Series MVP',
    'Climax Series MVP',
    'Batting Champion',
    'Home Run Leader',
    'RBI Leader',
    'Stolen Base Leader',
    'ERA Leader',
    'Wins Leader',
    'Strikeout Leader',
    'Saves Leader',
    'Holds Leader',
    'Japan Baseball Hall of Fame',
    'Meikyukai Member',
  ].map(award),
  ...[
    'Pitcher',
    'Catcher',
    'Left Fielder',
    'Center Fielder',
    'Right Fielder',
    'First Baseman',
    'Second Baseman',
    'Third Baseman',
    'Shortstop',
    'Designated Hitter',
  ].map(position),
  ...[
    '.300+ AVG Season',
    '.320+ AVG Season',
    '20+ HR Season',
    '30+ HR Season',
    '40+ HR Season',
    '50+ HR Season',
    '80+ RBI Season',
    '100+ RBI Season',
    '100+ Runs Season',
    '150+ Hits Season',
    '180+ Hits Season',
    '200+ Hits Season',
    '20+ SB Season',
    '30+ SB Season',
    '40+ SB Season',
    '20+ HR / 20+ SB Season',
    '30+ HR / 30+ SB Season',
    'Triple Crown Season',
  ].map(battingSeasonMilestone),
  ...[
    '1,000+ Career Hits',
    '1,500+ Career Hits',
    '2,000+ Career Hits',
    '2,500+ Career Hits',
    '100+ Career HR',
    '200+ Career HR',
    '300+ Career HR',
    '400+ Career HR',
    '500+ Career HR',
    '500+ Career RBI',
    '1,000+ Career RBI',
    '1,500+ Career RBI',
    '500+ Career Runs',
    '1,000+ Career Runs',
    '100+ Career SB',
    '200+ Career SB',
    '300+ Career SB',
    '500+ Career SB',
    '.280+ Career AVG',
    '.300+ Career AVG',
    '.400+ Career OBP',
    '.500+ Career SLG',
  ].map(battingCareerMilestone),
  ...[
    '10+ Win Season',
    '15+ Win Season',
    '20+ Win Season',
    '150+ Strikeout Season',
    '200+ Strikeout Season',
    '<=2.00 ERA Season',
    '<=2.50 ERA Season',
    '30+ Save Season',
    '40+ Save Season',
    '50+ Save Season',
    '30+ Hold Season',
    '40+ Hold Season',
    '200+ IP Season',
  ].map(pitchingSeasonMilestone),
  ...[
    '50+ Career Wins',
    '100+ Career Wins',
    '150+ Career Wins',
    '200+ Career Wins',
    '500+ Career Strikeouts',
    '1,000+ Career Strikeouts',
    '1,500+ Career Strikeouts',
    '2,000+ Career Strikeouts',
    '100+ Career Saves',
    '200+ Career Saves',
    '250+ Career Saves',
    '100+ Career Holds',
    '200+ Career Holds',
    '500+ Games Pitched',
    '1,000+ Career IP',
    '1,500+ Career IP',
    '2,000+ Career IP',
    'Sub-3.00 Career ERA',
    '50+ Career Complete Games',
    '100+ Career Complete Games',
    '10+ Career Shutouts',
    '20+ Career Shutouts',
  ].map(pitchingCareerMilestone),
  ...[
    'Played for Only One NPB Franchise',
    'Played in MLB',
    'Foreign-Born Player',
    'Japanese-Born Player',
    'Switch Hitter',
    'No-Hitter',
    'Perfect Game',
  ].map(specialCategory),
];

export const categoriesById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
);

export function buildGridFromCategoryIds(rowIds, columnIds) {
  const rows = rowIds
    .map((id) => categoriesById[id])
    .filter(Boolean);
  const columns = columnIds
    .map((id) => categoriesById[id])
    .filter(Boolean);

  if (rows.length !== 3 || columns.length !== 3) {
    return null;
  }

  return { rows, columns };
}

function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seedValue) {
  let seed = hashString(seedValue) || 1;

  return function nextRandom() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function shuffleWithRandom(items, random) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function hasIntersection(leftIds, rightIds) {
  const rightSet = new Set(rightIds);
  return leftIds.some((id) => rightSet.has(id));
}

export function createRandomGridFromEligibility(
  eligibility,
  hasPlayableIntersection,
  options = {},
) {
  const { maxAttempts = 2500 } = options;
  const usableCategories = categories.filter(
    (category) => (eligibility[category.id] ?? []).length > 0,
  );
  const hasIntersectionForCategories = hasPlayableIntersection
    ?? ((rowCategory, columnCategory) =>
      hasIntersection(eligibility[rowCategory.id] ?? [], eligibility[columnCategory.id] ?? []));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const rows = shuffle(usableCategories).slice(0, 3);
    const viableColumns = usableCategories.filter(
      (candidate) =>
        !rows.some((row) => row.id === candidate.id) &&
        rows.every((row) => hasIntersectionForCategories(row, candidate)),
    );

    if (viableColumns.length < 3) {
      continue;
    }

    return {
      id: `random-grid-${Date.now()}-${attempt}`,
      rows,
      columns: shuffle(viableColumns).slice(0, 3),
    };
  }

  return {
    id: 'fallback-grid',
    rows: categories.filter((category) =>
      ['team:yomiuri-giants', 'team:hanshin-tigers', 'team:yakult-swallows'].includes(
        category.id,
      ),
    ),
    columns: categories.filter((category) =>
      [
        'award:mvp-winner',
        'battingSeasonMilestone:30-hr-season',
        'position:pitcher',
      ].includes(category.id),
    ),
  };
}

export function createDailyGridFromEligibility(
  eligibility,
  dateString,
  hasPlayableIntersection,
  options = {},
) {
  const { maxAttempts = 2500 } = options;
  const usableCategories = categories.filter(
    (category) => (eligibility[category.id] ?? []).length > 0,
  );
  const hasIntersectionForCategories = hasPlayableIntersection
    ?? ((rowCategory, columnCategory) =>
      hasIntersection(eligibility[rowCategory.id] ?? [], eligibility[columnCategory.id] ?? []));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const random = createSeededRandom(`${dateString}:${attempt}`);
    const rows = shuffleWithRandom(usableCategories, random).slice(0, 3);
    const viableColumns = usableCategories.filter(
      (candidate) =>
        !rows.some((row) => row.id === candidate.id) &&
        rows.every((row) => hasIntersectionForCategories(row, candidate)),
    );

    if (viableColumns.length < 3) {
      continue;
    }

    return {
      id: `daily-grid-${dateString}`,
      rows,
      columns: shuffleWithRandom(viableColumns, random).slice(0, 3),
    };
  }

  return {
    id: `fallback-daily-grid-${dateString}`,
    rows: categories.filter((category) =>
      ['team:yomiuri-giants', 'team:hanshin-tigers', 'team:yakult-swallows'].includes(
        category.id,
      ),
    ),
    columns: categories.filter((category) =>
      [
        'award:mvp-winner',
        'battingSeasonMilestone:30-hr-season',
        'position:pitcher',
      ].includes(category.id),
    ),
  };
}
