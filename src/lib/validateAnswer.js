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

export function findPlayerByName(playersById, name) {
  const orderedQuery = getOrderedNameKey(name);
  const compactQuery = getCompactNameKey(name);

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
  const orderedQuery = getOrderedNameKey(query);
  const compactQuery = getCompactNameKey(query);

  if (!orderedQuery && !compactQuery) {
    return true;
  }

  const names = getCachedPlayerNameMatchKeys(player);

  return names.some((name) => (
    (orderedQuery && name.includes(orderedQuery))
    || (compactQuery && name.includes(compactQuery))
  ));
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
