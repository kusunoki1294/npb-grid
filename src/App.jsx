import { useEffect, useState } from 'react';
import GridBoard from './components/GridBoard';
import {
  createDailyGridFromEligibility,
  createRandomGridFromEligibility,
} from './data/categories';
import { findPlayerByName, isPlayerAlreadyUsed, validateAnswer } from './lib/validateAnswer';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import playersById from '../data/processed/players.json';
import eligibility from '../data/processed/eligibility.json';

const MAX_GUESSES = 9;

const copy = {
  en: {
    signIn: 'Sign in',
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
    authSwitchToSignup: 'Need an account? Sign in',
    authSwitchToLogin: 'Already have an account? Log in',
    authConfigMissing:
      'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect real accounts.',
    authPasswordMismatch: 'Passwords do not match.',
    authLoginSuccess: 'Logged in successfully.',
    authSignupSuccess: 'Account created. Check your email if confirmation is enabled.',
    authLogout: 'Log out',
    authLoggedInAs: 'Signed in as',
    authWorking: 'Working...',
    dailySyncLoading: 'Loading your saved daily puzzle progress...',
    dailySyncLoaded: 'Loaded your saved daily progress.',
    dailySyncSaved: 'Saved your daily progress.',
    dailySyncError: 'Could not sync your daily progress right now.',
    dailyGuestNotice: 'Log in to save your daily puzzle progress.',
    streak: 'Streak',
    bestStreak: 'Best',
    streakDays: (count) => `${count} day${count === 1 ? '' : 's'}`,
    eyebrow: 'Daily-style prototype',
    title: 'NPB Trivia Grid',
    dailyTab: 'Daily',
    practiceTab: 'Practice',
    score: 'Score',
    noGuesses: 'No guesses remaining.',
    guessesRemaining: (count) => `${count} guesses remaining.`,
    newGrid: 'New Grid',
    reset: 'Reset',
    defaultMessage: 'Pick a square and enter an NPB player.',
    openMessage: 'Type or tap a player name, then submit your guess.',
    missingPlayer: 'That player is not in the processed dataset yet.',
    duplicatePlayer: (name) => `${name} is already used in another square.`,
    correct: (name) => `${name} matches both categories.`,
    incorrect: (name) =>
      `${name} does not match both categories. Try another player for that square.`,
    gameOver: (score) => `Game over. Final score: ${score} / 9.`,
    resetMessage: 'Board reset. Pick a square and start again.',
    newGridMessage: 'Loaded a new random grid.',
    howItWorks: 'How it works',
    howText:
      'Fill each square with a Nippon Professional Baseball player who matches both the row and column categories. Choose a square, enter a player from the local dataset, and the game checks whether that player satisfies both categories. Each new board is generated from one shared category pool of teams, awards, positions, and milestones. Click any row or column category box to view its criteria and team or franchise notes before making a guess. You get 9 total guesses for the board.',
    close: 'Close',
    enterPlayer: 'Enter Player',
    submitGuess: 'Submit Guess',
    cancel: 'Cancel',
    placeholder: 'Example: Munetaka Murakami',
    selectPlayer: 'Select player',
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
    leaderboardUnavailable: 'Leaderboard unavailable until Supabase is configured.',
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
    rarityOpen: 'Open',
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
    returnToToday: 'Today',
    hits: 'Hits',
    misses: 'Misses',
    final: 'Final',
    solvedSquares: 'Solved squares',
    noSolved: 'No correct players this round.',
    dailyBoardLabel: (date) => `Daily board: ${date}`,
    dailyBoardNotice: 'You can show or hide square rarity from the toolbar.',
    dailyResetMessage: 'Daily board reset. Today\'s puzzle is loaded again.',
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
    authSwitchToSignup: 'アカウントを作成する',
    authSwitchToLogin: 'すでにアカウントをお持ちですか',
    authConfigMissing:
      'Supabase がまだ設定されていません。実際のアカウント連携には VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を追加してください。',
    authPasswordMismatch: 'パスワードが一致していません。',
    authLoginSuccess: 'ログインしました。',
    authSignupSuccess: 'アカウントを作成しました。確認メールが有効な場合はメールを確認してください。',
    authLogout: 'ログアウト',
    authLoggedInAs: 'ログイン中',
    authWorking: '処理中...',
    dailySyncLoading: '保存済みのデイリー進捗を読み込んでいます...',
    dailySyncLoaded: '保存済みのデイリー進捗を読み込みました。',
    dailySyncSaved: 'デイリー進捗を保存しました。',
    dailySyncError: 'デイリー進捗を同期できませんでした。',
    dailyGuestNotice: 'デイリー進捗を保存するにはログインしてください。',
    streak: '連続記録',
    bestStreak: '最高',
    streakDays: (count) => `${count}日`,
    eyebrow: 'デイリープロトタイプ',
    title: 'プロ野球グリッド',
    dailyTab: 'デイリー',
    practiceTab: '練習',
    score: 'スコア',
    noGuesses: '残り回数はありません。',
    guessesRemaining: (count) => `残り ${count} 回`,
    newGrid: '新しいグリッド',
    reset: 'リセット',
    defaultMessage: 'マスを選んで選手名を入力してください。',
    openMessage: '選手名を入力するか候補を選んで送信してください。',
    missingPlayer: 'その選手は加工済みデータに入っていません。',
    duplicatePlayer: (name) => `${name} は別の正解マスで使われています。`,
    correct: (name) => `${name} は両方の条件を満たしています。`,
    incorrect: (name) =>
      `${name} は両方の条件を満たしていません。このマスで別の選手を試してください。`,
    gameOver: (score) => `終了。最終スコア: ${score} / 9`,
    resetMessage: '盤面をリセットしました。最初からやり直せます。',
    newGridMessage: '新しいランダムグリッドを読み込みました。',
    howItWorks: '遊び方',
    howText:
      '各マスに、行と列の条件を両方満たす日本プロ野球の選手を入れてください。マスを選んでローカルのサンプルデータにある選手を入力すると、その選手が行と列の両方の条件を満たすか判定します。各ボードは、球団、受賞、ポジション、記録の共通カテゴリープールから生成されます。予想する前に、行または列のカテゴリーボックスをクリックすると条件や球団メモを確認できます。使える予想は合計 9 回です。',
    close: '閉じる',
    enterPlayer: '選手を入力',
    submitGuess: '選択',
    cancel: 'キャンセル',
    placeholder: '例: 村上 宗隆',
    selectPlayer: '選手を選択',
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
    leaderboardUnavailable: 'Supabase が設定されると順位を表示できます。',
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
    rarityOpen: '広め',
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
    archiveUpdated: '保存されたデイリーボードをもとにしたローカルアーカイブです。',
    archiveEmptyStat: 'まだデータがありません',
    returnToToday: '今日へ戻る',
    hits: '正解',
    misses: '不正解',
    final: '結果',
    solvedSquares: '正解したマス',
    noSolved: '今回は正解した選手がいませんでした。',
    dailyBoardLabel: (date) => `デイリーボード: ${date}`,
    dailyBoardNotice: 'ツールバーから各マスのレア度表示を切り替えできます。',
    dailyResetMessage: 'デイリーボードをリセットしました。今日の盤面を再読み込みしました。',
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
      '球団カテゴリと組み合わさる場合、ローカルのサンプルデータ上でその球団で少なくとも1試合出場している必要があります。',
  },
  award: {
    heading: '受賞ルール',
    subtitle: 'NPBでの受賞実績',
    note:
      '球団カテゴリと組み合わさる場合、その球団在籍時にその賞を受賞している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどこかで両方の条件を満たしていれば構いません。',
  },
  position: {
    heading: 'ポジションルール',
    subtitle: 'そのポジションとして登録',
    note:
      'ローカルのサンプルデータでそのポジションに登録されている必要があります。球団以外のカテゴリと同じシーズンである必要はありません。',
  },
  battingMilestone: {
    heading: '打撃記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  pitchingMilestone: {
    heading: '投手記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  battingSeasonMilestone: {
    heading: '打撃シーズン記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  battingCareerMilestone: {
    heading: '通算打撃記録',
    subtitle: '通算打撃成績の条件',
    note:
      '通算打撃記録はローカルのサンプルデータ内の通算タグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  pitchingSeasonMilestone: {
    heading: '投手シーズン記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  pitchingCareerMilestone: {
    heading: '通算投手記録',
    subtitle: '通算投手成績の条件',
    note:
      '通算投手記録はローカルのサンプルデータ内の通算タグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  specialCategory: {
    heading: '特別カテゴリ',
    subtitle: '特別な経歴や属性',
    note:
      '特別カテゴリはローカルのサンプルデータ内のタグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
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

function getEligibleIntersectionCount(rowCategoryId, columnCategoryId, eligibilityMap) {
  const rowEligible = eligibilityMap[rowCategoryId] ?? [];
  const columnEligible = new Set(eligibilityMap[columnCategoryId] ?? []);
  let count = 0;

  for (const playerId of rowEligible) {
    if (columnEligible.has(playerId)) {
      count += 1;
    }
  }

  return count;
}

function getRarityTone(count) {
  if (count <= 1) {
    return 'only';
  }

  if (count <= 3) {
    return 'rare';
  }

  if (count <= 6) {
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
    return player.nameJapanese || player.name;
  }

  return player.name;
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

function getSnapshotGrid(dateString) {
  return createDailyGridFromEligibility(eligibility, dateString);
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
    return JSON.parse(raw);
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
      const parsed = JSON.parse(raw);
      if (parsed?.puzzle_date) {
        results.push(parsed);
      }
    } catch {
      // Ignore malformed local history rows.
    }
  }

  return results.sort((left, right) => right.puzzle_date.localeCompare(left.puzzle_date));
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
  return mode === 'daily'
    ? getSnapshotGrid(dateString)
    : createRandomGridFromEligibility(eligibility);
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
}) {
  const text = copy[locale];
  const cellList = Object.values(cells);
  const solvedPlayers = cellList.filter((cell) => cell.result === 'correct');

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
          ) : leaderboardRows.length === 0 ? (
            <p className="summary-note">{text.leaderboardEmpty}</p>
          ) : (
            <div className="summary-leaderboard-table">
              <div className="summary-leaderboard-head">
                <span>{text.leaderboardRank}</span>
                <span>{text.leaderboardPlayer}</span>
                <span>{text.leaderboardScore}</span>
                <span>{text.leaderboardRarityScore}</span>
              </div>
              {leaderboardRows.map((entry, index) => (
                <div key={`${entry.display_name}-${index}`} className="summary-leaderboard-row">
                  <span>{index + 1}</span>
                  <div className="summary-leaderboard-player">
                    <strong>{entry.display_name}</strong>
                    {entry.rarity_average === null || entry.rarity_average === undefined ? null : (
                      <small>{text.leaderboardRarityValue(Number(entry.rarity_average))}</small>
                    )}
                  </div>
                  <span><ScoreValue score={entry.score} /></span>
                  <span />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ArchiveScreen({ locale, activeUser, puzzleDate, onBackToGame, onOpenBoard }) {
  const text = copy[locale];
  const storedResults = listStoredDailyResults(activeUser?.id);
  const resultMap = Object.fromEntries(
    storedResults.map((result) => [result.puzzle_date, result]),
  );
  const archiveDates = getArchiveDatesFromStart('2026-05-01', puzzleDate);
  const completedResults = storedResults.filter((result) => (result.guess_count ?? 0) >= MAX_GUESSES);
  const completedDates = completedResults.map((result) => result.puzzle_date);
  const streakStats = computeStreakStats(completedDates, puzzleDate);

  const playerCounts = {};
  const teamCounts = {};
  const categoryCounts = {};
  const averageRarityValues = [];

  for (const result of storedResults) {
    const grid = getSnapshotGrid(result.puzzle_date);
    const cells = result.cells ?? {};
    let rarityTotal = 0;
    let rarityHits = 0;

    for (const [key, cell] of Object.entries(cells)) {
      if (cell?.result !== 'correct' || !cell.playerId) {
        continue;
      }

      const [rowIndex, columnIndex] = key.split('-').map(Number);
      const rowCategory = grid.rows[rowIndex];
      const columnCategory = grid.columns[columnIndex];

      if (!rowCategory || !columnCategory) {
        continue;
      }

      const player = playersById[cell.playerId];
      const rarityCount = getEligibleIntersectionCount(rowCategory.id, columnCategory.id, eligibility);

      rarityTotal += rarityCount;
      rarityHits += 1;

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

    for (const category of [...grid.rows, ...grid.columns]) {
      const localizedLabel = localizeCategory(category, locale).label;
      categoryCounts[localizedLabel] = (categoryCounts[localizedLabel] ?? 0) + 1;
    }

    if (rarityHits > 0) {
      averageRarityValues.push(rarityTotal / rarityHits);
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
    const grid = getSnapshotGrid(dateString);
    const solvedCounts = Object.entries(result.cells ?? {})
      .filter(([, cell]) => cell?.result === 'correct')
      .map(([key]) => {
        const [rowIndex, columnIndex] = key.split('-').map(Number);
        const rowCategory = grid.rows[rowIndex];
        const columnCategory = grid.columns[columnIndex];
        return rowCategory && columnCategory
          ? getEligibleIntersectionCount(rowCategory.id, columnCategory.id, eligibility)
          : null;
      })
      .filter((value) => typeof value === 'number');

    const averageMatches = solvedCounts.length > 0
      ? solvedCounts.reduce((total, value) => total + value, 0) / solvedCounts.length
      : null;

    return {
      dateString,
      scoreLabel: guessCount >= MAX_GUESSES ? `${score} / 9` : text.archiveContinue,
      rarityLabel: averageMatches ? text.avgRarityValue(averageMatches) : '—',
    };
  });

  const averageScore = completedResults.length > 0
    ? completedResults.reduce((total, result) => total + (result.score ?? 0), 0) / completedResults.length
    : null;
  const averageRarity = averageRarityValues.length > 0
    ? averageRarityValues.reduce((total, value) => total + value, 0) / averageRarityValues.length
    : null;
  const topPlayers = createLeaderboard(playerCounts);
  const topTeams = createLeaderboard(teamCounts);
  const topCategories = createLeaderboard(categoryCounts, 5);

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

function GameScreen({
  locale,
  mode,
  activeUser,
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
  const hasLeaderboardSupport = Boolean(supabase);
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
  const query = draftName.trim().toLowerCase();
  const suggestions = (query
    ? allPlayers.filter((player) => {
        const english = (player.name ?? '').toLowerCase();
        const japanese = (player.nameJapanese ?? '').toLowerCase();
        return english.includes(query) || japanese.includes(query);
      })
    : allPlayers
  ).slice(0, 8);

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
    if (!isDailyMode || !showSummary || !isGameOver) {
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

      setLeaderboardRows(Array.isArray(data) ? data : []);
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
  }, [activeUser, isDailyMode, isVisible, puzzleDate]);

  useEffect(() => {
    if (!isDailyMode || !isVisible) {
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
  }, [activeUser, isDailyMode, isVisible, locale, puzzleDate, text.dailyGuestNotice, text.dailySyncError, text.dailySyncLoaded, text.dailySyncLoading, text.defaultMessage]);

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
    const isCorrect = validateAnswer(
      player.id,
      rowCategory.id,
      columnCategory.id,
      eligibility,
    );
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

    setActiveGrid(createRandomGridFromEligibility(eligibility));
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
          <p className="eyebrow">{text.eyebrow}</p>
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
        />
      ) : (
        <GridBoard
          grid={localizedGrid}
          cells={cells}
          onCellClick={handleCellClick}
          onCategoryClick={setSelectedCategory}
          emptyLabel={text.selectPlayer}
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
              {suggestions.map((player) => (
                <button
                  key={player.name}
                  className="suggestion-chip"
                  onClick={() => {
                    setDraftName(getPlayerDisplayName(player, locale));
                    setEditorNotice('');
                  }}
                >
                  {getPlayerDisplayName(player, locale)}
                </button>
              ))}
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
  const [activeLocale, setActiveLocale] = useState('ja');
  const [activeMode, setActiveMode] = useState('daily');
  const [activeView, setActiveView] = useState('game');
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(getCurrentPuzzleDate);
  const [selectedDailyDate, setSelectedDailyDate] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSession, setAuthSession] = useState(null);
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

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setAuthSession(data.session ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthSession(session ?? null);
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

  const activeUser = authSession?.user ?? null;
  const activeText = copy[activeLocale];

  return (
    <div className="page-shell">
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
          {activeUser ? (
            <>
              <div className="account-badge">
                <span>{activeText.authLoggedInAs}</span>
                <strong>{activeUser.user_metadata?.display_name || activeUser.email}</strong>
              </div>
              <button className="account-button secondary" onClick={handleLogout}>
                {activeText.authLogout}
              </button>
            </>
          ) : (
            <>
              <button className="account-button secondary" onClick={() => openAuthModal('login')}>
                {activeText.logIn}
              </button>
              <button className="account-button primary" onClick={() => openAuthModal('signup')}>
                {activeText.signIn}
              </button>
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
          </nav>

          <div className={activeLocale === 'ja' ? 'tab-panel active' : 'tab-panel'}>
            <div className={activeMode === 'daily' ? 'mode-panel active' : 'mode-panel'}>
              <GameScreen
                locale="ja"
                mode="daily"
                activeUser={activeUser}
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
                isVisible={activeLocale === 'ja' && activeMode === 'practice'}
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
                isVisible={activeLocale === 'en' && activeMode === 'practice'}
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
          puzzleDate={currentPuzzleDate}
          onBackToGame={() => setActiveView('game')}
          onOpenBoard={openArchiveBoard}
        />
      )}

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
