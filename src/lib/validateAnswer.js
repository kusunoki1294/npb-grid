const NAME_PART_PATTERN = /[^\p{L}\p{N}\p{M}]+/gu;
const playerNameMatchKeyCache = new Map();

export function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

function getNormalizedNameParts(value) {
  return normalizeName(value)
    .replace(NAME_PART_PATTERN, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getOrderedNameKey(value) {
  return getNormalizedNameParts(value).join(' ');
}

function getCompactNameKey(value) {
  return getNormalizedNameParts(value).join('');
}

function getNameQueryKeys(query) {
  return {
    orderedQuery: getOrderedNameKey(query),
    compactQuery: getCompactNameKey(query),
  };
}

function reverseLocalizedName(value) {
  const parts = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean);

  if (parts.length !== 2) {
    return '';
  }

  return [parts[1], parts[0]].join(' ');
}

export function formatImportedPlayerName(name) {
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName.includes(',')) {
    return normalizedName;
  }

  const parts = normalizedName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return normalizedName;
  }

  const [familyName, ...givenNames] = parts;
  return [...givenNames, familyName].join(' ');
}

export function getPlayerNameCandidates(player) {
  const candidates = [player.name ?? '', player.nameJapanese ?? ''];
  const formattedImportedName = formatImportedPlayerName(player.name ?? '');
  const reversedJapaneseName = reverseLocalizedName(player.nameJapanese ?? '');

  if (formattedImportedName && formattedImportedName !== (player.name ?? '')) {
    candidates.push(formattedImportedName);
  }

  if (reversedJapaneseName && reversedJapaneseName !== (player.nameJapanese ?? '')) {
    candidates.push(reversedJapaneseName);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function getPlayerNameMatchKeys(player) {
  return [
    ...new Set(
      getPlayerNameCandidates(player).flatMap((candidate) => {
        const orderedKey = getOrderedNameKey(candidate);
        const compactKey = getCompactNameKey(candidate);
        return [orderedKey, compactKey].filter(Boolean);
      }),
    ),
  ];
}

function getCachedPlayerNameMatchKeys(player) {
  const cacheKey = player?.id;

  if (!cacheKey) {
    return getPlayerNameMatchKeys(player);
  }

  const cachedKeys = playerNameMatchKeyCache.get(cacheKey);

  if (cachedKeys) {
    return cachedKeys;
  }

  const computedKeys = getPlayerNameMatchKeys(player);
  playerNameMatchKeyCache.set(cacheKey, computedKeys);
  return computedKeys;
}

function getNameMatchScore(nameKey, queryKey, wordBoundaryWeight = 0) {
  if (!nameKey || !queryKey) {
    return 0;
  }

  if (nameKey === queryKey) {
    return 100;
  }

  if (nameKey.startsWith(queryKey)) {
    return 80;
  }

  if (wordBoundaryWeight > 0 && nameKey.includes(` ${queryKey}`)) {
    return wordBoundaryWeight;
  }

  if (nameKey.includes(queryKey)) {
    return 40;
  }

  return 0;
}

export function getPlayerNameQueryScore(player, query) {
  const { orderedQuery, compactQuery } = getNameQueryKeys(query);

  if (!orderedQuery && !compactQuery) {
    return null;
  }

  let bestScore = 0;

  for (const candidate of getPlayerNameCandidates(player)) {
    const orderedKey = getOrderedNameKey(candidate);
    const compactKey = getCompactNameKey(candidate);

    bestScore = Math.max(
      bestScore,
      getNameMatchScore(orderedKey, orderedQuery, 60),
      getNameMatchScore(compactKey, compactQuery),
    );
  }

  return bestScore > 0 ? bestScore : null;
}

export function findPlayerByName(playersById, name) {
  const { orderedQuery, compactQuery } = getNameQueryKeys(name);

  if (!orderedQuery && !compactQuery) {
    return null;
  }

  return (
    Object.values(playersById).find((player) => {
      const names = getCachedPlayerNameMatchKeys(player);
      return (
        (orderedQuery && names.includes(orderedQuery))
        || (compactQuery && names.includes(compactQuery))
      );
    }) ?? null
  );
}

export function playerMatchesNameQuery(player, query) {
  return getPlayerNameQueryScore(player, query) !== null;
}

export function isPlayerAlreadyUsed(entries, selectedPlayerId, cellKey) {
  return Object.entries(entries).some(([key, entry]) => {
    if (key === cellKey || entry?.result !== 'correct') {
      return false;
    }

    return entry.playerId === selectedPlayerId;
  });
}

export function validateAnswer(playerId, rowCategoryId, columnCategoryId, eligibility) {
  const rowEligible = new Set(eligibility[rowCategoryId] ?? []);
  const columnEligible = new Set(eligibility[columnCategoryId] ?? []);

  return rowEligible.has(playerId) && columnEligible.has(playerId);
}
