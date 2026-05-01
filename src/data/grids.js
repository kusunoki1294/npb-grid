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

const award = (value, subtitle) =>
  createCategory('award', value, {
    heading: 'Award Rule',
    subtitle,
    note:
      'If this is paired with a team, the player must have won the award while playing for that team in the sample data. If it is paired with a non-team category, the player only needs to satisfy both categories somewhere in the sample data.',
  });

const position = (value, subtitle) =>
  createCategory('position', value, {
    heading: 'Position Rule',
    subtitle,
    note:
      'The player must be listed at this position in the local sample data. It does not need to be from the same season as another non-team category.',
  });

const battingMilestone = (value, subtitle) =>
  createCategory('battingMilestone', value, {
    heading: 'Batting Milestone',
    subtitle,
    note:
      'If this is paired with a team, the player must have reached this batting milestone with that team in the sample data. If it is paired with a non-team category, the milestone can come from any season in the sample data.',
  });

const pitchingMilestone = (value, subtitle) =>
  createCategory('pitchingMilestone', value, {
    heading: 'Pitching Milestone',
    subtitle,
    note:
      'If this is paired with a team, the player must have reached this pitching milestone with that team in the sample data. If it is paired with a non-team category, the milestone can come from any season in the sample data.',
  });

// One shared category list powers every board. New categories can be added
// here without changing the generator or the UI.
export const categoryPool = [
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
  award('MVP Winner', 'Won an NPB Most Valuable Player award'),
  position('Pitcher', 'Listed as a pitcher'),
  position('Catcher', 'Listed as a catcher'),
  position('Left Fielder', 'Listed as a left fielder'),
  position('Center Fielder', 'Listed as a center fielder'),
  position('Right Fielder', 'Listed as a right fielder'),
  position('First Baseman', 'Listed as a first baseman'),
  position('Second Baseman', 'Listed as a second baseman'),
  position('Third Baseman', 'Listed as a third baseman'),
  position('Shortstop', 'Listed as a shortstop'),
  position('Designated Hitter', 'Listed as a designated hitter'),
  battingMilestone('30+ HR Season', 'Had a season with 30 or more home runs'),
  battingMilestone('100+ RBI Season', 'Had a season with 100 or more RBI'),
  pitchingMilestone('15+ Win Season', 'Had a season with 15 or more wins'),
  pitchingMilestone('200+ Strikeouts', 'Had a season with 200 or more strikeouts'),
];

let playableBoardsCache = null;

function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function hasValidIntersection(players, rowCategory, columnCategory) {
  return players.some(
    (player) =>
      playerMatchesCategory(player, rowCategory) &&
      playerMatchesCategory(player, columnCategory),
  );
}

function isPlayableGrid(players, rows, columns) {
  return rows.every((rowCategory) =>
    columns.every((columnCategory) =>
      hasValidIntersection(players, rowCategory, columnCategory),
    ),
  );
}

function getPlayableBoards(players) {
  if (playableBoardsCache) {
    return playableBoardsCache;
  }

  const playableBoards = [];

  for (let first = 0; first < categoryPool.length - 5; first += 1) {
    for (let second = first + 1; second < categoryPool.length - 4; second += 1) {
      for (let third = second + 1; third < categoryPool.length - 3; third += 1) {
        for (let fourth = third + 1; fourth < categoryPool.length - 2; fourth += 1) {
          for (let fifth = fourth + 1; fifth < categoryPool.length - 1; fifth += 1) {
            for (let sixth = fifth + 1; sixth < categoryPool.length; sixth += 1) {
              const selected = [
                categoryPool[first],
                categoryPool[second],
                categoryPool[third],
                categoryPool[fourth],
                categoryPool[fifth],
                categoryPool[sixth],
              ];

              const arrangements = [
                { rows: selected.slice(0, 3), columns: selected.slice(3, 6) },
                {
                  rows: [selected[0], selected[1], selected[3]],
                  columns: [selected[2], selected[4], selected[5]],
                },
                {
                  rows: [selected[0], selected[2], selected[4]],
                  columns: [selected[1], selected[3], selected[5]],
                },
                {
                  rows: [selected[0], selected[4], selected[5]],
                  columns: [selected[1], selected[2], selected[3]],
                },
              ];

              arrangements.forEach(({ rows, columns }) => {
                if (isPlayableGrid(players, rows, columns)) {
                  playableBoards.push({ rows, columns });
                }
              });
            }
          }
        }
      }
    }
  }

  playableBoardsCache = playableBoards;
  return playableBoardsCache;
}

export function createRandomGrid(players) {
  const playableBoards = getPlayableBoards(players);

  if (playableBoards.length > 0) {
    const selectedBoard =
      playableBoards[Math.floor(Math.random() * playableBoards.length)];

    return {
      id: `random-grid-${Date.now()}`,
      name: 'Random NPB Grid',
      rows: shuffle(selectedBoard.rows),
      columns: shuffle(selectedBoard.columns),
    };
  }

  return {
    id: 'fallback-grid',
    name: 'Fallback NPB Grid',
    rows: [
      team('Yomiuri Giants', ['Yomiuri Giants']),
      team('Hanshin Tigers', ['Hanshin Tigers']),
      team('Yakult Swallows', ['Yakult Swallows', 'Sankoku Atoms', 'Yakult Atoms']),
    ],
    columns: [
      award('MVP Winner', 'Won an NPB Most Valuable Player award'),
      battingMilestone('30+ HR Season', 'Had a season with 30 or more home runs'),
      position('Pitcher', 'Listed as a pitcher'),
    ],
  };
}
