export function normalizeName(value) {
  return value.trim().toLowerCase();
}

export function findPlayerByName(playersById, name) {
  const normalizedName = normalizeName(name);

  return (
    Object.values(playersById).find((player) => {
      const english = normalizeName(player.name ?? '');
      const japanese = normalizeName(player.nameJapanese ?? '');
      return english === normalizedName || japanese === normalizedName;
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
