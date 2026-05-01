import { playerMatchesCategory } from '../game/validation.js';

function createCategory(type, value, details = {}) {
  return {
    label: value,
    type,
    value,
    details,
  };
}

const team = (value, franchiseNames) =>
  createCategory('team', value, {
    heading: 'Team Rule',
    subtitle: 'Must have appeared for this franchise',
    note:
      'When paired with a team, the player must have played in at least one game for that franchise in the sample data.',
    history: franchiseNames,
  });

const award = (value) =>
  createCategory('award', value, {
    heading: 'Award / Honor',
    subtitle: value,
    note:
      'If this is paired with a team, the player must have earned this award or honor while playing for that team in the sample data. If it is paired with a non-team category, the player only needs to satisfy both categories somewhere in the sample data.',
  });

const position = (value) =>
  createCategory('position', value, {
    heading: 'Position Rule',
    subtitle: value,
    note:
      'The player must be listed at this position in the local sample data. It does not need to be from the same season as another non-team category.',
  });

const battingSeasonMilestone = (value) =>
  createCategory('battingSeasonMilestone', value, {
    heading: 'Batting Season Category',
    subtitle: value,
    note:
      'If this is paired with a team, the player must have reached this batting season stat with that team in the sample data. If it is paired with a non-team category, it can come from any season in the sample data.',
  });

const battingCareerMilestone = (value) =>
  createCategory('battingCareerMilestone', value, {
    heading: 'Batting Career Category',
    subtitle: value,
    note:
      'Career categories use the player career markers in the local sample data. When paired with a team, the player still must have played for that team.',
  });

const pitchingSeasonMilestone = (value) =>
  createCategory('pitchingSeasonMilestone', value, {
    heading: 'Pitching Season Category',
    subtitle: value,
    note:
      'If this is paired with a team, the player must have reached this pitching season stat with that team in the sample data. If it is paired with a non-team category, it can come from any season in the sample data.',
  });

const pitchingCareerMilestone = (value) =>
  createCategory('pitchingCareerMilestone', value, {
    heading: 'Pitching Career Category',
    subtitle: value,
    note:
      'Career categories use the player career markers in the local sample data. When paired with a team, the player still must have played for that team.',
  });

const specialCategory = (value) =>
  createCategory('specialCategory', value, {
    heading: 'Special Category',
    subtitle: value,
    note:
      'Special categories use curated tags in the local sample data. When paired with a team, the player still must have played for that team.',
  });

const teamCategories = [
  team('Yomiuri Giants', ['Yomiuri Giants']),
  team('Hanshin Tigers', ['Hanshin Tigers']),
  team('Yakult Swallows', ['Yakult Swallows', 'Sankoku Atoms', 'Yakult Atoms']),
  team('Chunichi Dragons', ['Chunichi Dragons']),
  team('Hiroshima Toyo Carp', ['Hiroshima Carp', 'Hiroshima Toyo Carp']),
  team('Yokohama DeNA BayStars', [
    'Yokohama DeNA BayStars',
    'Yokohama BayStars',
    'Taiyo Whales',
  ]),
  team('SoftBank Hawks', [
    'Fukuoka SoftBank Hawks',
    'Fukuoka Daiei Hawks',
    'Nankai Hawks',
  ]),
  team('Orix Buffaloes', [
    'Orix Buffaloes',
    'Orix BlueWave',
    'Orix Braves',
    'Hankyu Braves',
    'Kintetsu Buffaloes',
  ]),
  team('Chiba Lotte Marines', ['Chiba Lotte Marines', 'Lotte Orions']),
  team('Seibu Lions', ['Saitama Seibu Lions', 'Seibu Lions', 'Nishitetsu Lions']),
  team('Rakuten Eagles', ['Tohoku Rakuten Golden Eagles']),
  team('Nippon-Ham Fighters', [
    'Hokkaido Nippon-Ham Fighters',
    'Nippon-Ham Fighters',
  ]),
];

const awardCategories = [
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
].map(award);

const positionCategories = [
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
].map(position);

const battingSeasonCategories = [
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
].map(battingSeasonMilestone);

const battingCareerCategories = [
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
].map(battingCareerMilestone);

const pitchingSeasonCategories = [
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
].map(pitchingSeasonMilestone);

const pitchingCareerCategories = [
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
].map(pitchingCareerMilestone);

const specialCategories = [
  'Played for Only One NPB Franchise',
  'Played in MLB',
  'Foreign-Born Player',
  'Japanese-Born Player',
  'Switch Hitter',
  'No-Hitter',
  'Perfect Game',
  'Japan Baseball Hall of Fame',
  'Meikyukai Member',
].map(specialCategory);

export const categoryPool = [
  ...teamCategories,
  ...awardCategories,
  ...positionCategories,
  ...battingSeasonCategories,
  ...battingCareerCategories,
  ...pitchingSeasonCategories,
  ...pitchingCareerCategories,
  ...specialCategories,
];

function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function sameCategory(left, right) {
  return left.type === right.type && left.value === right.value;
}

function hasValidIntersection(players, rowCategory, columnCategory) {
  return players.some(
    (player) =>
      playerMatchesCategory(player, rowCategory) &&
      playerMatchesCategory(player, columnCategory),
  );
}

function getUsableCategories(players) {
  return categoryPool.filter((category) =>
    players.some((player) => playerMatchesCategory(player, category)),
  );
}

export function createRandomGrid(players) {
  const usableCategories = getUsableCategories(players);

  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const rows = shuffle(usableCategories).slice(0, 3);
    const viableColumns = usableCategories.filter(
      (candidate) =>
        !rows.some((row) => sameCategory(row, candidate)) &&
        rows.every((row) => hasValidIntersection(players, row, candidate)),
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
    rows: teamCategories.slice(0, 3),
    columns: [award('MVP Winner'), battingSeasonMilestone('30+ HR Season'), position('Pitcher')],
  };
}
