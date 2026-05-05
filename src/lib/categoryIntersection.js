function parseThreshold(label, suffix) {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^([0-9.]+)\\+ ${escaped}$`));
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function parseLessThanThreshold(label, prefix, suffix) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^${escapedPrefix}([0-9.]+) ${escapedSuffix}$`));
  return match ? Number(match[1]) : null;
}

function intersectIds(leftIds, rightIds) {
  const rightSet = new Set(rightIds);
  return leftIds.filter((playerId) => rightSet.has(playerId));
}

function isTeamScopedPair(leftCategory, rightCategory) {
  return (
    (leftCategory.type === 'team'
      && ['award', 'battingSeasonMilestone', 'pitchingSeasonMilestone'].includes(rightCategory.type))
    || (rightCategory.type === 'team'
      && ['award', 'battingSeasonMilestone', 'pitchingSeasonMilestone'].includes(leftCategory.type))
  );
}

function getTeamScopedPair(leftCategory, rightCategory) {
  return leftCategory.type === 'team'
    ? { teamCategory: leftCategory, scopedCategory: rightCategory }
    : { teamCategory: rightCategory, scopedCategory: leftCategory };
}

function matchesBattingSeasonMilestone(season, label) {
  if (label === 'Triple Crown Season') {
    return season.tripleCrown === true;
  }

  if (label.includes('HR /') && label.includes('SB Season')) {
    const [, homeRuns, stolenBases] = label.match(/(\d+)\+ HR \/ (\d+)\+ SB Season/) ?? [];
    return (
      (season.homeRuns ?? 0) >= Number(homeRuns)
      && (season.stolenBases ?? 0) >= Number(stolenBases)
    );
  }

  const avgThreshold = parseThreshold(label, 'AVG Season');
  const hrThreshold = parseThreshold(label, 'HR Season');
  const rbiThreshold = parseThreshold(label, 'RBI Season');
  const runsThreshold = parseThreshold(label, 'Runs Season');
  const hitsThreshold = parseThreshold(label, 'Hits Season');
  const sbThreshold = parseThreshold(label, 'SB Season');

  if (avgThreshold != null) {
    return (season.avg ?? 0) >= avgThreshold;
  }

  if (hrThreshold != null) {
    return (season.homeRuns ?? 0) >= hrThreshold;
  }

  if (rbiThreshold != null) {
    return (season.runsBattedIn ?? 0) >= rbiThreshold;
  }

  if (runsThreshold != null) {
    return (season.runs ?? 0) >= runsThreshold;
  }

  if (hitsThreshold != null) {
    return (season.hits ?? 0) >= hitsThreshold;
  }

  if (sbThreshold != null) {
    return (season.stolenBases ?? 0) >= sbThreshold;
  }

  return false;
}

function matchesPitchingSeasonMilestone(season, label) {
  const winsThreshold = parseThreshold(label, 'Win Season');
  const strikeoutThreshold = parseThreshold(label, 'Strikeout Season');
  const savesThreshold = parseThreshold(label, 'Save Season');
  const holdsThreshold = parseThreshold(label, 'Hold Season');
  const inningsThreshold = parseThreshold(label, 'IP Season');
  const eraThreshold = parseLessThanThreshold(label, '<=', 'ERA Season');

  if (winsThreshold != null) {
    return (season.wins ?? 0) >= winsThreshold;
  }

  if (strikeoutThreshold != null) {
    return (season.strikeouts ?? 0) >= strikeoutThreshold;
  }

  if (savesThreshold != null) {
    return (season.saves ?? 0) >= savesThreshold;
  }

  if (holdsThreshold != null) {
    return (season.holds ?? 0) >= holdsThreshold;
  }

  if (inningsThreshold != null) {
    return (season.inningsPitched ?? 0) >= inningsThreshold;
  }

  if (eraThreshold != null) {
    return season.era != null && season.era <= eraThreshold;
  }

  return false;
}

export function getIntersectionPlayerIds(
  rowCategory,
  columnCategory,
  eligibility,
  playerAwards,
  battingSeasons,
  pitchingSeasons,
) {
  const rowEligible = eligibility[rowCategory.id] ?? [];
  const columnEligible = eligibility[columnCategory.id] ?? [];

  if (!isTeamScopedPair(rowCategory, columnCategory)) {
    return intersectIds(rowEligible, columnEligible);
  }

  const { teamCategory, scopedCategory } = getTeamScopedPair(rowCategory, columnCategory);
  const teamName = teamCategory.value;
  let scopedIds = [];

  if (scopedCategory.type === 'award') {
    scopedIds = playerAwards
      .filter((row) => row.award === scopedCategory.value && row.team === teamName)
      .map((row) => row.playerId);
  } else if (scopedCategory.type === 'battingSeasonMilestone') {
    scopedIds = battingSeasons
      .filter((season) => season.team === teamName && matchesBattingSeasonMilestone(season, scopedCategory.value))
      .map((season) => season.playerId);
  } else if (scopedCategory.type === 'pitchingSeasonMilestone') {
    scopedIds = pitchingSeasons
      .filter((season) => season.team === teamName && matchesPitchingSeasonMilestone(season, scopedCategory.value))
      .map((season) => season.playerId);
  }

  const playerIds = teamCategory.id === rowCategory.id
    ? intersectIds(scopedIds, columnEligible)
    : intersectIds(rowEligible, scopedIds);

  return [...new Set(playerIds)].sort();
}
