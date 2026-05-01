// Centralized category checks make it easy to swap the local sample data
// for a richer historical dataset later.
export function playerMatchesCategory(player, category) {
  switch (category.type) {
    case 'team':
      return player.teams.includes(category.value);
    case 'position':
      return player.positions.includes(category.value);
    case 'award':
      return player.awards.includes(category.value);
    case 'battingSeasonMilestone':
      return player.battingSeasonMilestones.includes(category.value);
    case 'battingCareerMilestone':
      return player.battingCareerMilestones.includes(category.value);
    case 'pitchingSeasonMilestone':
      return player.pitchingSeasonMilestones.includes(category.value);
    case 'pitchingCareerMilestone':
      return player.pitchingCareerMilestones.includes(category.value);
    case 'specialCategory':
      return player.specialCategories.includes(category.value);
    default:
      return false;
  }
}

export function validatePlayerForCell(player, rowCategory, columnCategory) {
  return (
    playerMatchesCategory(player, rowCategory) &&
    playerMatchesCategory(player, columnCategory)
  );
}

export function normalizeName(value) {
  return value.trim().toLowerCase();
}

export function findPlayerByName(players, name) {
  const normalizedName = normalizeName(name);
  return players.find((player) => normalizeName(player.name) === normalizedName) ?? null;
}

export function isPlayerAlreadyUsed(entries, selectedName, cellKey) {
  const normalizedName = normalizeName(selectedName);

  return Object.entries(entries).some(([key, entry]) => {
    if (key === cellKey || !entry?.playerName || entry.result !== 'correct') {
      return false;
    }

    return normalizeName(entry.playerName) === normalizedName;
  });
}
