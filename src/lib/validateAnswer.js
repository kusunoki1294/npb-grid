export function normalizeName(value) {
  return value.trim().toLowerCase();
}

export function formatImportedPlayerName(name) {
  const normalizedName = name.trim();

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

  if (formattedImportedName && formattedImportedName !== (player.name ?? '')) {
    candidates.push(formattedImportedName);
  }

  return candidates.filter(Boolean);
}

export function findPlayerByName(playersById, name) {
  const normalizedName = normalizeName(name);

  return (
    Object.values(playersById).find((player) => {
      const names = getPlayerNameCandidates(player).map(normalizeName);
      return names.includes(normalizedName);
    }) ?? null
  );
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
