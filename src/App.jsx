import { useEffect, useState } from 'react';
import GridBoard from './components/GridBoard';
import {
  buildGridFromCategoryIds,
  categoriesById,
  createDailyGridFromEligibility,
  createRandomGridFromEligibility,
} from './data/categories';
import {
  findPlayerByName,
  formatImportedPlayerName,
  getPlayerNameQueryScore,
  isPlayerAlreadyUsed,
} from './lib/validateAnswer';
import { getIntersectionPlayerIds } from './lib/categoryIntersection';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import playerAwards from '../data/processed/playerAwards.json';
import battingSeasons from '../data/processed/battingSeasons.json';
import pitchingSeasons from '../data/processed/pitchingSeasons.json';
import playersById from '../data/processed/players.json';
import eligibility from '../data/processed/eligibility.json';

const MAX_GUESSES = 9;
const ARCHIVE_START_DATE = '2026-05-01';
const ENABLE_PUBLIC_LEADERBOARD = false;
const STANDARD_MODE_MIN_ELIGIBLE = 13;
const SUPER_HARD_MIN_ELIGIBLE = 3;
const SUPER_HARD_MAX_ELIGIBLE = 15;
const STANDARD_GRID_MAX_ATTEMPTS = 20000;
const SUPER_HARD_GRID_MAX_ATTEMPTS = 50000;
const SUPER_EASY_GRID_MAX_ATTEMPTS = 50000;
const SUPER_EASY_FALLBACK_GRID = buildGridFromCategoryIds(
  [
    'team:chunichi-dragons',
    'battingSeasonMilestone:20-hr-20-sb-season',
    'team:orix-buffaloes',
  ],
  [
    'battingSeasonMilestone:320-avg-season',
    'battingSeasonMilestone:20-hr-season',
    'battingCareerMilestone:400-career-obp',
  ],
);
const eligibleIntersectionCountCache = new Map();
const BATTING_AWARDS = new Set([
  'Batting Champion',
  'Home Run Leader',
  'RBI Leader',
  'Stolen Base Leader',
]);
const PITCHING_AWARDS = new Set([
  'Sawamura Award Winner',
  'ERA Leader',
  'Wins Leader',
  'Strikeout Leader',
  'Saves Leader',
  'Holds Leader',
]);
const BATTING_SPECIAL_CATEGORIES = new Set([
  'Switch Hitter',
]);
const PITCHING_SPECIAL_CATEGORIES = new Set([
  'No-Hitter',
  'Perfect Game',
]);

const copy = {
  en: {
    signIn: 'Sign up',
    logIn: 'Log in',
    authClose: 'Close',
    authName: 'Display name',
    authEmail: 'Email address',
    authPassword: 'Password',
    authConfirmPassword: 'Confirm password',
    authNamePlaceholder: '',
    authEmailPlaceholder: 'you@example.com',
    authPasswordPlaceholder: 'Enter your password',
    authConfirmPasswordPlaceholder: 'Confirm your password',
    authLoginHeading: 'Log in to your account',
    authLoginBlurb: 'Track your daily progress and save future stats once accounts go live.',
    authSignupHeading: 'Create your account',
    authSignupBlurb: 'Set up a profile so you can keep daily streaks and puzzle history later.',
    authLoginSubmit: 'Log in',
    authSignupSubmit: 'Create account',
    authSwitchToSignup: 'Need an account? Sign up',
    authSwitchToLogin: 'Already have an account? Log in',
    authConfigMissing:
      'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect real accounts.',
    authPasswordMismatch: 'Passwords do not match.',
    authLoginSuccess: 'Logged in successfully.',
    authSignupSuccess: 'Account created. Check your email if confirmation is enabled.',
    authLogout: 'Log out',
    authLoggedInAs: 'Signed in as',
    authRestoring: 'Restoring session...',
    authWorking: 'Working...',
    dailySyncLoading: 'Loading your saved daily puzzle progress...',
    dailySyncLoaded: 'Loaded your saved daily progress.',
    dailySyncSaved: 'Saved your daily progress.',
    dailySyncError: 'Could not sync your daily progress right now.',
    dailyGuestNotice: 'Log in to save your daily puzzle progress.',
    streak: 'Streak',
    bestStreak: 'Best',
    streakDays: (count) => `${count} day${count === 1 ? '' : 's'}`,
    title: 'NPB Trivia Grid',
    dailyTab: 'Daily',
    practiceTab: 'Practice',
    superEasyTab: 'Super easy\nmode',
    superHardTab: 'Super hard\nmode',
    score: 'Score',
    noGuesses: 'No guesses remaining.',
    guessesRemaining: (count) => `${count} guesses remaining.`,
    newGrid: 'New Grid',
    reset: 'Reset',
    defaultMessage: 'Pick a square and enter an NPB player.',
    openMessage: 'Type or tap a player name, then submit your guess.',
    missingPlayer: 'That player is not available yet.',
    duplicatePlayer: (name) => `${name} is already used in another square.`,
    correct: (name) => `${name} matches both categories.`,
    incorrect: (name) =>
      `${name} does not match both categories. Try another player for that square.`,
    gameOver: (score) => `Game over. Final score: ${score} / 9.`,
    resetMessage: 'Board reset. Pick a square and start again.',
    newGridMessage: 'Loaded a new random grid.',
    howItWorks: 'How it works',
    howText:
      'Fill each square with a Nippon Professional Baseball player who matches both the row and column categories. Choose a square, enter a player name, and the game checks whether that player satisfies both categories. Each new board is generated from one shared category pool of teams, awards, positions, and milestones. Note: award-based categories now reach the older yearly archive, but some award types are still only complete from 2002 onward. Click any row or column category box to view its criteria and team or franchise notes before making a guess. You get 9 total guesses for the board.',
    close: 'Close',
    enterPlayer: 'Enter Player',
    submitGuess: 'Submit Guess',
    cancel: 'Cancel',
    placeholder: 'Example: Munetaka Murakami',
    selectPlayer: 'Select player',
    cellCorrectStatus: 'Correct',
    cellIncorrectStatus: 'Try again',
    suggestionsHint: 'Start typing to see matching players.',
    suggestionsEmpty: 'No matching players found.',
    suggestionEligible: 'Eligible',
    suggestionAlreadyUsed: 'Already used',
    summaryKicker: 'Game Complete',
    summaryHeading: 'Final Scorecard',
    summaryClose: 'Close scorecard',
    summaryReopen: 'View scorecard',
    summarySubheading: (score) =>
      score >= 7
        ? 'Strong finish'
        : score >= 4
          ? 'Solid middle innings'
          : 'Tough matchup today',
    summaryLeaderboard: 'Daily Leaderboard',
    leaderboardLoading: 'Loading leaderboard...',
    leaderboardUnavailable: 'Leaderboard is temporarily disabled until server-side result verification is added.',
    leaderboardEmpty: 'No completed boards for this day yet.',
    leaderboardRank: 'Rank',
    leaderboardPlayer: 'Player',
    leaderboardScore: 'Score',
    leaderboardRarityScore: 'Rarity',
    leaderboardRarityValue: (value) => `${value.toFixed(1)} avg matches`,
    leaderboardScoreValue: (score) => `${score} / 9`,
    rarityOnly: 'Only one match',
    rarityRare: 'Rare',
    rarityTricky: 'Tricky',
    rarityOpen: 'Easy',
    rarityCount: (count, band) => `${band} • ${count} eligible`,
    rarityOn: 'Rarity On',
    rarityOff: 'Rarity Off',
    rarityToggleOn: 'Hide rarity',
    rarityToggleOff: 'Show rarity',
    archive: 'Archive',
    archiveTitle: 'Grid Archive',
    archiveBack: 'Back to Grid',
    archiveOpenBoard: 'Open board',
    archiveStatsTitle: 'My Grid Stats',
    archiveDate: 'Date',
    archiveScore: 'Score',
    archiveRarity: 'Rarity',
    archiveMatches: 'Avg matches',
    archivePlayNow: 'Play now',
    archiveContinue: 'Continue',
    archiveNoData: 'No archive results yet. Start a daily board to build your history.',
    completedGrids: 'Completed Grids',
    averageScore: 'Average Score',
    averageRarity: 'Average Rarity',
    currentStreakLabel: 'Current Streak',
    perfectStreakLabel: 'Perfect Streak',
    topPlayersTitle: 'Top Players',
    topTeamsTitle: 'Top Teams',
    topCategoriesTitle: 'Top Categories',
    perfectGames: (count) => `${count} perfect`,
    avgScoreValue: (value) => `${value.toFixed(1)} / 9`,
    avgRarityValue: (value) => `${value.toFixed(1)} matches`,
    archiveUpdated: 'Local archive built from saved daily boards.',
    archiveEmptyStat: 'No data yet',
    copyLink: 'Copy Link',
    copyLinkSuccess: 'Shareable daily board link copied.',
    copyLinkError: 'Could not copy the share link.',
    returnToToday: 'Today',
    hits: 'Hits',
    misses: 'Misses',
    final: 'Final',
    solvedSquares: 'Solved squares',
    noSolved: 'No correct players this round.',
    dailyBoardLabel: (date) => `Daily board: ${date}`,
    dailyBoardNotice: 'You can show or hide square rarity from the toolbar.',
    dailyResetMessage: 'Daily board reset. Today\'s puzzle is loaded again.',
    legalDisclaimer:
      'This is an unofficial fan-made game and is not affiliated with, endorsed by, or sponsored by Nippon Professional Baseball or any NPB team.',
    dataCreditPrefix: 'Player data source:',
    dataCreditName: 'ProEyeKyuu',
  },
  ja: {
    signIn: '新規登録',
    logIn: 'ログイン',
    authClose: '閉じる',
    authName: '表示名',
    authEmail: 'メールアドレス',
    authPassword: 'パスワード',
    authConfirmPassword: 'パスワード確認',
    authNamePlaceholder: '',
    authEmailPlaceholder: 'you@example.com',
    authPasswordPlaceholder: 'パスワードを入力',
    authConfirmPasswordPlaceholder: 'もう一度パスワードを入力',
    authLoginHeading: 'アカウントにログイン',
    authLoginBlurb: 'アカウント機能が入ると、デイリー進捗や今後の成績保存に使えます。',
    authSignupHeading: 'アカウントを作成',
    authSignupBlurb: '今後、連続記録やプレー履歴を保存できるようにするための登録画面です。',
    authLoginSubmit: 'ログイン',
    authSignupSubmit: '登録する',
    authSwitchToSignup: 'アカウント作成はこちら',
    authSwitchToLogin: 'ログインはこちら',
    authConfigMissing:
      'Supabase がまだ設定されていません。実際のアカウント連携には VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を追加してください。',
    authPasswordMismatch: 'パスワードが一致していません。',
    authLoginSuccess: 'ログインしました。',
    authSignupSuccess: 'アカウントを作成しました。確認メールが有効な場合はメールを確認してください。',
    authLogout: 'ログアウト',
    authLoggedInAs: 'ログイン中',
    authRestoring: 'ログイン状態を復元しています...',
    authWorking: '処理中...',
    dailySyncLoading: '保存済みのデイリー進捗を読み込んでいます...',
    dailySyncLoaded: '保存済みのデイリー進捗を読み込みました。',
    dailySyncSaved: 'デイリー進捗を保存しました。',
    dailySyncError: 'デイリー進捗を同期できませんでした。',
    dailyGuestNotice: 'デイリー進捗を保存するにはログインしてください。',
    streak: '連続記録',
    bestStreak: '最高',
    streakDays: (count) => `${count}日`,
    title: 'プロ野球グリッド',
    dailyTab: 'デイリー',
    practiceTab: '練習',
    superEasyTab: '超簡単',
    superHardTab: '超難問',
    score: 'スコア',
    noGuesses: '残り回数はありません。',
    guessesRemaining: (count) => `残り ${count} 回`,
    newGrid: '新しいグリッド',
    reset: 'リセット',
    defaultMessage: 'マスを選んで選手名を入力してください。',
    openMessage: '選手名を入力するか候補を選んで送信してください。',
    missingPlayer: 'その選手はまだ使えません。',
    duplicatePlayer: (name) => `${name} は別の正解マスで使われています。`,
    correct: (name) => `${name} は両方の条件を満たしています。`,
    incorrect: (name) =>
      `${name} は両方の条件を満たしていません。このマスで別の選手を試してください。`,
    gameOver: (score) => `終了。最終スコア: ${score} / 9`,
    resetMessage: '盤面をリセットしました。最初からやり直せます。',
    newGridMessage: '新しいランダムグリッドを読み込みました。',
    howItWorks: '遊び方',
    howText:
      '各マスに、行と列の条件を両方満たす日本プロ野球の選手を入れてください。マスを選んで選手名を入力すると、その選手が行と列の両方の条件を満たすか判定します。各ボードは、球団、受賞、ポジション、記録の共通カテゴリープールから生成されます。なお、受賞カテゴリは古い年度別アーカイブまで広がりましたが、一部の賞は 2002 年以降のみ完全対応です。予想する前に、行または列のカテゴリーボックスをクリックすると条件や球団メモを確認できます。使える予想は合計 9 回です。',
    close: '閉じる',
    enterPlayer: '選手を入力',
    submitGuess: '選択',
    cancel: 'キャンセル',
    placeholder: '例: 村上 宗隆',
    selectPlayer: '選手を選択',
    cellCorrectStatus: '正解',
    cellIncorrectStatus: '再挑戦',
    suggestionsHint: '入力すると該当する選手候補が表示されます。',
    suggestionsEmpty: '一致する選手が見つかりません。',
    suggestionEligible: '該当',
    suggestionAlreadyUsed: '使用済み',
    summaryKicker: 'ゲーム終了',
    summaryHeading: '最終スコアカード',
    summaryClose: 'スコアカードを閉じる',
    summaryReopen: 'スコアカードを見る',
    summarySubheading: (score) =>
      score >= 7
        ? 'かなり好調です'
        : score >= 4
          ? 'まずまずの内容です'
          : '今日は苦戦しました',
    summaryLeaderboard: 'デイリー順位',
    leaderboardLoading: '順位を読み込んでいます...',
    leaderboardUnavailable: '順位機能は、サーバー側の結果検証を追加するまで一時停止しています。',
    leaderboardEmpty: 'この日の完了ボードはまだありません。',
    leaderboardRank: '順位',
    leaderboardPlayer: 'プレイヤー',
    leaderboardScore: 'スコア',
    leaderboardRarityScore: 'レア度',
    leaderboardRarityValue: (value) => `平均 ${value.toFixed(1)} 人`,
    leaderboardScoreValue: (score) => `${score} / 9`,
    rarityOnly: '1人だけ',
    rarityRare: 'レア',
    rarityTricky: '難しめ',
    rarityOpen: '易しい',
    rarityCount: (count, band) => `${band} • 該当 ${count} 人`,
    rarityOn: 'レア度表示オン',
    rarityOff: 'レア度表示オフ',
    rarityToggleOn: 'レア度を隠す',
    rarityToggleOff: 'レア度を表示',
    archive: 'アーカイブ',
    archiveTitle: 'グリッドアーカイブ',
    archiveBack: 'ゲームに戻る',
    archiveOpenBoard: 'ボードを開く',
    archiveStatsTitle: 'マイグリッド統計',
    archiveDate: '日付',
    archiveScore: 'スコア',
    archiveRarity: 'レア度',
    archiveMatches: '平均該当数',
    archivePlayNow: '今すぐ遊ぶ',
    archiveContinue: '続きから',
    archiveNoData: 'まだアーカイブ結果がありません。デイリーボードを始めると履歴が貯まります。',
    completedGrids: '完了したグリッド',
    averageScore: '平均スコア',
    averageRarity: '平均レア度',
    currentStreakLabel: '現在の連続記録',
    perfectStreakLabel: '完全達成連続',
    topPlayersTitle: 'よく使う選手',
    topTeamsTitle: 'よく出る球団',
    topCategoriesTitle: 'よく出るカテゴリ',
    perfectGames: (count) => `完全達成 ${count} 回`,
    avgScoreValue: (value) => `${value.toFixed(1)} / 9`,
    avgRarityValue: (value) => `平均 ${value.toFixed(1)} 人`,
    archiveUpdated: '保存されたデイリーボードをもとにしたアーカイブです。',
    archiveEmptyStat: 'まだデータがありません',
    copyLink: 'リンクをコピー',
    copyLinkSuccess: '共有用のデイリーボードURLをコピーしました。',
    copyLinkError: '共有リンクをコピーできませんでした。',
    returnToToday: '今日へ戻る',
    hits: '正解',
    misses: '不正解',
    final: '結果',
    solvedSquares: '正解したマス',
    noSolved: '今回は正解した選手がいませんでした。',
    dailyBoardLabel: (date) => `デイリーボード: ${date}`,
    dailyBoardNotice: 'ツールバーから各マスのレア度表示を切り替えできます。',
    dailyResetMessage: 'デイリーボードをリセットしました。今日の盤面を再読み込みしました。',
    legalDisclaimer:
      'このゲームは非公式のファンメイド作品であり、日本野球機構（NPB）および各球団とは一切関係ありません。公認・提携・協賛も受けていません。',
    dataCreditPrefix: '選手データ提供:',
    dataCreditName: 'ProEyeKyuu',
  },
};

const jaCategoryLabels = {
  'Yomiuri Giants': '読売ジャイアンツ',
  'Hanshin Tigers': '阪神タイガース',
  'Yakult Swallows': '東京ヤクルトスワローズ',
  'Sankoku Atoms': 'サンケイアトムズ',
  'Yakult Atoms': 'ヤクルトアトムズ',
  'Chunichi Dragons': '中日ドラゴンズ',
  'Hiroshima Carp': '広島カープ',
  'Hiroshima Toyo Carp': '広島東洋カープ',
  'Yokohama DeNA BayStars': '横浜DeNAベイスターズ',
  'Yokohama BayStars': '横浜ベイスターズ',
  'Taiyo Whales': '大洋ホエールズ',
  'SoftBank Hawks': '福岡ソフトバンクホークス',
  'Fukuoka SoftBank Hawks': '福岡ソフトバンクホークス',
  'Fukuoka Daiei Hawks': '福岡ダイエーホークス',
  'Nankai Hawks': '南海ホークス',
  'Orix Buffaloes': 'オリックス・バファローズ',
  'Orix BlueWave': 'オリックス・ブルーウェーブ',
  'Orix Braves': 'オリックス・ブレーブス',
  'Hankyu Braves': '阪急ブレーブス',
  'Kintetsu Buffaloes': '近鉄バファローズ',
  'Chiba Lotte Marines': '千葉ロッテマリーンズ',
  'Lotte Orions': 'ロッテオリオンズ',
  'Seibu Lions': '埼玉西武ライオンズ',
  'Saitama Seibu Lions': '埼玉西武ライオンズ',
  'Nishitetsu Lions': '西鉄ライオンズ',
  'Rakuten Eagles': '東北楽天ゴールデンイーグルス',
  'Tohoku Rakuten Golden Eagles': '東北楽天ゴールデンイーグルス',
  'Nippon-Ham Fighters': '北海道日本ハムファイターズ',
  'Hokkaido Nippon-Ham Fighters': '北海道日本ハムファイターズ',
  'MVP Winner': 'MVP受賞',
  'Sawamura Award Winner': '沢村賞受賞',
  'Rookie of the Year': '新人王',
  'Best Nine': 'ベストナイン',
  'Golden Glove': 'ゴールデングラブ賞',
  'All-Star': 'オールスター',
  'Japan Series Champion': '日本シリーズ優勝',
  'Japan Series MVP': '日本シリーズMVP',
  'Climax Series MVP': 'クライマックスシリーズMVP',
  'Batting Champion': '首位打者',
  'Home Run Leader': '本塁打王',
  'RBI Leader': '打点王',
  'Stolen Base Leader': '盗塁王',
  'ERA Leader': '最優秀防御率',
  'Wins Leader': '最多勝',
  'Strikeout Leader': '最多奪三振',
  'Saves Leader': '最多セーブ',
  'Holds Leader': '最優秀中継ぎ',
  Pitcher: '投手',
  Catcher: '捕手',
  'Left Fielder': '左翼手',
  'Center Fielder': '中堅手',
  'Right Fielder': '右翼手',
  'First Baseman': '一塁手',
  'Second Baseman': '二塁手',
  'Third Baseman': '三塁手',
  Shortstop: '遊撃手',
  'Designated Hitter': '指名打者',
  'Triple Crown Season': '三冠王シーズン',
  'Played for Only One NPB Franchise': 'NPBで1球団のみ所属',
  'Played in MLB': 'MLB経験あり',
  'Foreign-Born Player': '外国出身選手',
  'Japanese-Born Player': '日本出身選手',
  'Switch Hitter': 'スイッチヒッター',
  'No-Hitter': 'ノーヒットノーラン',
  'Perfect Game': '完全試合',
  'Japan Baseball Hall of Fame': '野球殿堂入り',
  'Meikyukai Member': '名球会会員',
};

const jaCategoryDetails = {
  team: {
    heading: '球団ルール',
    subtitle: 'その球団での出場経験が必要です',
    note:
      '球団カテゴリと組み合わさる場合、その球団で少なくとも1試合出場している必要があります。',
  },
  award: {
    heading: '受賞ルール',
    subtitle: 'NPBでの受賞実績',
    note:
      '球団カテゴリと組み合わさる場合、その球団在籍時にその賞を受賞している必要があります。球団以外のカテゴリとの組み合わせでは、どこかで両方の条件を満たしていれば構いません。なお、受賞カテゴリは古い年度別アーカイブまで広がりましたが、一部の賞は 2002 年以降のみ完全対応です。',
  },
  position: {
    heading: 'ポジションルール',
    subtitle: 'そのポジションとして登録',
    note:
      'そのポジションで少なくとも1試合出場している必要があります。球団以外のカテゴリと同じシーズンである必要はありません。',
  },
  battingMilestone: {
    heading: '打撃記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、どのシーズンでも構いません。',
  },
  pitchingMilestone: {
    heading: '投手記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、どのシーズンでも構いません。',
  },
  battingSeasonMilestone: {
    heading: '打撃シーズン記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、どのシーズンでも構いません。',
  },
  battingCareerMilestone: {
    heading: '通算打撃記録',
    subtitle: '通算打撃成績の条件',
    note:
      '通算打撃記録を使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  pitchingSeasonMilestone: {
    heading: '投手シーズン記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、どのシーズンでも構いません。',
  },
  pitchingCareerMilestone: {
    heading: '通算投手記録',
    subtitle: '通算投手成績の条件',
    note:
      '通算投手記録を使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  specialCategory: {
    heading: '特別カテゴリ',
    subtitle: '特別な経歴や属性',
    note:
      '特別カテゴリのタグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
};

function localizeGeneratedCategoryLabel(label) {
  const patterns = [
    [/^(\.\d+)\+ AVG Season$/, ([, value]) => `シーズン打率${value}以上`],
    [/^(\d+)\+ HR Season$/, ([, value]) => `シーズン${value}本塁打以上`],
    [/^(\d+)\+ RBI Season$/, ([, value]) => `シーズン${value}打点以上`],
    [/^(\d+)\+ Runs Season$/, ([, value]) => `シーズン${value}得点以上`],
    [/^(\d+)\+ Hits Season$/, ([, value]) => `シーズン${value}安打以上`],
    [/^(\d+)\+ SB Season$/, ([, value]) => `シーズン${value}盗塁以上`],
    [
      /^(\d+)\+ HR \/ (\d+)\+ SB Season$/,
      ([, homeRuns, steals]) => `シーズン${homeRuns}本塁打・${steals}盗塁以上`,
    ],
    [/^(\d+)\+ Career Hits$/, ([, value]) => `通算${value}安打以上`],
    [/^(\d+)\+ Career HR$/, ([, value]) => `通算${value}本塁打以上`],
    [/^(\d+)\+ Career RBI$/, ([, value]) => `通算${value}打点以上`],
    [/^(\d+)\+ Career Runs$/, ([, value]) => `通算${value}得点以上`],
    [/^(\d+)\+ Career SB$/, ([, value]) => `通算${value}盗塁以上`],
    [/^(\.\d+)\+ Career AVG$/, ([, value]) => `通算打率${value}以上`],
    [/^(\.\d+)\+ Career OBP$/, ([, value]) => `通算出塁率${value}以上`],
    [/^(\.\d+)\+ Career SLG$/, ([, value]) => `通算長打率${value}以上`],
    [/^(\d+)\+ Win Season$/, ([, value]) => `シーズン${value}勝以上`],
    [/^(\d+)\+ Strikeout Season$/, ([, value]) => `シーズン${value}奪三振以上`],
    [/^<=([\d.]+) ERA Season$/, ([, value]) => `シーズン防御率${value}以下`],
    [/^(\d+)\+ Save Season$/, ([, value]) => `シーズン${value}セーブ以上`],
    [/^(\d+)\+ Hold Season$/, ([, value]) => `シーズン${value}ホールド以上`],
    [/^(\d+)\+ IP Season$/, ([, value]) => `シーズン${value}投球回以上`],
    [/^(\d+)\+ Career Wins$/, ([, value]) => `通算${value}勝以上`],
    [/^(\d+)\+ Career Strikeouts$/, ([, value]) => `通算${value}奪三振以上`],
    [/^(\d+)\+ Career Saves$/, ([, value]) => `通算${value}セーブ以上`],
    [/^(\d+)\+ Career Holds$/, ([, value]) => `通算${value}ホールド以上`],
    [/^(\d+)\+ Games Pitched$/, ([, value]) => `通算${value}登板以上`],
    [/^(\d+)\+ Career IP$/, ([, value]) => `通算${value}投球回以上`],
    [/^Sub-(\d+\.\d+) Career ERA$/, ([, value]) => `通算防御率${value}未満`],
    [/^(\d+)\+ Career Complete Games$/, ([, value]) => `通算${value}完投以上`],
    [/^(\d+)\+ Career Shutouts$/, ([, value]) => `通算${value}完封以上`],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = label.match(pattern);

    if (match) {
      return formatter(match);
    }
  }

  return label;
}

function createEmptyCells() {
  const nextCells = {};

  for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      nextCells[`${rowIndex}-${columnIndex}`] = {
        playerName: '',
        result: null,
        locked: false,
      };
    }
  }

  return nextCells;
}

function getCellKey(rowIndex, columnIndex) {
  return `${rowIndex}-${columnIndex}`;
}

function getEligibleIntersectionCacheKey(rowCategoryId, columnCategoryId) {
  return rowCategoryId < columnCategoryId
    ? `${rowCategoryId}::${columnCategoryId}`
    : `${columnCategoryId}::${rowCategoryId}`;
}

function getCategoryDomain(category) {
  switch (category.type) {
    case 'battingSeasonMilestone':
    case 'battingCareerMilestone':
      return 'batting';
    case 'pitchingSeasonMilestone':
    case 'pitchingCareerMilestone':
      return 'pitching';
    case 'position':
      return category.value === 'Pitcher' ? 'pitching' : 'batting';
    case 'award':
      if (BATTING_AWARDS.has(category.value)) {
        return 'batting';
      }
      if (PITCHING_AWARDS.has(category.value)) {
        return 'pitching';
      }
      return 'neutral';
    case 'specialCategory':
      if (BATTING_SPECIAL_CATEGORIES.has(category.value)) {
        return 'batting';
      }
      if (PITCHING_SPECIAL_CATEGORIES.has(category.value)) {
        return 'pitching';
      }
      return 'neutral';
    default:
      return 'neutral';
  }
}

function areCategoriesSemanticallyCompatible(rowCategory, columnCategory) {
  const rowDomain = getCategoryDomain(rowCategory);
  const columnDomain = getCategoryDomain(columnCategory);

  return (
    rowDomain === 'neutral'
    || columnDomain === 'neutral'
    || rowDomain === columnDomain
  );
}

function getEligibleIntersectionCount(rowCategoryId, columnCategoryId, eligibilityMap) {
  const rowCategory = categoriesById[rowCategoryId];
  const columnCategory = categoriesById[columnCategoryId];

  if (!rowCategory || !columnCategory) {
    return 0;
  }

  const cacheKey = getEligibleIntersectionCacheKey(rowCategoryId, columnCategoryId);

  if (eligibilityMap === eligibility && eligibleIntersectionCountCache.has(cacheKey)) {
    return eligibleIntersectionCountCache.get(cacheKey);
  }

  const count = getIntersectionPlayerIds(
    rowCategory,
    columnCategory,
    eligibilityMap,
    playerAwards,
    battingSeasons,
    pitchingSeasons,
  ).length;

  if (eligibilityMap === eligibility) {
    eligibleIntersectionCountCache.set(cacheKey, count);
  }

  return count;
}

function isPlayableIntersectionForMode(mode, rowCategory, columnCategory, eligibilityMap) {
  if (!areCategoriesSemanticallyCompatible(rowCategory, columnCategory)) {
    return false;
  }

  const count = getEligibleIntersectionCount(rowCategory.id, columnCategory.id, eligibilityMap);

  if (mode === 'super-easy') {
    return getRarityTone(count) === 'open';
  }

  if (mode === 'super-hard') {
    return count >= SUPER_HARD_MIN_ELIGIBLE && count <= SUPER_HARD_MAX_ELIGIBLE;
  }

  return count >= STANDARD_MODE_MIN_ELIGIBLE;
}

function gridMatchesModeConstraints(grid, mode, eligibilityMap) {
  return grid.rows.every((rowCategory) =>
    grid.columns.every((columnCategory) =>
      isPlayableIntersectionForMode(mode, rowCategory, columnCategory, eligibilityMap),
    ));
}

function createGridForMode(mode, dateString) {
  const hasValidIntersection = (rowCategory, columnCategory) =>
    isPlayableIntersectionForMode(mode, rowCategory, columnCategory, eligibility);

  if (mode === 'daily') {
    return createDailyGridFromEligibility(
      eligibility,
      dateString,
      hasValidIntersection,
      { maxAttempts: STANDARD_GRID_MAX_ATTEMPTS },
    );
  }

  const grid = createRandomGridFromEligibility(
    eligibility,
    hasValidIntersection,
    mode === 'super-hard'
      ? { maxAttempts: SUPER_HARD_GRID_MAX_ATTEMPTS }
      : mode === 'super-easy'
        ? { maxAttempts: SUPER_EASY_GRID_MAX_ATTEMPTS }
        : { maxAttempts: STANDARD_GRID_MAX_ATTEMPTS },
  );

  if (mode === 'super-easy' && !gridMatchesModeConstraints(grid, mode, eligibility)) {
    return SUPER_EASY_FALLBACK_GRID;
  }

  return grid;
}

function getRarityTone(count) {
  if (count <= 1) {
    return 'only';
  }

  if (count < 10) {
    return 'rare';
  }

  if (count <= 30) {
    return 'tricky';
  }

  return 'open';
}

function getRarityBandLabel(count, text) {
  const tone = getRarityTone(count);

  if (tone === 'only') {
    return text.rarityOnly;
  }

  if (tone === 'rare') {
    return text.rarityRare;
  }

  if (tone === 'tricky') {
    return text.rarityTricky;
  }

  return text.rarityOpen;
}

function getPlayerDisplayName(player, locale) {
  if (locale === 'ja') {
    return player.nameJapanese || formatImportedPlayerName(player.name ?? '');
  }

  return player.name;
}

function localizePlayerDescriptor(label, locale) {
  if (locale !== 'ja') {
    return label;
  }

  return jaCategoryLabels[label] ?? localizeGeneratedCategoryLabel(label);
}

function getPlayerPrimaryTeam(player) {
  const teams = player.teams ?? [];

  for (let index = teams.length - 1; index >= 0; index -= 1) {
    if (teams[index]) {
      return teams[index];
    }
  }

  return '';
}

function getPlayerSuggestionDetail(player, locale) {
  const team = localizePlayerDescriptor(getPlayerPrimaryTeam(player), locale);
  const position = localizePlayerDescriptor(player.positions?.[0] ?? '', locale);

  return [team, position].filter(Boolean).join(' • ');
}

function compareSuggestionEntries(left, right, locale, preferEligibleMatches = false) {
  if (preferEligibleMatches && left.isEligibleForSelectedCell !== right.isEligibleForSelectedCell) {
    return Number(right.isEligibleForSelectedCell) - Number(left.isEligibleForSelectedCell);
  }

  if (left.matchScore !== right.matchScore) {
    return right.matchScore - left.matchScore;
  }

  if (left.isUsed !== right.isUsed) {
    return Number(left.isUsed) - Number(right.isUsed);
  }

  return left.label.localeCompare(right.label, locale === 'ja' ? 'ja' : 'en', {
    sensitivity: 'base',
  });
}

function computeResultRarityStats(cells, grid, eligibilityMap) {
  let rarityTotal = 0;
  let rarityHits = 0;

  for (const [key, cell] of Object.entries(cells ?? {})) {
    if (cell?.result !== 'correct') {
      continue;
    }

    const [rowIndex, columnIndex] = key.split('-').map(Number);
    const rowCategory = grid.rows[rowIndex];
    const columnCategory = grid.columns[columnIndex];

    if (!rowCategory || !columnCategory) {
      continue;
    }

    rarityTotal += getEligibleIntersectionCount(rowCategory.id, columnCategory.id, eligibilityMap);
    rarityHits += 1;
  }

  return {
    rarityTotal,
    rarityHits,
    rarityAverage: rarityHits > 0 ? rarityTotal / rarityHits : null,
  };
}

function serializeCells(cells) {
  // Store only stable IDs and outcomes so saved daily progress can be re-localized later.
  return Object.fromEntries(
    Object.entries(cells).map(([key, cell]) => [
      key,
      {
        playerId: cell.playerId ?? null,
        result: cell.result ?? null,
        locked: Boolean(cell.locked),
      },
    ]),
  );
}

function hydrateCells(savedCells, locale) {
  const nextCells = createEmptyCells();

  for (const [key, savedCell] of Object.entries(savedCells ?? {})) {
    if (!savedCell) {
      continue;
    }

    const player = savedCell.playerId ? playersById[savedCell.playerId] : null;

    nextCells[key] = {
      playerId: savedCell.playerId ?? undefined,
      playerName: player ? getPlayerDisplayName(player, locale) : '',
      result: savedCell.result ?? null,
      locked: Boolean(savedCell.locked),
    };
  }

  return nextCells;
}

function getCurrentPuzzleDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidPuzzleDate(dateString, currentPuzzleDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString ?? '')) {
    return false;
  }

  const parsed = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return dateString >= ARCHIVE_START_DATE && dateString <= currentPuzzleDate;
}

function readUrlState(currentPuzzleDate) {
  if (typeof window === 'undefined') {
    return {
      locale: 'ja',
      mode: 'daily',
      view: 'game',
      selectedDailyDate: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const locale = params.get('lang') === 'en' ? 'en' : 'ja';
  const requestedMode = params.get('mode');
  const mode = requestedMode === 'practice' || requestedMode === 'super-easy' || requestedMode === 'super-hard'
    ? requestedMode
    : 'daily';
  const view = params.get('view') === 'archive' ? 'archive' : 'game';
  const requestedDate = params.get('date');

  return {
    locale,
    mode,
    view,
    selectedDailyDate: isValidPuzzleDate(requestedDate, currentPuzzleDate)
      ? requestedDate
      : null,
  };
}

function buildAppUrl({
  locale,
  mode,
  view,
  selectedDailyDate,
  currentPuzzleDate,
  forceShareDate = false,
}) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  if (locale === 'en') {
    params.set('lang', 'en');
  }

  if (view === 'archive') {
    params.set('view', 'archive');
  }

  if (mode === 'practice' || mode === 'super-easy' || mode === 'super-hard') {
    params.set('mode', mode);
  }

  const effectiveDate = forceShareDate
    ? selectedDailyDate ?? currentPuzzleDate
    : selectedDailyDate;

  if (effectiveDate && isValidPuzzleDate(effectiveDate, currentPuzzleDate)) {
    params.set('date', effectiveDate);
  }

  url.search = params.toString();
  url.hash = '';
  return url.toString();
}

async function copyTextToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();

  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(input);
  }
}

function getSnapshotGrid(dateString) {
  return createGridForMode('daily', dateString);
}

function normalizePuzzleDateString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})$/)
    ?? value.match(/^(\d{4}-\d{2}-\d{2})T/);

  if (!match) {
    return null;
  }

  const normalizedDate = match[1];
  const parsed = new Date(`${normalizedDate}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : normalizedDate;
}

function normalizeStoredCells(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeDailyResultRow(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const puzzleDate = normalizePuzzleDateString(result.puzzle_date);

  if (!puzzleDate) {
    return null;
  }

  const score = Number.isFinite(result.score) ? result.score : 0;
  const guessCount = Number.isFinite(result.guess_count) ? result.guess_count : 0;
  const rarityTotal = Number.isFinite(result.rarity_total) ? result.rarity_total : 0;
  const rarityHits = Number.isFinite(result.rarity_hits) ? result.rarity_hits : 0;
  const rarityAverage = Number.isFinite(result.rarity_average) ? result.rarity_average : null;

  return {
    ...result,
    puzzle_date: puzzleDate,
    score,
    guess_count: guessCount,
    cells: normalizeStoredCells(result.cells),
    rarity_total: rarityTotal,
    rarity_hits: rarityHits,
    rarity_average: rarityAverage,
    completed_at: typeof result.completed_at === 'string' ? result.completed_at : null,
    updated_at: typeof result.updated_at === 'string' ? result.updated_at : '',
  };
}

function getDailyStorageKey(dateString, userId) {
  return `npb-daily-result:${dateString}:${userId ?? 'guest'}`;
}

function readStoredDailyResult(dateString, userId) {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(getDailyStorageKey(dateString, userId));

  if (!raw) {
    return null;
  }

  try {
    return normalizeDailyResultRow(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredDailyResult(dateString, userId, payload) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getDailyStorageKey(dateString, userId), JSON.stringify(payload));
}

function getCompletedHistoryKey(userId) {
  return `npb-daily-completed-history:${userId ?? 'guest'}`;
}

function getGuestMigrationKey(userId) {
  return `npb-guest-migration:${userId}`;
}

function readCompletedHistory(userId) {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(getCompletedHistoryKey(userId));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompletedHistory(userId, completedDates) {
  if (typeof window === 'undefined') {
    return;
  }

  const uniqueDates = [...new Set(completedDates)].sort();
  window.localStorage.setItem(getCompletedHistoryKey(userId), JSON.stringify(uniqueDates));
}

function addCompletedHistoryDate(userId, dateString) {
  const existing = readCompletedHistory(userId);
  writeCompletedHistory(userId, [...existing, dateString]);
}

function listStoredDailyResults(userId) {
  if (typeof window === 'undefined') {
    return [];
  }

  const suffix = `:${userId ?? 'guest'}`;
  const results = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key?.startsWith('npb-daily-result:') || !key.endsWith(suffix)) {
      continue;
    }

    const raw = window.localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = normalizeDailyResultRow(JSON.parse(raw));
      if (parsed) {
        results.push(parsed);
      }
    } catch {
      // Ignore malformed local history rows.
    }
  }

  return results.sort((left, right) => right.puzzle_date.localeCompare(left.puzzle_date));
}

function pickPreferredDailyResult(currentResult, nextResult) {
  if (!currentResult) {
    return nextResult;
  }

  const currentGuessCount = currentResult.guess_count ?? 0;
  const nextGuessCount = nextResult.guess_count ?? 0;

  if (nextGuessCount !== currentGuessCount) {
    return nextGuessCount > currentGuessCount ? nextResult : currentResult;
  }

  const currentUpdatedAt = currentResult.updated_at ?? '';
  const nextUpdatedAt = nextResult.updated_at ?? '';

  return nextUpdatedAt >= currentUpdatedAt ? nextResult : currentResult;
}

function getArchiveDatesFromStart(startDate, endDate) {
  const dates = [];
  let cursor = endDate;

  while (cursor >= startDate) {
    dates.push(cursor);
    cursor = getPreviousDateString(cursor);
  }

  return dates;
}

function formatArchiveDate(dateString, locale) {
  const formatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return formatter.format(new Date(`${dateString}T00:00:00`));
}

function createLeaderboard(items, limit = 4) {
  return Object.entries(items)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function ScoreValue({ score, total = 9 }) {
  return (
    <span className="leaderboard-score-value">
      <span className="leaderboard-score-part">{score}</span>
      <span className="leaderboard-score-slash">/</span>
      <span className="leaderboard-score-part">{total}</span>
    </span>
  );
}

function buildLeaderboardSlots(rows, totalSlots = 5) {
  return Array.from({ length: totalSlots }, (_, index) => rows[index] ?? null);
}

function getLeaderboardIdentity(user) {
  if (!user) {
    return { userId: null, displayName: null };
  }

  return {
    userId: user.id ?? null,
    displayName:
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      null,
  };
}

function mergeDailyResultsByDate(...resultSets) {
  const merged = new Map();

  for (const results of resultSets) {
    for (const result of results ?? []) {
      const normalizedResult = normalizeDailyResultRow(result);

      if (!normalizedResult) {
        continue;
      }

      const existing = merged.get(normalizedResult.puzzle_date);
      const nextUpdatedAt = normalizedResult.updated_at ?? '';
      const existingUpdatedAt = existing?.updated_at ?? '';

      if (!existing || nextUpdatedAt >= existingUpdatedAt) {
        merged.set(normalizedResult.puzzle_date, normalizedResult);
      }
    }
  }

  return [...merged.values()].sort((left, right) => right.puzzle_date.localeCompare(left.puzzle_date));
}

function dedupeLeaderboardRowsByDisplayName(rows) {
  const seenNames = new Set();
  const deduped = [];

  for (const row of rows ?? []) {
    const key = (row?.display_name ?? '').trim().toLowerCase();

    if (!key || seenNames.has(key)) {
      continue;
    }

    seenNames.add(key);
    deduped.push(row);
  }

  return deduped;
}

function getPreviousDateString(dateString) {
  const current = new Date(`${dateString}T00:00:00`);
  current.setDate(current.getDate() - 1);
  return current.toISOString().slice(0, 10);
}

function computeStreakStats(completedDates, todayDate) {
  const uniqueDates = [...new Set(completedDates)].sort();
  const dateSet = new Set(uniqueDates);

  let currentStreak = 0;
  let cursor = dateSet.has(todayDate) ? todayDate : getPreviousDateString(todayDate);

  while (dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = getPreviousDateString(cursor);
  }

  let bestStreak = 0;
  let run = 0;
  let previous = null;

  for (const date of uniqueDates) {
    if (!previous) {
      run = 1;
    } else if (getPreviousDateString(date) === previous) {
      run += 1;
    } else {
      run = 1;
    }

    bestStreak = Math.max(bestStreak, run);
    previous = date;
  }

  return { currentStreak, bestStreak };
}

function mergePerfectDatesWithLocal(perfectDates, userId) {
  const localPerfectDates = listStoredDailyResults(userId)
    .filter((result) => (result.score ?? 0) === 9)
    .map((result) => result.puzzle_date);

  return [...perfectDates, ...localPerfectDates];
}

function getInitialGrid(mode, dateString) {
  return createGridForMode(mode, dateString);
}

function localizeCategory(category, locale) {
  if (locale !== 'ja') {
    return category;
  }

  return {
    ...category,
    label: jaCategoryLabels[category.label] ?? localizeGeneratedCategoryLabel(category.label),
    details: {
      ...category.details,
      ...(jaCategoryDetails[category.type] ?? {}),
      history: category.details.history?.map(
        (entry) => jaCategoryLabels[entry] ?? entry,
      ),
    },
  };
}

function SummaryScreen({
  cells,
  score,
  locale,
  onClose,
  isDailyMode,
  leaderboardRows,
  leaderboardLoading,
  hasLeaderboardSupport,
  activeUserId,
  activeUserDisplayName,
}) {
  const text = copy[locale];
  const cellList = Object.values(cells);
  const solvedPlayers = cellList.filter((cell) => cell.result === 'correct');
  const leaderboardSlots = buildLeaderboardSlots(leaderboardRows);

  return (
    <section className="summary-card">
      <button className="summary-close" onClick={onClose} type="button">
        <span aria-hidden="true">×</span>
        <span className="sr-only">{text.summaryClose}</span>
      </button>
      <p className="summary-kicker">{text.summaryKicker}</p>
      <h2 className="summary-heading">{text.summaryHeading}</h2>
      <p className="summary-subheading">{text.summarySubheading(score)}</p>

      <div className="summary-strip">
        {cellList.map((cell, index) => (
          <div
            key={`strip-${index}`}
            className={
              cell.result === 'correct'
                ? 'summary-strip-cell correct'
                : 'summary-strip-cell'
            }
          >
            {index + 1}
          </div>
        ))}
      </div>

      <div className="summary-grid">
        {cellList.map((cell, index) => (
          <div
            key={`grid-${index}`}
            className={
              cell.result === 'correct'
                ? 'summary-cell correct'
                : 'summary-cell'
            }
          >
            <span>{index + 1}</span>
          </div>
        ))}
      </div>

      <div className="summary-scoreboard">
        <div>
          <p className="summary-label">{text.hits}</p>
          <strong className="summary-score">{score}</strong>
        </div>
        <div>
          <p className="summary-label">{text.misses}</p>
          <strong className="summary-score">{9 - score}</strong>
        </div>
        <div>
          <p className="summary-label">{text.final}</p>
          <strong className="summary-score total">{score} / 9</strong>
        </div>
      </div>

      <div className="summary-notes">
        <p className="summary-notes-title">{text.solvedSquares}</p>
        {solvedPlayers.length > 0 ? (
          solvedPlayers.map((cell) => (
            <p key={cell.playerName} className="summary-note">
              {cell.playerName}
            </p>
          ))
        ) : (
          <p className="summary-note">{text.noSolved}</p>
        )}
      </div>

      {isDailyMode && (
        <div className="summary-leaderboard">
          <p className="summary-notes-title">{text.summaryLeaderboard}</p>
          {leaderboardLoading ? (
            <p className="summary-note">{text.leaderboardLoading}</p>
          ) : !hasLeaderboardSupport ? (
            <p className="summary-note">{text.leaderboardUnavailable}</p>
          ) : (
            <div className="summary-leaderboard-table">
              <div className="summary-leaderboard-head">
                <span>{text.leaderboardRank}</span>
                <span>{text.leaderboardPlayer}</span>
                <span>{text.leaderboardScore}</span>
                <span>{text.leaderboardRarityScore}</span>
              </div>
              {leaderboardSlots.map((entry, index) => (
                <div
                  key={`${entry?.display_name ?? 'empty'}-${index}`}
                  className={
                    (
                      (entry?.user_id && entry.user_id === activeUserId) ||
                      (entry?.display_name && activeUserDisplayName && entry.display_name === activeUserDisplayName)
                    )
                      ? 'summary-leaderboard-row current-user'
                      : 'summary-leaderboard-row'
                  }
                >
                  <span>{index + 1}</span>
                  <div className="summary-leaderboard-player">
                    <strong>{entry?.display_name ?? '-'}</strong>
                    {entry?.rarity_average === null || entry?.rarity_average === undefined ? null : (
                      <small>{text.leaderboardRarityValue(Number(entry.rarity_average))}</small>
                    )}
                  </div>
                  <span>{entry ? <ScoreValue score={entry.score} /> : '-'}</span>
                  <span>-</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ArchiveScreen({ locale, activeUser, authReady, puzzleDate, onBackToGame, onOpenBoard }) {
  const text = copy[locale];
  const [remoteResults, setRemoteResults] = useState([]);
  const storedResults = authReady
    ? mergeDailyResultsByDate(
      listStoredDailyResults(activeUser?.id),
      remoteResults,
    )
    : [];
  const resultMap = Object.fromEntries(
    storedResults.map((result) => [result.puzzle_date, result]),
  );
  const archiveDates = getArchiveDatesFromStart(ARCHIVE_START_DATE, puzzleDate);
  const completedResults = storedResults.filter((result) => (result.guess_count ?? 0) >= MAX_GUESSES);
  const perfectResults = completedResults.filter((result) => (result.score ?? 0) === 9);
  const perfectDates = perfectResults.map((result) => result.puzzle_date);
  const streakStats = computeStreakStats(perfectDates, puzzleDate);

  const playerCounts = {};
  const teamCounts = {};
  const categoryCounts = {};

  for (const result of storedResults) {
    const cells = result.cells ?? {};

    for (const [key, cell] of Object.entries(cells)) {
      if (cell?.result !== 'correct' || !cell.playerId) {
        continue;
      }

      const player = playersById[cell.playerId];

      if (player) {
        const playerLabel = getPlayerDisplayName(player, locale);
        playerCounts[playerLabel] = (playerCounts[playerLabel] ?? 0) + 1;

        for (const teamName of player.teams ?? []) {
          const localizedTeam = locale === 'ja'
            ? jaCategoryLabels[teamName] ?? teamName
            : teamName;
          teamCounts[localizedTeam] = (teamCounts[localizedTeam] ?? 0) + 1;
        }
      }
    }

    try {
      const grid = getSnapshotGrid(result.puzzle_date);

      for (const category of [...grid.rows, ...grid.columns]) {
        const localizedLabel = localizeCategory(category, locale).label;
        categoryCounts[localizedLabel] = (categoryCounts[localizedLabel] ?? 0) + 1;
      }
    } catch {
      // Skip malformed legacy rows instead of crashing the whole archive screen.
    }
  }

  const archiveRows = archiveDates.map((dateString) => {
    const result = resultMap[dateString];

    if (!result) {
      return {
        dateString,
        scoreLabel: text.archivePlayNow,
        rarityLabel: '—',
      };
    }

    const score = result.score ?? 0;
    const guessCount = result.guess_count ?? 0;

    return {
      dateString,
      scoreLabel: guessCount >= MAX_GUESSES ? `${score} / 9` : text.archiveContinue,
      rarityLabel: '—',
    };
  });

  const averageScore = completedResults.length > 0
    ? completedResults.reduce((total, result) => total + (result.score ?? 0), 0) / completedResults.length
    : null;
  const averageRarity = null;
  const topPlayers = createLeaderboard(playerCounts);
  const topTeams = createLeaderboard(teamCounts);
  const topCategories = createLeaderboard(categoryCounts, 5);

  useEffect(() => {
    if (!authReady) {
      setRemoteResults([]);
      return;
    }

    if (!activeUser || !supabase) {
      setRemoteResults([]);
      return;
    }

    let isMounted = true;

    async function loadArchiveResults() {
      const { data, error } = await supabase
        .from('daily_results')
        .select('puzzle_date, score, guess_count, cells, rarity_average, updated_at')
        .eq('user_id', activeUser.id)
        .order('puzzle_date', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setRemoteResults([]);
        return;
      }

      setRemoteResults(
        Array.isArray(data)
          ? data
            .map((result) => normalizeDailyResultRow(result))
            .filter(Boolean)
          : [],
      );
    }

    loadArchiveResults();

    return () => {
      isMounted = false;
    };
  }, [activeUser, authReady]);

  return (
    <main className="archive-shell">
      <section className="archive-hero">
        <div>
          <p className="eyebrow">{text.archive}</p>
          <h1>{text.archiveTitle}</h1>
          <p className="archive-note">{text.archiveUpdated}</p>
        </div>
        <button className="account-button primary" onClick={onBackToGame}>
          {text.archiveBack}
        </button>
      </section>

      <section className="archive-layout">
        <div className="archive-stats-column">
          <section className="archive-panel">
            <h2 className="archive-panel-title">{text.archiveStatsTitle}</h2>

            <div className="archive-stat-grid">
              <article className="archive-stat-card">
                <span>{text.completedGrids}</span>
                <strong>{completedResults.length}</strong>
              </article>
              <article className="archive-stat-card">
                <span>{text.averageScore}</span>
                <strong>{averageScore === null ? '—' : text.avgScoreValue(averageScore)}</strong>
              </article>
              <article className="archive-stat-card">
                <span>{text.averageRarity}</span>
                <strong>{averageRarity === null ? '—' : text.avgRarityValue(averageRarity)}</strong>
              </article>
            </div>

            <div className="archive-streak-card">
              <span>{text.currentStreakLabel}: <strong>{text.streakDays(streakStats.currentStreak)}</strong></span>
              <span>{text.bestStreak}: <strong>{text.streakDays(streakStats.bestStreak)}</strong></span>
            </div>
          </section>

          <section className="archive-panel">
            <h2 className="archive-panel-title">{text.topPlayersTitle}</h2>
            <div className="archive-player-grid">
              {topPlayers.length > 0 ? topPlayers.map((player) => (
                <article key={player.label} className="archive-player-card">
                  <div className="archive-player-avatar">{player.label.slice(0, 1)}</div>
                  <strong>{player.label}</strong>
                  <span>{player.count}</span>
                </article>
              )) : (
                <p className="archive-empty">{text.archiveEmptyStat}</p>
              )}
            </div>
          </section>

          <div className="archive-bottom-grid">
            <section className="archive-panel">
              <h2 className="archive-panel-title">{text.topTeamsTitle}</h2>
              <div className="archive-badge-grid">
                {topTeams.length > 0 ? topTeams.map((team) => (
                  <article key={team.label} className="archive-badge-card">
                    <strong>{team.label}</strong>
                    <span>{team.count}</span>
                  </article>
                )) : (
                  <p className="archive-empty">{text.archiveEmptyStat}</p>
                )}
              </div>
            </section>

            <section className="archive-panel">
              <h2 className="archive-panel-title">{text.topCategoriesTitle}</h2>
              <div className="archive-category-list">
                {topCategories.length > 0 ? topCategories.map((category) => (
                  <div key={category.label} className="archive-category-row">
                    <span>{category.label}</span>
                    <strong>{category.count}</strong>
                  </div>
                )) : (
                  <p className="archive-empty">{text.archiveEmptyStat}</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <section className="archive-panel archive-list-panel">
          <div className="archive-list-header">
            <h2 className="archive-panel-title">{text.archiveTitle}</h2>
          </div>

          {storedResults.length === 0 && (
            <p className="archive-empty archive-list-empty">{text.archiveNoData}</p>
          )}

          <div className="archive-table">
            <div className="archive-table-head">
              <span>{text.archiveDate}</span>
              <span>{text.archiveScore}</span>
              <span>{text.archiveRarity}</span>
            </div>

            {archiveRows.map((row) => (
              <div key={row.dateString} className="archive-table-row">
                <span>{formatArchiveDate(row.dateString, locale)}</span>
                <span>
                  <button
                    className="archive-score-button"
                    type="button"
                    onClick={() => onOpenBoard(row.dateString)}
                    aria-label={`${text.archiveOpenBoard}: ${formatArchiveDate(row.dateString, locale)}`}
                  >
                    {row.scoreLabel}
                  </button>
                </span>
                <span>{row.rarityLabel}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function AuthModal({
  locale,
  mode,
  form,
  onChange,
  onClose,
  onSubmit,
  onSwitchMode,
  notice,
  loading,
}) {
  const text = copy[locale];
  const isSignup = mode === 'signup';

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section className="auth-card" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          {text.authClose}
        </button>

        <p className="auth-kicker">{isSignup ? text.signIn : text.logIn}</p>
        <h2 className="auth-heading">
          {isSignup ? text.authSignupHeading : text.authLoginHeading}
        </h2>
        <p className="auth-blurb">
          {isSignup ? text.authSignupBlurb : text.authLoginBlurb}
        </p>

        <form className="auth-form" onSubmit={onSubmit}>
          {isSignup && (
            <label className="auth-field">
              <span>{text.authName}</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder={text.authNamePlaceholder}
                autoFocus
              />
            </label>
          )}

          <label className="auth-field">
            <span>{text.authEmail}</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange('email', event.target.value)}
              placeholder={text.authEmailPlaceholder}
              autoFocus={!isSignup}
            />
          </label>

          <label className="auth-field">
            <span>{text.authPassword}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder={text.authPasswordPlaceholder}
            />
          </label>

          {isSignup && (
            <label className="auth-field">
              <span>{text.authConfirmPassword}</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => onChange('confirmPassword', event.target.value)}
                placeholder={text.authConfirmPasswordPlaceholder}
              />
            </label>
          )}

          {notice && <p className="auth-notice">{notice}</p>}

          <div className="auth-actions">
            <button className="toolbar-button primary" type="submit" disabled={loading}>
              {loading
                ? text.authWorking
                : isSignup
                  ? text.authSignupSubmit
                  : text.authLoginSubmit}
            </button>
            <button
              className="auth-switch"
              type="button"
              onClick={() => onSwitchMode(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? text.authSwitchToLogin : text.authSwitchToSignup}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SiteNote({ locale }) {
  const text = copy[locale];

  return (
    <footer className="site-note" aria-label="Legal notice">
      <p>{text.legalDisclaimer}</p>
      <p>
        {text.dataCreditPrefix}{' '}
        <a href="https://proeyekyuu.com/" target="_blank" rel="noreferrer">
          {text.dataCreditName}
        </a>
      </p>
    </footer>
  );
}

function GameScreen({
  locale,
  mode,
  activeUser,
  authReady,
  isVisible,
  puzzleDate,
  currentPuzzleDate,
  onOpenArchive,
  onReturnToToday,
}) {
  const text = copy[locale];
  const [activeGrid, setActiveGrid] = useState(() =>
    getInitialGrid(mode, puzzleDate),
  );
  const [cells, setCells] = useState(createEmptyCells);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [message, setMessage] = useState(text.defaultMessage);
  const [editorNotice, setEditorNotice] = useState('');
  const [guessCount, setGuessCount] = useState(0);
  const [dailyResultLoading, setDailyResultLoading] = useState(false);
  const [hasLocalDailyRestore, setHasLocalDailyRestore] = useState(false);
  const [streakStats, setStreakStats] = useState({ currentStreak: 0, bestStreak: 0 });
  const [showRarity, setShowRarity] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const score = Object.values(cells).filter(
    (cell) => cell.result === 'correct',
  ).length;
  const guessesRemaining = MAX_GUESSES - guessCount;
  const isGameOver = guessCount >= MAX_GUESSES;
  const isDailyMode = mode === 'daily';
  const isViewingArchiveDate = isDailyMode && puzzleDate !== currentPuzzleDate;
  const hasLeaderboardSupport = ENABLE_PUBLIC_LEADERBOARD && Boolean(supabase);
  const localizedGrid = {
    ...activeGrid,
    rows: activeGrid.rows.map((category) => localizeCategory(category, locale)),
    columns: activeGrid.columns.map((category) => localizeCategory(category, locale)),
  };
  const cellMeta = Object.fromEntries(
    activeGrid.rows.flatMap((row, rowIndex) =>
      activeGrid.columns.map((column, columnIndex) => {
        const count = getEligibleIntersectionCount(row.id, column.id, eligibility);
        const band = getRarityBandLabel(count, text);

        return [
          getCellKey(rowIndex, columnIndex),
          {
            count,
            tone: getRarityTone(count),
            label: text.rarityCount(count, band),
          },
        ];
      }),
    ),
  );
  const allPlayers = Object.values(playersById);
  const selectedCellKey = selectedCell
    ? getCellKey(selectedCell.rowIndex, selectedCell.columnIndex)
    : null;
  const eligiblePlayerIdsForSelectedCell = selectedCell && mode === 'super-easy'
    ? new Set(
      getIntersectionPlayerIds(
        activeGrid.rows[selectedCell.rowIndex],
        activeGrid.columns[selectedCell.columnIndex],
        eligibility,
        playerAwards,
        battingSeasons,
        pitchingSeasons,
      ),
    )
    : null;
  const usedPlayerIds = new Set(
    Object.entries(cells).flatMap(([key, cell]) => (
      key !== selectedCellKey && cell?.result === 'correct' && cell.playerId
        ? [cell.playerId]
        : []
    )),
  );
  const hasDraftQuery = Boolean(draftName.trim());
  const suggestions = hasDraftQuery
    ? allPlayers
      .map((player) => {
        const matchScore = getPlayerNameQueryScore(player, draftName);

        if (matchScore === null) {
          return null;
        }

        return {
          player,
          label: getPlayerDisplayName(player, locale),
          detail: getPlayerSuggestionDetail(player, locale),
          matchScore,
          isEligibleForSelectedCell: eligiblePlayerIdsForSelectedCell?.has(player.id) ?? false,
          isUsed: usedPlayerIds.has(player.id),
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        compareSuggestionEntries(left, right, locale, mode === 'super-easy'))
      .slice(0, 8)
    : [];
  const leaderboardIdentity = getLeaderboardIdentity(activeUser);

  async function refreshStreakStats(userId) {
    if (!supabase) {
      const mergedDates = mergePerfectDatesWithLocal([], userId);
      setStreakStats(computeStreakStats(mergedDates, puzzleDate));
      return;
    }

    const { data, error } = await supabase
      .from('daily_results')
      .select('puzzle_date')
      .eq('user_id', userId)
      .eq('score', 9)
      .order('puzzle_date', { ascending: true });

    if (error) {
      const mergedDates = mergePerfectDatesWithLocal([], userId);
      setStreakStats(computeStreakStats(mergedDates, puzzleDate));
      return;
    }

    const mergedDates = mergePerfectDatesWithLocal(
      data.map((row) => row.puzzle_date),
      userId,
    );

    setStreakStats(
      computeStreakStats(mergedDates, puzzleDate),
    );
  }

  useEffect(() => {
    if (!selectedCell || typeof window === 'undefined') {
      return undefined;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [selectedCell]);

  useEffect(() => {
    if (!ENABLE_PUBLIC_LEADERBOARD || !isDailyMode || !showSummary || !isGameOver) {
      setLeaderboardRows([]);
      setLeaderboardLoading(false);
      return;
    }

    if (!supabase) {
      setLeaderboardRows([]);
      setLeaderboardLoading(false);
      return;
    }

    let isMounted = true;

    async function loadLeaderboard() {
      setLeaderboardLoading(true);

      const { data, error } = await supabase.rpc('get_daily_leaderboard', {
        target_puzzle_date: puzzleDate,
      });

      if (!isMounted) {
        return;
      }

      if (error) {
        setLeaderboardRows([]);
        setLeaderboardLoading(false);
        return;
      }

      setLeaderboardRows(
        dedupeLeaderboardRowsByDisplayName(Array.isArray(data) ? data : []),
      );
      setLeaderboardLoading(false);
    }

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [isDailyMode, isGameOver, puzzleDate, showSummary]);

  useEffect(() => {
    if (!isDailyMode || !isVisible) {
      return;
    }

    if (!authReady) {
      return;
    }

    if (!activeUser || !supabase) {
      setStreakStats({ currentStreak: 0, bestStreak: 0 });
      return;
    }

    let isMounted = true;

    async function loadStreakStats() {
      await refreshStreakStats(activeUser.id);

      if (!isMounted) {
        return;
      }
    }

    loadStreakStats();

    return () => {
      isMounted = false;
    };
  }, [activeUser, authReady, isDailyMode, isVisible, puzzleDate]);

  useEffect(() => {
    if (!isDailyMode || !isVisible) {
      return;
    }

    if (!authReady) {
      setDailyResultLoading(Boolean(supabase));
      setMessage(Boolean(supabase) ? text.dailySyncLoading : text.defaultMessage);
      return;
    }

    const localResult = readStoredDailyResult(puzzleDate, activeUser?.id);

    if (localResult) {
      setHasLocalDailyRestore(true);
      if ((localResult.guess_count ?? 0) >= MAX_GUESSES) {
        addCompletedHistoryDate(activeUser?.id, localResult.puzzle_date ?? puzzleDate);
      }
      setActiveGrid(getSnapshotGrid(puzzleDate));
      setCells(hydrateCells(localResult.cells, locale));
      setGuessCount(localResult.guess_count ?? 0);
      setSelectedCell(null);
      setSelectedCategory(null);
      setDraftName('');
      setEditorNotice('');
      setShowSummary((localResult.guess_count ?? 0) >= MAX_GUESSES);
      setMessage(activeUser ? text.dailySyncLoaded : text.dailyGuestNotice);
    }

    if (!activeUser || !supabase) {
      setActiveGrid(getSnapshotGrid(puzzleDate));
      if (!localResult) {
        setHasLocalDailyRestore(false);
        setCells(createEmptyCells());
        setGuessCount(0);
        setShowSummary(false);
      }
      setSelectedCell(null);
      setSelectedCategory(null);
      setDraftName('');
      setEditorNotice('');
      if (!localResult) {
        setMessage(activeUser ? text.defaultMessage : text.dailyGuestNotice);
      }
      setDailyResultLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDailyResult() {
      setDailyResultLoading(true);
      if (!localResult) {
        setMessage(text.dailySyncLoading);
      }

      const { data, error } = await supabase
        .from('daily_results')
        .select('cells, guess_count')
        .eq('user_id', activeUser.id)
        .eq('puzzle_date', puzzleDate)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setDailyResultLoading(false);
        setMessage(text.dailySyncError);
        return;
      }

      setActiveGrid(getSnapshotGrid(puzzleDate));

      if (data) {
        setCells(hydrateCells(data.cells, locale));
        setGuessCount(data.guess_count ?? 0);
        writeStoredDailyResult(puzzleDate, activeUser.id, data);
        if ((data.guess_count ?? 0) >= MAX_GUESSES) {
          addCompletedHistoryDate(activeUser.id, puzzleDate);
        }
        setHasLocalDailyRestore(true);
        setMessage(text.dailySyncLoaded);
      } else {
        if (!localResult) {
          setHasLocalDailyRestore(false);
          setCells(createEmptyCells());
          setGuessCount(0);
          setShowSummary(false);
          setMessage(text.defaultMessage);
        }
      }

      setSelectedCell(null);
      setSelectedCategory(null);
      setDraftName('');
      setEditorNotice('');
      setDailyResultLoading(false);
    }

    loadDailyResult();

    return () => {
      isMounted = false;
    };
  }, [activeUser, authReady, isDailyMode, isVisible, locale, puzzleDate, text.dailyGuestNotice, text.dailySyncError, text.dailySyncLoaded, text.dailySyncLoading, text.defaultMessage]);

  useEffect(() => {
    if (isDailyMode || !isVisible) {
      return;
    }

    if (gridMatchesModeConstraints(activeGrid, mode, eligibility)) {
      return;
    }

    setActiveGrid(createGridForMode(mode, puzzleDate));
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setShowHelp(false);
    setDraftName('');
    setEditorNotice('');
    setShowSummary(false);
    setMessage(text.newGridMessage);
  }, [activeGrid, isDailyMode, isVisible, mode, puzzleDate, text.newGridMessage]);

  async function persistDailyResult(nextCells, nextGuessCount, nextScore) {
    if (!isDailyMode) {
      return;
    }

    const rarityStats = computeResultRarityStats(nextCells, activeGrid, eligibility);

    // One row per user per puzzle date keeps the daily board resumable across refreshes and languages.
    const payload = {
      puzzle_date: puzzleDate,
      score: nextScore,
      guess_count: nextGuessCount,
      cells: serializeCells(nextCells),
      rarity_total: rarityStats.rarityTotal,
      rarity_hits: rarityStats.rarityHits,
      rarity_average: rarityStats.rarityAverage,
      completed_at: nextGuessCount >= MAX_GUESSES ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    writeStoredDailyResult(puzzleDate, activeUser?.id, payload);

    if (nextGuessCount >= MAX_GUESSES) {
      addCompletedHistoryDate(activeUser?.id, puzzleDate);
      void refreshStreakStats(activeUser?.id);
    }

    if (!activeUser || !supabase) {
      return;
    }

    payload.user_id = activeUser.id;

    const { error } = await supabase.from('daily_results').upsert(payload, {
      onConflict: 'user_id,puzzle_date',
    });

    if (error) {
      setMessage(text.dailySyncError);
      return;
    }

    if (nextGuessCount >= MAX_GUESSES) {
      void refreshStreakStats(activeUser.id);
    }

  }

  function handleCellClick(rowIndex, columnIndex) {
    const cellKey = getCellKey(rowIndex, columnIndex);
    const currentCell = cells[cellKey];

    if (currentCell.locked || isGameOver) {
      return;
    }

    setSelectedCell({ rowIndex, columnIndex });
    setDraftName(currentCell.playerName);
    setEditorNotice('');
    setMessage(text.openMessage);
  }

  function closeEditor() {
    setSelectedCell(null);
    setDraftName('');
    setEditorNotice('');
  }

  function closeCategoryInfo() {
    setSelectedCategory(null);
  }

  function closeHelp() {
    setShowHelp(false);
  }

  function handleSubmitGuess() {
    if (!selectedCell) {
      return;
    }

    const player = findPlayerByName(playersById, draftName);
    const cellKey = getCellKey(selectedCell.rowIndex, selectedCell.columnIndex);

    if (!player) {
      setEditorNotice(text.missingPlayer);
      setMessage(text.missingPlayer);
      return;
    }

    if (isPlayerAlreadyUsed(cells, player.id, cellKey)) {
      const duplicateMessage = text.duplicatePlayer(getPlayerDisplayName(player, locale));
      setEditorNotice(duplicateMessage);
      setMessage(duplicateMessage);
      return;
    }

    const rowCategory = activeGrid.rows[selectedCell.rowIndex];
    const columnCategory = activeGrid.columns[selectedCell.columnIndex];
    const isCorrect = getIntersectionPlayerIds(
      rowCategory,
      columnCategory,
      eligibility,
      playerAwards,
      battingSeasons,
      pitchingSeasons,
    ).includes(player.id);
    const nextGuessCount = guessCount + 1;
    const nextScore = isCorrect ? score + 1 : score;
    const nextCells = {
      ...cells,
      [cellKey]: {
        playerId: player.id,
        playerName: getPlayerDisplayName(player, locale),
        result: isCorrect ? 'correct' : 'incorrect',
        locked: isCorrect,
      },
    };

    setCells(nextCells);
    setGuessCount(nextGuessCount);
    if (nextGuessCount >= MAX_GUESSES) {
      setShowSummary(true);
    }
    setMessage(
      nextGuessCount >= MAX_GUESSES
        ? text.gameOver(nextScore)
        : isCorrect
          ? text.correct(getPlayerDisplayName(player, locale))
          : text.incorrect(getPlayerDisplayName(player, locale)),
    );

    if (nextGuessCount >= MAX_GUESSES) {
      setSelectedCategory(null);
    }

    setEditorNotice('');
    closeEditor();
    void persistDailyResult(nextCells, nextGuessCount, nextScore);
  }

  function handleReset() {
    if (isDailyMode) {
      setActiveGrid(getSnapshotGrid(puzzleDate));
    }
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setShowHelp(false);
    setDraftName('');
    setEditorNotice('');
    setShowSummary(false);
    setMessage(isDailyMode ? text.dailyResetMessage : text.resetMessage);
  }

  function handleNewGrid() {
    if (isDailyMode) {
      return;
    }

    setActiveGrid(createGridForMode(mode, puzzleDate));
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setShowHelp(false);
    setDraftName('');
    setEditorNotice('');
    setShowSummary(false);
    setMessage(text.newGridMessage);
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-main">
          {text.eyebrow && <p className="eyebrow">{text.eyebrow}</p>}
          <h1>{text.title}</h1>
          <div className="hero-actions">
            <button
              className={showHelp ? 'info-button active' : 'info-button'}
              onClick={() => setShowHelp((current) => !current)}
            >
              {text.howItWorks}
            </button>
            <button
              className={showRarity ? 'info-button active' : 'info-button'}
              onClick={() => setShowRarity((current) => !current)}
              type="button"
            >
              {showRarity ? text.rarityToggleOn : text.rarityToggleOff}
            </button>
            {isDailyMode && (
              <button className="info-button" onClick={onOpenArchive} type="button">
                {text.archive}
              </button>
            )}
            {isViewingArchiveDate && (
              <button className="info-button" onClick={onReturnToToday} type="button">
                {text.returnToToday}
              </button>
            )}
          </div>
          {isDailyMode && (
            <div className="daily-meta">
              <p className="daily-meta-title">{text.dailyBoardLabel(puzzleDate)}</p>
              <p className="daily-meta-note">{text.dailyBoardNotice}</p>
              {activeUser && (
                <div className="daily-stats">
                  <div className="daily-stat-chip">
                    <span>{text.streak}</span>
                    <strong>{text.streakDays(streakStats.currentStreak)}</strong>
                  </div>
                  <div className="daily-stat-chip">
                    <span>{text.bestStreak}</span>
                    <strong>{text.streakDays(streakStats.bestStreak)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="score-panel">
          <span>{text.score}</span>
          <strong>{score} / 9</strong>
          <small>
            {dailyResultLoading
              ? hasLocalDailyRestore
                ? isGameOver
                  ? text.noGuesses
                  : text.guessesRemaining(guessesRemaining)
                : text.dailySyncLoading
              : isGameOver
                ? text.noGuesses
                : text.guessesRemaining(guessesRemaining)}
          </small>
        </div>

        {showHelp && (
          <section className="help-panel">
            <p className="help-panel-heading">{text.howItWorks}</p>
            <p className="help-panel-text">{text.howText}</p>
          </section>
        )}
      </section>

      <div className="toolbar">
        {!isDailyMode && (
          <button className="toolbar-button primary" onClick={handleNewGrid}>
            {text.newGrid}
          </button>
        )}
        {!isDailyMode && (
          <button className="toolbar-button" onClick={handleReset}>
            {text.reset}
          </button>
        )}
        {isGameOver && !showSummary && (
          <button className="toolbar-button" onClick={() => setShowSummary(true)} type="button">
            {text.summaryReopen}
          </button>
        )}
        <p className="status-text">{message}</p>
      </div>

      {selectedCategory && !isGameOver && (
        <section className="category-popup">
          <button className="popup-close" onClick={closeCategoryInfo}>
            {text.close}
          </button>
          <p className="popup-heading">{selectedCategory.details.heading}</p>
          <h2 className="popup-title">{selectedCategory.label}</h2>
          <p className="popup-subtitle">{selectedCategory.details.subtitle}</p>
          <p className="popup-note">{selectedCategory.details.note}</p>
          {selectedCategory.details.history?.length > 0 && (
            <div className="popup-history">
              {selectedCategory.details.history.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {isGameOver && showSummary ? (
        <SummaryScreen
          cells={cells}
          score={score}
          locale={locale}
          onClose={() => setShowSummary(false)}
          isDailyMode={isDailyMode}
          leaderboardRows={leaderboardRows}
          leaderboardLoading={leaderboardLoading}
          hasLeaderboardSupport={hasLeaderboardSupport}
          activeUserId={leaderboardIdentity.userId}
          activeUserDisplayName={leaderboardIdentity.displayName}
        />
      ) : (
        <GridBoard
          grid={localizedGrid}
          cells={cells}
          onCellClick={handleCellClick}
          onCategoryClick={setSelectedCategory}
          emptyLabel={text.selectPlayer}
          statusText={{
            correct: text.cellCorrectStatus,
            incorrect: text.cellIncorrectStatus,
          }}
          cellMeta={showRarity ? cellMeta : undefined}
        />
      )}

      {selectedCell && !isGameOver && (
        <div className="editor-backdrop" onClick={closeEditor}>
          <section
            className="editor-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{text.enterPlayer}</h2>
            <p className="editor-label">
              {localizedGrid.rows[selectedCell.rowIndex].label} +{' '}
              {localizedGrid.columns[selectedCell.columnIndex].label}
            </p>
            {showRarity && (
              <p className="editor-rarity">
                {cellMeta[getCellKey(selectedCell.rowIndex, selectedCell.columnIndex)]?.label}
              </p>
            )}

            <input
              className="player-input"
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setEditorNotice('');
              }}
              placeholder={text.placeholder}
              autoFocus
            />

            {editorNotice && <p className="editor-notice">{editorNotice}</p>}

            <div className="suggestions">
              {suggestions.length > 0 ? suggestions.map((suggestion) => (
                <button
                  key={suggestion.player.id}
                  className={suggestion.isUsed ? 'suggestion-chip used' : 'suggestion-chip'}
                  onClick={() => {
                    setDraftName(suggestion.label);
                    setEditorNotice('');
                  }}
                  type="button"
                >
                  <strong className="suggestion-chip-label">{suggestion.label}</strong>
                  {suggestion.detail && (
                    <span className="suggestion-chip-meta">{suggestion.detail}</span>
                  )}
                  {(suggestion.isEligibleForSelectedCell || suggestion.isUsed) && (
                    <span className="suggestion-chip-tags">
                      {suggestion.isEligibleForSelectedCell && (
                        <span className="suggestion-chip-tag success">{text.suggestionEligible}</span>
                      )}
                      {suggestion.isUsed && (
                        <span className="suggestion-chip-tag muted">{text.suggestionAlreadyUsed}</span>
                      )}
                    </span>
                  )}
                </button>
              )) : (
                <p className="suggestions-note">
                  {hasDraftQuery ? text.suggestionsEmpty : text.suggestionsHint}
                </p>
              )}
            </div>

            <div className="editor-actions">
              <button className="toolbar-button primary" onClick={handleSubmitGuess}>
                {text.submitGuess}
              </button>
              <button className="toolbar-button" onClick={closeEditor}>
                {text.cancel}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const initialPuzzleDate = getCurrentPuzzleDate();
  const initialUrlState = readUrlState(initialPuzzleDate);
  const [activeLocale, setActiveLocale] = useState(initialUrlState.locale);
  const [activeMode, setActiveMode] = useState(initialUrlState.mode);
  const [activeView, setActiveView] = useState(initialUrlState.view);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(initialPuzzleDate);
  const [selectedDailyDate, setSelectedDailyDate] = useState(initialUrlState.selectedDailyDate);
  const [authMode, setAuthMode] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authForms, setAuthForms] = useState({
    login: {
      email: '',
      password: '',
    },
    signup: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const activeUser = authSession?.user ?? null;

  function handleAuthFieldChange(mode, field, value) {
    setAuthForms((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [field]: value,
      },
    }));
  }

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setAuthSession(data.session ?? null);
        setAuthReady(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAuthSession(null);
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (!isMounted) {
        return;
      }

      setAuthSession(session ?? null);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentPuzzleDate((current) => {
        const next = getCurrentPuzzleDate();
        return current === next ? current : next;
      });
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextState = readUrlState(getCurrentPuzzleDate());
      setActiveLocale(nextState.locale);
      setActiveMode(nextState.mode);
      setActiveView(nextState.view);
      setSelectedDailyDate(nextState.selectedDailyDate);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!authMode || typeof window === 'undefined') {
      return undefined;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [authMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextUrl = buildAppUrl({
      locale: activeLocale,
      mode: activeMode,
      view: activeView,
      selectedDailyDate: activeMode === 'daily' || activeView === 'archive'
        ? selectedDailyDate
        : null,
      currentPuzzleDate,
    });

    if (nextUrl !== window.location.href) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [activeLocale, activeMode, activeView, selectedDailyDate, currentPuzzleDate]);

  useEffect(() => {
    if (!activeUser || !supabase || typeof window === 'undefined') {
      return;
    }

    if (window.localStorage.getItem(getGuestMigrationKey(activeUser.id)) === 'done') {
      return;
    }

    let isMounted = true;

    async function migrateGuestHistory() {
      const guestResults = listStoredDailyResults();
      const guestCompletedDates = readCompletedHistory();

      if (guestResults.length === 0 && guestCompletedDates.length === 0) {
        window.localStorage.setItem(getGuestMigrationKey(activeUser.id), 'done');
        return;
      }

      const localUserResults = listStoredDailyResults(activeUser.id);
      const { data: remoteResults, error } = await supabase
        .from('daily_results')
        .select('puzzle_date, score, guess_count, cells, rarity_total, rarity_hits, rarity_average, completed_at, updated_at')
        .eq('user_id', activeUser.id);

      if (!isMounted || error) {
        return;
      }

      const mergedByDate = new Map();

      for (const result of [...(remoteResults ?? []), ...localUserResults, ...guestResults]) {
        if (!result?.puzzle_date) {
          continue;
        }

        mergedByDate.set(
          result.puzzle_date,
          pickPreferredDailyResult(mergedByDate.get(result.puzzle_date), result),
        );
      }

      const mergedResults = [...mergedByDate.values()];

      for (const result of mergedResults) {
        writeStoredDailyResult(result.puzzle_date, activeUser.id, {
          ...result,
          puzzle_date: result.puzzle_date,
        });
      }

      writeCompletedHistory(
        activeUser.id,
        [...readCompletedHistory(activeUser.id), ...guestCompletedDates],
      );

      const rowsToUpsert = mergedResults.map((result) => ({
        user_id: activeUser.id,
        puzzle_date: result.puzzle_date,
        score: result.score ?? 0,
        guess_count: result.guess_count ?? 0,
        cells: result.cells ?? {},
        rarity_total: result.rarity_total ?? 0,
        rarity_hits: result.rarity_hits ?? 0,
        rarity_average: result.rarity_average ?? null,
        completed_at: result.completed_at ?? ((result.guess_count ?? 0) >= MAX_GUESSES ? new Date().toISOString() : null),
        updated_at: result.updated_at ?? new Date().toISOString(),
      }));

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('daily_results').upsert(rowsToUpsert, {
          onConflict: 'user_id,puzzle_date',
        });

        if (!isMounted || upsertError) {
          return;
        }
      }

      window.localStorage.setItem(getGuestMigrationKey(activeUser.id), 'done');
    }

    migrateGuestHistory();

    return () => {
      isMounted = false;
    };
  }, [activeUser]);

  const puzzleDate = selectedDailyDate ?? currentPuzzleDate;

  function openArchiveBoard(dateString) {
    setSelectedDailyDate(dateString);
    setActiveMode('daily');
    setActiveView('game');
  }

  function returnToTodayBoard() {
    setSelectedDailyDate(null);
    setActiveMode('daily');
    setActiveView('game');
  }

  async function copyBoardLink(dateString, locale) {
    const shareUrl = buildAppUrl({
      locale,
      mode: 'daily',
      view: 'game',
      selectedDailyDate: dateString,
      currentPuzzleDate,
      forceShareDate: true,
    });

    await copyTextToClipboard(shareUrl);
  }

  async function handleTopBarCopyBoardLink() {
    try {
      await copyBoardLink(puzzleDate, activeLocale);
      setAuthNotice(activeText.copyLinkSuccess);
    } catch {
      setAuthNotice(activeText.copyLinkError);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!authMode) {
      return;
    }

    const text = copy[activeLocale];

    if (!hasSupabaseConfig || !supabase) {
      setAuthNotice(text.authConfigMissing);
      return;
    }

    if (authMode === 'signup' && authForms.signup.password !== authForms.signup.confirmPassword) {
      setAuthNotice(text.authPasswordMismatch);
      return;
    }

    setAuthLoading(true);
    setAuthNotice('');

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForms.login.email,
          password: authForms.login.password,
        });

        if (error) {
          throw error;
        }

        setAuthNotice(text.authLoginSuccess);
        setAuthMode(null);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authForms.signup.email,
          password: authForms.signup.password,
          options: {
            data: {
              display_name: authForms.signup.name,
            },
          },
        });

        if (error) {
          throw error;
        }

        setAuthNotice(text.authSignupSuccess);
        if (data.session) {
          setAuthMode(null);
        }
      }
    } catch (error) {
      setAuthNotice(error.message);
      return;
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  function openAuthModal(nextMode) {
    setAuthNotice('');
    setAuthMode(nextMode);
  }

  function closeAuthModal() {
    setAuthNotice('');
    setAuthMode(null);
  }

  function switchAuthMode(nextMode) {
    setAuthNotice('');
    setAuthMode(nextMode);
  }

  const activeText = copy[activeLocale];
  const leaderboardIdentity = getLeaderboardIdentity(activeUser);

  return (
    <div className={activeLocale === 'ja' ? 'page-shell locale-ja' : 'page-shell'}>
      <header className="top-bar">
        <nav className="tab-bar" aria-label="Language tabs">
          <button
            className={activeLocale === 'ja' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveLocale('ja')}
          >
            日本語
          </button>
          <button
            className={activeLocale === 'en' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveLocale('en')}
          >
            English
          </button>
        </nav>

        <div className="account-actions">
          {!authReady ? (
            <div className="account-badge">
              <span>{activeText.authRestoring}</span>
            </div>
          ) : activeUser ? (
            <>
              <div className="account-badge">
                <span>{activeText.authLoggedInAs}</span>
                <strong>{activeUser.user_metadata?.display_name || activeUser.email}</strong>
              </div>
              <button className="account-button secondary" onClick={handleLogout}>
                {activeText.authLogout}
              </button>
              {activeView === 'game' && activeMode === 'daily' && (
                <button className="account-button secondary" onClick={handleTopBarCopyBoardLink}>
                  {activeText.copyLink}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="account-button secondary" onClick={() => openAuthModal('login')}>
                {activeText.logIn}
              </button>
              <button className="account-button primary" onClick={() => openAuthModal('signup')}>
                {activeText.signIn}
              </button>
              {activeView === 'game' && activeMode === 'daily' && (
                <button className="account-button secondary" onClick={handleTopBarCopyBoardLink}>
                  {activeText.copyLink}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {activeView === 'game' ? (
        <>
          <nav className="mode-switch" aria-label="Game mode tabs">
            <button
              className={activeMode === 'daily' ? 'mode-switch-button active' : 'mode-switch-button'}
              onClick={() => setActiveMode('daily')}
            >
              {copy[activeLocale].dailyTab}
            </button>
            <button
              className={activeMode === 'practice' ? 'mode-switch-button active' : 'mode-switch-button'}
              onClick={() => setActiveMode('practice')}
            >
              {copy[activeLocale].practiceTab}
            </button>
            <button
              className={activeMode === 'super-easy' ? 'mode-switch-button active' : 'mode-switch-button'}
              onClick={() => setActiveMode('super-easy')}
            >
              {copy[activeLocale].superEasyTab}
            </button>
            <button
              className={activeMode === 'super-hard' ? 'mode-switch-button active' : 'mode-switch-button'}
              onClick={() => setActiveMode('super-hard')}
            >
              {copy[activeLocale].superHardTab}
            </button>
          </nav>

          <div className={activeLocale === 'ja' ? 'tab-panel active' : 'tab-panel'}>
            <div className={activeMode === 'daily' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="ja"
                mode="daily"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'ja' && activeMode === 'daily'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'practice' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="ja"
                mode="practice"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'ja' && activeMode === 'practice'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'super-easy' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="ja"
                mode="super-easy"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'ja' && activeMode === 'super-easy'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'super-hard' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="ja"
                mode="super-hard"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'ja' && activeMode === 'super-hard'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
          </div>
          <div className={activeLocale === 'en' ? 'tab-panel active' : 'tab-panel'}>
            <div className={activeMode === 'daily' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="en"
                mode="daily"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'en' && activeMode === 'daily'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'practice' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="en"
                mode="practice"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'en' && activeMode === 'practice'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'super-easy' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="en"
                mode="super-easy"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'en' && activeMode === 'super-easy'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
            <div className={activeMode === 'super-hard' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="en"
                mode="super-hard"
                activeUser={activeUser}
                authReady={authReady}
                isVisible={activeLocale === 'en' && activeMode === 'super-hard'}
                puzzleDate={puzzleDate}
                currentPuzzleDate={currentPuzzleDate}
                onOpenArchive={() => setActiveView('archive')}
                onReturnToToday={returnToTodayBoard}
              />
            </div>
          </div>
        </>
      ) : (
        <ArchiveScreen
          locale={activeLocale}
          activeUser={activeUser}
          authReady={authReady}
          puzzleDate={currentPuzzleDate}
          onBackToGame={() => setActiveView('game')}
          onOpenBoard={openArchiveBoard}
        />
      )}

      <SiteNote locale={activeLocale} />

      {authMode && (
        <AuthModal
          locale={activeLocale}
          mode={authMode}
          form={authForms[authMode]}
          onChange={(field, value) => handleAuthFieldChange(authMode, field, value)}
          onClose={closeAuthModal}
          onSubmit={handleAuthSubmit}
          onSwitchMode={switchAuthMode}
          notice={authNotice}
          loading={authLoading}
        />
      )}
    </div>
  );
}
