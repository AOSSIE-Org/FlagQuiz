/**
 * English messages: the source of truth for all translations. Every other
 * locale must have exactly these keys and the same {placeholders}
 * (checked by src/lib/i18n.test.ts).
 */
const en = {
  // General
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  play: 'Play',
  best: 'Best',
  listen: '{name}: listen',
  shareText: 'Learn the flags of the world with Flag Quiz!',
  madeBy: 'made by',

  // Games
  'game.flag': 'Guess the Flag',
  'game.country': 'Guess the Country',
  'game.location': 'Guess the Location',
  'game.capital': 'Guess the Capital',
  'game.capitalCountry': "Guess the Capital's Country",
  chooseGame: 'Choose a game',
  flagNumber: 'Flag {n}',
  worldMap: 'World map',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  wholeWorld: 'Whole world',

  // Scores
  daysInARow: 'Days in a row',
  goldStars: 'Rounds in a row without mistakes',
  silverStars: 'Silver stars: one more for each round without mistakes, one less for each mistake',
  correctInGame: 'Correct answers in this game',
  correctInAllGames: 'Correct answers in all games',
  scoreValue: '{label}: {value}',

  // Menu
  menu: 'Menu',
  playerMenu: '{name}: menu',
  nextPlayers: 'Next players',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  editPlayer: 'Edit player',
  difficulty: 'Difficulty: {level}',
  'difficulty.easy': 'easy',
  'difficulty.medium': 'medium',
  'difficulty.hard': 'hard',
  countries: 'Countries',
  statistics: 'Statistics',
  readAloud: 'Read names aloud',
  readAloudOn: 'Reading names aloud: on',
  readAloudOff: 'Reading names aloud: off',
  soundEffects: 'Sound effects',
  soundEffectsOn: 'Sound effects: on',
  soundEffectsOff: 'Sound effects: off',
  language: 'Language',
  share: 'Share',
  linkCopied: 'Link copied',
  saveMyData: 'Save my data',
  installApp: 'Install app',
  credits: 'Credits',
  donate: 'Support AOSSIE with a donation',
  changeGame: 'Change game',
  switchPlayer: 'Switch player',
  fullScreen: 'Full screen',
  exitFullScreen: 'Exit full screen',

  // Player picker
  whoIsPlaying: 'Who is playing?',
  players: 'Players',
  onePlayer: 'One player',
  severalPlayers: 'Several players',
  newPlayer: 'New player',
  loadPlayer: 'Load a player from a file',
  deletePlayers: 'Delete players',
  roundsPerPlayer: 'Rounds in a row per player',
  fewerRounds: 'Fewer rounds',
  moreRounds: 'More rounds',
  'import.tooLarge': 'File too large',
  'import.notJson': 'Not a JSON file',
  'import.notPlayerFile': 'Not a Flag Quiz player file',
  'import.unsupportedVersion': 'This file is from a newer version of Flag Quiz',
  'import.invalid': 'This file is damaged',
  'import.failed': 'Could not load this file',

  // Player editor
  name: 'Name',
  pattern: 'Pattern',
  colourToChange: 'Colour to change',
  colourNumber: 'Colour {n}',
  colours: 'Colours',
  otherColour: 'Other colour',
  'pattern.vbands': 'Vertical stripes',
  'pattern.hbands': 'Horizontal stripes',
  'pattern.nordic': 'Nordic cross',
  'pattern.diagonal': 'Diagonal stripe',
  'pattern.hoist': 'Triangle',
  'pattern.disc': 'Circle',
  'pattern.rhombus': 'Diamond',
  'pattern.cross': 'Cross',
  'pattern.starDisc': 'Star in a circle',
  'pattern.crescent': 'Crescent and star',
  'pattern.canton': 'Corner with a star',
  'pattern.stars': 'Three stars',

  // Deleting a player
  deletePlayer: 'Delete {name}?',
  grownUpsOnly: 'Grown-ups only: solve for {x} to delete this player and all their progress.',

  // Countries filter
  continents: 'Continents',
  mostPopulous: 'Most populous countries',
  countriesInGame: 'Countries in the game',

  // Statistics
  daysPlayed: 'Days played in the last 4 weeks',
  game: 'Game',
  bestSilverStars: 'Most silver stars',
  bestGoldStars: 'Most rounds in a row without mistakes',
  mastered: 'Mastered',
  masteredCount: 'Mastered: {n} of {total}',

  // Updates and backups
  updateAvailable: 'New version: tap to update',
  updateRequired: 'A newer version of Flag Quiz has been used on this device. Tap to update.',
  closeOtherCopies: 'Flag Quiz is open in another tab or window. Close it to continue.',
  saveAllPlayers: 'Save all players in one file',

  // Installing
  installTheApp: 'Install the app',
  iosShare: 'Share',
  addToHomeScreen: 'Add to Home Screen',
  browserMenu: 'Menu',
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export default en satisfies Messages;
