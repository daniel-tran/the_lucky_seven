const SQUAD_INFO_COORDINATE = new MapCoordinate(640, 40);
const MIN_MAP_CARD_VALUE = 1;
const MAX_MAP_CARD_VALUE = 8;
const MAPCARDS_BENCH_X = [
  [2],
  ["-"],
  [3, 7],
  [5, 8],
  [4],
  [1, 6],
];
const MAPCARDS_BENCH_Y = [
  [5, 6],
  [1, 2],
  [7, 8],
  [3, 4],
];
const GRID_START = new MapCoordinate(50, 100);
const GRID_SQUARE_WIDTH = 50;
const GRID_SQUARE_HEIGHT = GRID_SQUARE_WIDTH;
const GRID_SQUARE_WIDTH_INNER = GRID_SQUARE_WIDTH - 10;
const GRID_SQUARE_HEIGHT_INNER = GRID_SQUARE_HEIGHT - 10;
const PHASE_INFO_COORDINATE = new MapCoordinate(GRID_START.x, 320);
const PHASE_INFO_SPACING_X = 100;
const MAX_PHASES = 5;

// Indicates the first N number of rows and columns are inaccessible to both threats and squad members.
// These can also be used as indexes for the first rows and columns that can contain entities.
const CELL_RESERVATION = new MapCoordinate(1, 1);

// This is the global game state for elements that can change during gameplay
let game = {};

// This is a copy of the game state ussed when reverting back to the start of the phase
let snapshot = {};

// This is the global  state related to interactive UI elements
// It is kept separate from the game object because structuredClone() doesn't handle HTML elements nicely
let ui = {};

const MENU_MAPPING = {
  "OVERVIEW": 0,
  "GAME": 1,
};

const SESSION_STORAGE_KEY_SETTINGS = "the_lucky_seven_settings";

// Centralised reference for hexadecimal colour codes
const COLOUR_MAPPING = {
  FONT_PHASE_ENCOUNTER: "#2964AA",
  FONT_PHASE_MANEUVER: "#29AA55",
  FONT_PHASE_ATTACK: "#F5852F",
  FONT_PHASE_COUNTER_ATTACK: "#FA2B3C",
  FONT_FINAL_TURNS: "#FFF97E",
  FONT_YOU_WIN: "#6CE388",
  FONT_YOU_LOSE: "#F74B4B",
  BLACK: "#000000",
  WHITE: "#FFFFFF",
  HIGHLIGHT_SQUAD: "#7EFF8C",
  HIGHLIGHT_THREAT: "#FF1A1E",
  CELL_ACCESSIBLE: "#E9E5D5",
  CELL_INACCESSIBLE: "#B4B19F",
  CELL_ENCOUNTER: "#FFC14D80", // Mainly used when indicating valid cells for changing a threat's column
  CELL_MOVEMENT: "#9DFFCA80",
  CELL_ATTACK: "#FF0D0D80",
  CELL_COUNTERATTACK: "#FF245780",
  BACKDROP_GAME: "#DEDAC1",
  BACKDROP_OVERVIEW_SKY: "#416C59",
  BACKDROP_OVERVIEW_GROUND: "#0A1C1C",
  BACKDROP_GAME_PROMPT: "#000000AC",
};

// Definitions are found in preload() because they load resources asynchronously to populate the variables
let IMAGE_MAPPING = {};
let FONT_MAPPING = {};
let SOUND_MAPPING = {};

function setupNewGame() {
  // This is the full list of squad members
  // This is defined here instead of the global scope to fix an issue where constantly pressing reset preserves the squad member's down status
  const squadBench = [
    new SquadMember("The Leader", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 1),
    new SquadMember("The Athlete", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 2),
    new SquadMember("The Mouse", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 4),
    new SquadMember("The Natural", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 8),
    new SquadMember("The Pacifist", 0, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 16),
    new SquadMember("The Hammer", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 32),
    new SquadMember("The Anvil", 1, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 32),
    new SquadMember("The Joker", 0, COLOUR_MAPPING.HIGHLIGHT_SQUAD, 80), // 64 + 16, since they have 2 abilities
  ];
  game = {
    // This is the board represented as a 3D array because some cells can have multiple cards occupying it
    grid: [],
    // This is the phase indicator
    phase: 0,
    // This is the ordered list of playable squad members
    squad: [],
    // This is the coordinate of the currently selected squad member
    squadSelectedCoordinate: null,
    // Indicates whether the selected squad member can flip up
    squadSelectedCoordinateCanFlipUp: false,
    // The list of map cards on the X axis used mainly during the intial setup
    mapcardsX: [],
    // The list of map cards on the Y axis used mainly during the intial setup
    mapcardsY: [],
    // The list of all threats that will be played in the game
    threats: [],
    // The list of pending threats
    threatsPending: [],
    threatsPendingValidCoordinates: [],
    // The list of active threats
    threatsActive: [],
    // The list of defeated threats
    threatsInactive: [],
    // The list of selected threats
    threatsSelected: [],
    // The list of valid coordinates that a squad member can move to
    moveCoordinates: [],
    // The list of valid coordinates that a squad member can attack
    attackCoordinates: [],
    // All possible coordinates that all active threats can attack and cannot be dodged
    counterAttackCoordinates: [],
    // All possible coordinates that all active threats can attack and can be dodged
    counterAttackCoordinatesDodgeable: [],
    // The number of turns before the game ends once all the threats have been deployed
    finalTurnsRemaining: 2, // EXTRA: When all threats are played, player gets +1 extra final turns in addition to the standard amount for each lost squad member
    isInFinalTurns: false,
    // The current turn number
    turn: 1,
    // Indicates the game outcome. < 0 = Lose, 0 = In progress, > 0 = Win
    outcome: 0,
    // Indicates which page the player is looking at
    menuIndex: MENU_MAPPING.GAME,
    // The total score the player is able to achieve if they win the game
    finalScore: 5,
    // Not part of the original game, but the final score decreases if the final turns
    // take longer than expected to finish
    finalTurnsPar: 2,
    // The decrement used to punish players who require more than finalTurnsPar to finish the game
    finalTurnPenalty: -1,
    //
    settings: JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY_SETTINGS)),
  };

  setupUI();

  // Call this function to avoid having the turn label defined in two spearate locations
  setTurnLabelText();

  // Set up the grid with the correct dimensions
  for (let i = 0; i < MAX_MAP_CARD_VALUE - 1; i++) {
    game.grid[i] = [[], [], [], [], []];
  }
  
  // Randomise starting squad members
  game.squad = shuffleListNonDestructively(squadBench, game.settings.SQUAD_MEMBERS_SUBTRACTION);
  
  // Randomise horizontal map cards
  // This has to be done *before* threat positions are calculated, as the Depot has to spawn in a certain column
  // and the distribution of map cards can vary to accomodate for the Depot's spawn location
  game.mapcardsX = shuffleListNonDestructively(MAPCARDS_BENCH_X);
  if (game.settings.THREAT_COUNT_MAPPING[Threat.type["Depot"]] > 0) {
    console.debug("Determining if map cards need to be swapped for the Depot");
    let emptyMapCardIndex = findMapCardWithValue(game.mapcardsX, "-");
    let firstMapCardIndex = 0;
    let lastMapCardIndex = game.mapcardsX.length - 1;
    if (emptyMapCardIndex === firstMapCardIndex) {
      console.debug("Switching horizontal map cards (leftmost edge) for Depot");
      let tempMapCard = game.mapcardsX[firstMapCardIndex + 1];
      game.mapcardsX[firstMapCardIndex + 1] = game.mapcardsX[emptyMapCardIndex];
      game.mapcardsX[emptyMapCardIndex] = tempMapCard;
    } else if (emptyMapCardIndex === lastMapCardIndex) {
      console.debug("Switching horizontal map cards (rightmost edge) for Depot");
      let tempMapCard = game.mapcardsX[lastMapCardIndex - 1];
      game.mapcardsX[lastMapCardIndex - 1] = game.mapcardsX[emptyMapCardIndex];
      game.mapcardsX[emptyMapCardIndex] = tempMapCard;
    }
  }
  console.debug("Finished horizontal map cards");
  console.debug(JSON.stringify(game.mapcardsX));
  
  // Randomise vertical map cards
  game.mapcardsY = shuffleListNonDestructively(MAPCARDS_BENCH_Y);
  console.debug("Finished vertical map cards");
  console.debug(JSON.stringify(game.mapcardsY));
  
  // Randomise regular threats (since we don't know the absolute card spread, this generates
  // some extra cards that gets omitted when shuffling)
  const threatTypes = Object.keys(game.settings.THREAT_COUNT_MAPPING);
  let threatsDefault = [];
  for (let threatType = Number(threatTypes[0]); threatType < threatTypes.length; threatType++) {
    // First column is reserved for tanks, so this corresponds to the column index
    for (let threatCount = CELL_RESERVATION.x; threatCount <= game.settings.THREAT_COUNT_MAPPING[threatType]; threatCount++) {
      let threatCountAdjusted = threatCount % (MAX_MAP_CARD_VALUE - 1);
      if (threatType === Threat.type["Tank"]) {
        // Remember that Tanks are special because they always spawn in the first column
        threatCountAdjusted = 0;
      } else if (threatCountAdjusted <= 0) {
        // First column is reserved for tanks, so this corresponds to the first column index when looping back
        threatCountAdjusted = CELL_RESERVATION.x;
      }
      // Some threats are spawned with increased priority when the game starts
      if (threatType === Threat.type["Depot"]) {
        console.debug("Depot is currently active!");
        threatsDefault.push(new Threat(threatType, findMapCardWithValue(game.mapcardsX, "-"), -1));
        continue;
      }
      // Y coordinate is set to negative because it's calculated properly during the Encounter phase
      game.threats.push(new Threat(threatType, threatCountAdjusted, -1));
    }
  }
  game.threats = [...threatsDefault, ...shuffleListNonDestructively(game.threats, game.threats.length - game.settings.THREAT_COUNT_TOTAL)];
  console.debug(`Total threats: ${game.threats.length}`);
  
  // Randomise squad member positions
  let c = MIN_MAP_CARD_VALUE;
  // Not to be confused with CELL_RESERVATION
  let mapCardOffset = new MapCoordinate(1, 1);
  for (let s = 0; s < game.squad.length; s++) {
    // Apply offset to ensure first row and column remain unoccupied (reserved for map cards & Tanks)
    game.squad[s].x = findMapCardWithValue(game.mapcardsX, c) + mapCardOffset.x;
    game.squad[s].y = findMapCardWithValue(game.mapcardsY, c) + mapCardOffset.y;
    console.debug(`${game.squad[s].name} is at ${game.squad[s].x},${game.squad[s].y}`);
    game.grid[game.squad[s].x][game.squad[s].y].push(game.squad[s]);
    c++;
  }
  // This handles the last setup step where a mortar-like effect takes
  // action where the last squad member would have been placed
  let isCardIndexExceeded = c > MAX_MAP_CARD_VALUE;
  if (isCardIndexExceeded) {
    // If the last squad member is being played, the mortar will strike them
    c = MAX_MAP_CARD_VALUE;
  }
  // Apply offset to ensure first row and column remain unoccupied (reserved for map cards & Tanks)
  activateMortar(findMapCardWithValue(game.mapcardsX, c) + mapCardOffset.x,
                 findMapCardWithValue(game.mapcardsY, c) + mapCardOffset.y,
                 isCardIndexExceeded);
  
  startPhaseEncounter();
  snapshotGameState();
  console.debug(JSON.stringify(game.grid));
}

function setupUI() {
  // If this function is called as a result of a game reset, the old UI elements need to be
  // manually removed before the new ones are regenerated.
  for (let b = document.getElementsByClassName("ui-element").length - 1; b >= 0 ; b--) {
    document.getElementsByClassName("ui-element")[b].remove();
  }

  const pathPrefixCards = "images/cards";
  const pathSuffixUp = "_up";
  ui = {
    squadButtons: [
      generateButton(32, GRID_START.y + 388, 96, 48, "Flip Up", pressFlipUp, false),
      generateButton(160, GRID_START.y + 388, 96, 48, "Flip Down", pressFlipDown, false),
      generateButton(288, GRID_START.y + 388, 96, 48, "Cancel", pressCancel, false),
    ],
    gameButtons: [
      generateButton(32, GRID_START.y + 302, 96, 48, "Next", pressPhaseNext, true),
      generateButton(160, GRID_START.y + 302, 96, 48, "Undo", pressPhaseUndo, true),
      generateButton(288, GRID_START.y + 302, 96, 48, "Reset", pressGameReset, true),
      generateButton(32, GRID_START.y - 88, 48, 48, "<img class='ui-settings-icon' src='images/settings.png'>", showSettings, true),
    ],
    phaseLabels: [
      generateParagraphText(30, GRID_START.y + 238, "Encounter", "ui-phase-label", true),
      generateParagraphText(130, GRID_START.y + 238, "Maneuver", "ui-phase-label", true),
      generateParagraphText(230, GRID_START.y + 238, "Attack", "ui-phase-label", true),
      generateParagraphText(305, GRID_START.y + 228, "Counter<br>Attack", "ui-phase-label", true),
    ],
    turnLabel: generateParagraphText(150, GRID_START.y - 125, "", "ui-turn-label", true),
    // Specify all the card description slots upfront to avoid the cost of dynamically generating HTML elements on the go
    cardDescriptions: [
      new CardDescription(
        generateCardImage(495, 100, "", "Selected Card 1", false),
        generateParagraphText(480, 220, "", "ui-card-description", true)
      ),
      new CardDescription(
        generateCardImage(695, 100, "", "Selected Card 2", false),
        generateParagraphText(680, 220, "", "ui-card-description", true)
      ),
    ],
    overview: {
      title: generateParagraphText(150, -50, "THE LUCKY SEVEN", "ui-overview-title", false),
      buttons: [
        generateButton(224, GRID_START.y + 302, 96, 48, "Play", pressGameReset, false),
        generateButton(356, GRID_START.y + 302, 96, 48, "Rules", pressOverviewRules, false),
        generateButton(476, GRID_START.y + 302, 96, 48, "About", pressOverviewAbout, false),
        generateButton(596, GRID_START.y + 302, 96, 48, "Settings", showSettings, false),
      ],
    },
    lineThicknessCardDescriptionBorder: "5px",
    lineThicknessPhaseLabelUnderline: "3px",
    // Load all the required images upfront to avoid potential performance drops when loading on the go.
    // This will probably increase memory usage as well, which may need to be looked into if it causes issues later on.
    imageMap: {
      squad: {
        "The Leader": {
          up: {
            card: `${pathPrefixCards}/squad_leader${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_LEADER_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_LEADER_DOWN,
          },
        },
        "The Athlete": {
          up: {
            card: `${pathPrefixCards}/squad_athlete${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_ATHLETE_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_ATHLETE_DOWN,
          },
        },
        "The Mouse": {
          up: {
            card: `${pathPrefixCards}/squad_mouse${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_MOUSE_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_MOUSE_DOWN,
          },
        },
        "The Natural": {
          up: {
            card: `${pathPrefixCards}/squad_natural${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_NATURAL_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_NATURAL_DOWN,
          },
        },
        "The Pacifist": {
          up: {
            card: `${pathPrefixCards}/squad_pacifist${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_PACIFIST_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_PACIFIST_DOWN,
          },
        },
        "The Hammer": {
          up: {
            card: `${pathPrefixCards}/squad_hammer${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_HAMMER_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_HAMMER_DOWN,
          },
        },
        "The Anvil": {
          up: {
            card: `${pathPrefixCards}/squad_anvil${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_ANVIL_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_ANVIL_DOWN,
          },
        },
        "The Joker": {
          up: {
            card: `${pathPrefixCards}/squad_joker${pathSuffixUp}.png`,
            icon: IMAGE_MAPPING.ICON_SQUAD_JOKER_UP,
          },
          down: {
            icon: IMAGE_MAPPING.ICON_SQUAD_JOKER_DOWN,
          },
        },
      },
      // These map to the values of each threat type
      threats: {
        0: {
          card: `${pathPrefixCards}/tank.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_TANK,
        },
        1: {
          card: `${pathPrefixCards}/infantry1.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_INFANTRY_1,
        },
        2: {
          card: `${pathPrefixCards}/infantry2.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_INFANTRY_2,
        },
        3: {
          card: `${pathPrefixCards}/machinegun.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_MACHINE_GUN,
        },
        4: {
          card: `${pathPrefixCards}/flare.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_FLARE,
        },
        5: {
          card: `${pathPrefixCards}/mortar.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_MORTAR,
        },
        6: {
          card: `${pathPrefixCards}/depot.png`,
          icon: IMAGE_MAPPING.ICON_THREAT_DEPOT,
        },
      },
    },
  };

  // Don't use displayWidth and displayHeight, as they result in excessive empty space
  createCanvas(960, 580);
}

// Stores a snapshot of the game state at the time of calling this function
function snapshotGameState() {
  snapshot = structuredClone(game);
}

// Returns a MapCoordinate object with X, Y offsets applied relative to GRID_START
function getGridCoordinate(x, y) {
  return new MapCoordinate(GRID_START.x + (x * GRID_SQUARE_WIDTH), GRID_START.y + (y * GRID_SQUARE_HEIGHT));
}

// Draws a square with respect to the GRID_START global variable, given a set of X and Y indexes.
// Returns a MapCoordinate object of where the square was drawn.
function drawSquareFromGridStart(x, y, squareWidth) {
  // This assumes GRID_SQUARE_WIDTH == GRID_SQUARE_HEIGHT
  const squareCoordinate = getGridCoordinate(x, y);
  square(squareCoordinate.x, squareCoordinate.y, squareWidth);
  return squareCoordinate;
}

function updateUI() {
  const butttonIndexFlipUp = 0;
  const butttonIndexFlipDown = 1;
  const butttonIndexCancel = 2;
  if (game.squadSelectedCoordinate) {
    let friendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
    if (isPhaseManeuver()) {
      // ABILITY: The Mouse can flip down after moving
      if (!game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].hasBeenFlipped && (!game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].rotated || game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].canFlipDownAfterMoving() )) {

        if (game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].up) {
          // Draw the flip down button if applicable
          ui.squadButtons[butttonIndexFlipDown].show();
        } else if (game.squadSelectedCoordinateCanFlipUp) {
          // Draw the flip up button if applicable
          // To minimise the amount of recomputation, the preconditions for a flip-up are determined when the squad member is selected
          ui.squadButtons[butttonIndexFlipUp].show();
        }
      } else {
        ui.squadButtons[butttonIndexFlipUp].hide();
        ui.squadButtons[butttonIndexFlipDown].hide();
      }
      // Draw the cancel button
      ui.squadButtons[butttonIndexCancel].show();
    } else if (isPhaseAttack()) {
      ui.squadButtons[butttonIndexFlipUp].hide();
      ui.squadButtons[butttonIndexFlipDown].hide();
      ui.squadButtons[butttonIndexCancel].show();
    } else {
      ui.squadButtons[butttonIndexFlipUp].hide();
      ui.squadButtons[butttonIndexFlipDown].hide();
      ui.squadButtons[butttonIndexCancel].hide();
    }
  }
  
  // Draw phase labels
  let phaseFill = "";
  for (let i = 0; i < ui.phaseLabels.length; i++) {
    if (i === game.phase) {
      switch(game.phase) {
        case 0:
          phaseFill = COLOUR_MAPPING.FONT_PHASE_ENCOUNTER;
          break;
        case 1:
          phaseFill = COLOUR_MAPPING.FONT_PHASE_MANEUVER;
          break;
        case 2:
          phaseFill = COLOUR_MAPPING.FONT_PHASE_ATTACK;
          break;
        case 3:
        case 4:
          // Wrap up phase is technically part of Counter-Attack
          phaseFill = COLOUR_MAPPING.FONT_PHASE_COUNTER_ATTACK;
          break;
      }
      ui.phaseLabels[i].style("border-bottom", `${ui.lineThicknessPhaseLabelUnderline} solid ${phaseFill}`);
    } else {
      phaseFill = COLOUR_MAPPING.BLACK;
      ui.phaseLabels[i].style("border-bottom", "none");
    }
    ui.phaseLabels[i].style("color", phaseFill);
  }
  
  // Draw card descriptions for both squad members and threats, since cells can contain a mix of these
  let cardDescriptionText = [];
  let cardDescriptionIndex = 0;
  if (game.squadSelectedCoordinate) {
    let friendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
    let squadMemberInfo = [
      getHTMLTextDivWithClass(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].name, "ui-card-description-title"),
      getHTMLTextDivWithClass(`<strong>Strength</strong>: <span class="${game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].getStrengthCSSClass()}">${game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].getStrength()}</span>`, "ui-card-description-strength"),
      getHTMLTextDivWithClass(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].descriptionHTML, "ui-card-description-blurb"),
    ].join("<br>");

    updateCardDescription(squadMemberInfo, getCardImagePathForSquadMember(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, friendlyIndex), cardDescriptionIndex, game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].getImageBorderColour(), !game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].up);
    cardDescriptionIndex++;
  }
  for (let t = 0; t < game.threatsSelected.length; t++) {
    let threatInfoRaw = [getHTMLTextDivWithClass(game.threatsSelected[t].name, "ui-card-description-title"),
                         getHTMLTextDivWithClass(game.threatsSelected[t].descriptionHTML, "ui-card-description-blurb")];
    // Show the strength for attackable threats, but hide it for those which can't be attacked (includes Tanks)
    if (game.threatsSelected[t].strength > 0 && game.threatsSelected[t].type !== 0) {
      threatInfoRaw.splice(1, 0, getHTMLTextDivWithClass(`<strong>Strength</strong>: <span class="${game.threatsSelected[t].getStrengthCSSClass()}">${game.threatsSelected[t].getStrength()}</span>`, "ui-card-description-strength"));
    }
    let threatInfo = threatInfoRaw.join("<br>");

    updateCardDescription(threatInfo, ui.imageMap.threats[game.threatsSelected[t].type].card, cardDescriptionIndex, "", false);
    cardDescriptionIndex++;
  }
  for (let cd = cardDescriptionIndex; cd < ui.cardDescriptions.length; cd++) {
    // Need to hide descriptions depending on the selected elements,
    // otherwise old descriptions will persist
    ui.cardDescriptions[cd].description.hide();
    ui.cardDescriptions[cd].image.hide();
  }
}

function pressPhaseNext() {
  if (!isGameInProgress()) {
    return;
  }
  game.phase = (game.phase + 1) % MAX_PHASES;
  switch(game.phase) {
    case 0:
      playSound(SOUND_MAPPING.BUTTON_PHASE_NEXT);
      startPhaseEncounter();
      snapshotGameState();
      break;
    case 1:
      playSound(SOUND_MAPPING.BUTTON_PHASE_NEXT);
      startPhaseManeuver();
      snapshotGameState();
      break;
    case 2:
      playSound(SOUND_MAPPING.BUTTON_PHASE_NEXT);
      startPhaseAttack();
      snapshotGameState();
      break;
    case 3:
      playSound(SOUND_MAPPING.BUTTON_PHASE_NEXT);
      startPhaseCounterAttack();
      snapshotGameState();
      break;
    case 4:
      startPhaseWrapUp();
      game.turn++;
      snapshotGameState();
      setTurnLabelText();
      break;
  }
  // Hide the action buttons to avoid potential context leaking from the previous phase
  pressCancel();
}

function pressPhaseUndo() {
  console.debug("Resetting the phase back to the initial state");
  playSound(SOUND_MAPPING.BUTTON_UNDO);
  game = structuredClone(snapshot);
  // For simplicity, undo the phase with a clean selection state.
  // It helps that the same state cleanse happens each time the phase progresses.
  pressCancel();
  // Since this is p5.js and not Node.js, we are limited by whatever tooling is provided by the base library and vanilla JavaScript.
  // As such, making a deep copy with objects that have class functions is rather painful.
  // Instead, we rely on structuredClone() to get the class properties restored and then manually duck type the relevant game state
  // members by modifying the object prototypes.
  for (let s = 0; s < game.squad.length; s++) {
    Object.setPrototypeOf(game.squad[s], SquadMember.prototype);
    // Connect back the grid reference again
    let friendlyIndex = getFriendlyIndexAt(game.squad[s].x, game.squad[s].y, SquadMember.friendlyIndex);
    game.grid[game.squad[s].x][game.squad[s].y][friendlyIndex] = game.squad[s];
  }
  for (let t = 0; t < game.threats.length; t++) {
    Object.setPrototypeOf(game.threats[t], Threat.prototype);
  }
  for (let a = 0; a < game.threatsActive.length; a++) {
    Object.setPrototypeOf(game.threatsActive[a], Threat.prototype);
    // Connect back the grid reference again
    // Note that multiple threats can occupy the same cell, so the using getFriendlyIndexAt() can get the wrong index in those instances
    // But this also makes the assumption that multiple threats of the same type cannot overlap with each other
    let threatIndex = containsThreatType(game.threatsActive[a].x, game.threatsActive[a].y, game.threatsActive[a].type);
    game.grid[game.threatsActive[a].x][game.threatsActive[a].y][threatIndex] = game.threatsActive[a];
  }
  for (let i = 0; i < game.threatsInactive.length; i++) {
    Object.setPrototypeOf(game.threatsInactive[i], Threat.prototype);
  }
}

function pressGameReset() {
  console.debug("Game reset!");
  playSound(SOUND_MAPPING.BUTTON_NEW_GAME);
  setupNewGame();
}

function pressFlipUp() {
  console.debug("Flip up!");
  let friendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
  if (game.squadSelectedCoordinate && canFlipUp(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, friendlyIndex)) {
    playSound(SOUND_MAPPING.BUTTON_FLIP_UP);
    game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].registerFlip(true);
    pressCancel();
  }
}

function pressFlipDown() {
  console.debug("Flip down!");
  if (game.squadSelectedCoordinate) {
    let friendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
    if (game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].up) {
      playSound(SOUND_MAPPING.BUTTON_FLIP_DOWN);
      game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].registerFlip(false);
    } else {
      console.debug(`Cannot flip down because ${game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][friendlyIndex].name} is already down`);
      return;
    }
    pressCancel();
  }
}

function pressCancel() {
  game.squadSelectedCoordinate = null;
  game.moveCoordinates = [];
  game.attackCoordinates = [];
  game.threatsSelected = [];
  for (let i = 0; i < ui.squadButtons.length; i++) {
    ui.squadButtons[i].hide();
  }
}

function activateMortar(mortarX, mortarY, includeDirectHit) {
  console.debug(`Mortar is at ${mortarX},${mortarY}`);
  let affectedCoordinates = getAdjacentMapCoordinates(mortarX, mortarY, true, false);
  for (let i = 0; i < affectedCoordinates.length; i++) {
    console.debug(`Mortar struck at ${affectedCoordinates[i].x},${affectedCoordinates[i].y}`);
    for (let squadIndex = 0; squadIndex < game.squad.length; squadIndex++) {
      if (game.squad[squadIndex].x === affectedCoordinates[i].x &&
          game.squad[squadIndex].y === affectedCoordinates[i].y) {
            // Note that the grid has a reference to the squad list, so it gets updated automatically
            game.squad[squadIndex].up = false;
            console.debug(`${game.squad[squadIndex].name} is down!`);
            
            if (includeDirectHit && game.squad[squadIndex].x === mortarX && game.squad[squadIndex].y === mortarY) {
              console.debug(`${game.squad[squadIndex].name} took a direct hit from the mortar!`);
              game.squad[squadIndex].rotated = true;
              game.squad[squadIndex].canMove = false;
            }
            break;
          }
    }
  }
}

function resolveThreatOverlap(threatToBePlaced, column, row) {
  // Once you enter this function, assume that the threat cannot overlap and the original column is taken already
  
  let countSquadMembers = 0;
  let countThreats = 0;
  let countEmpty = 0;
  let countMax = game.grid.length - 1;
  let lastSquadMemberX = -1;
  for (let i = 0; i < game.grid.length; i++) {
    if (game.grid[i][row].length <= 0) {
      // Found an empty cell, but see if there are other options
      countEmpty++;
      continue;
    }
    // Need to determine various metrics for overlap calculations later on
    for (let cellIndex = 0; cellIndex < game.grid[i][row].length; cellIndex++) {
      if (game.grid[i][row][cellIndex].isFriendly > 0) {
        // Make a note of the last known squad member, since this could be a potential slot
        countSquadMembers++;
        lastSquadMemberX = game.grid[i][row][cellIndex].x;
      } else if (game.grid[i][row][cellIndex].isFriendly < 0) {
        countThreats++;
      }
    }
  }
  
  if (countThreats >= countMax) {
    // Discard threat since the entire row has all threats
    return -1;
  } else if (countSquadMembers > 0 && countEmpty <= 0) {
    // Discard squad member
    removeFriendliesAt(lastSquadMemberX, row);
    return lastSquadMemberX;
  }
  
  // From the rules:
  // If you go to place an INFANTRY or MACHINE GUN threat and there is already another card in that location,
  //       place the new threat in the closest empty location in the same row.
  // If there are two equally distant empty locations, select the one closer to the center of the map grid.
  //
  // The idea is to do 2 horizontal scans from the original column (left & right) and pick the one that
  // is within bounds AND is closer to the centre
  let indexLeftRelative = 1;
  let indexRightRelative = 1;
  let indexColumnMid = 3;
  let checkLeftSideFirst = column >= indexColumnMid;
  for (let i = 0; i < game.grid.length; i++) {
    // Keep the check indexes within bounds, although this does mean the edges can be checked multiple times for no good reason
    let indexLeft = Math.max(MIN_MAP_CARD_VALUE, Math.min(column - indexLeftRelative, MAX_MAP_CARD_VALUE));
    let indexRight = Math.max(MIN_MAP_CARD_VALUE, Math.min(column + indexRightRelative, MAX_MAP_CARD_VALUE));
    console.debug(`Checking ${indexLeft} and then ${indexRight}`);
    if (checkLeftSideFirst) {
      if (indexLeft >= 0 && game.grid[indexLeft][row].length <= 0) {
        // Found a spare slot somewhere on the left
        return indexLeft;
      } else if (indexRight < game.grid.length && game.grid[indexRight][row].length <= 0) {
        // Found a spare slot somewhere on the right
        return indexRight;
      }
    } else {
      if (indexRight < game.grid.length && game.grid[indexRight][row].length <= 0) {
        // Found a spare slot somewhere on the right
        return indexRight;
      } else if (indexLeft >= 0 && game.grid[indexLeft][row].length <= 0) {
        // Found a spare slot somewhere on the left
        return indexLeft;
      }
    }
    indexLeftRelative++;
    indexRightRelative++;
  }
  
  if (lastSquadMemberX >= 0 && lastSquadMemberX < game.grid.length) {
    console.debug(`Found a squad member at ${lastSquadMemberX},${row} who can be discarded`);
    removeFriendliesAt(lastSquadMemberX, row);
    return lastSquadMemberX;
  }
  
  console.debug(`No more space on the row at all - discarding the threat`);
  return -1;
}

function startPhaseEncounter() {
  // PHASE SUMMARY
  // - Spawn Depot at coordinate -,7/8, or whichever of the two middle rows is closer to the row labeled 7/8.
  // - When there are no threats, start the countdown at 2 turns (including the turn when it was realised there are no more threats)
  // - Determine win condition at the end of that final turn (i.e. lose if everyone is gone or any threats remain by the Wrap Up phase) 
  console.debug("Encounter phase has started.");
  for (let i = CELL_RESERVATION.y; i <= game.grid[0].length - 1 && game.threats.length > 0; i++) {
    let newThreat = game.threats.splice(0, 1)[0];
    // Note that threats are not guaranteed to be distributed equally among all rows, so this cannot be pre-calculated
    newThreat.y = i;
    if (newThreat.type === Threat.type["Depot"]) {
      newThreat.x = findMapCardWithValue(game.mapcardsX, "-") + CELL_RESERVATION.x;
      newThreat.y = findMapCardWithValue(game.mapcardsY, MAX_MAP_CARD_VALUE) + CELL_RESERVATION.y;

      // The Depot should not be touching either the horizontal or vertical edges of the map
      // At this point of the game, the "-" map card should already be swapped to the correct location
      let mapCardOffsetMax = new MapCoordinate(game.mapcardsX.length, game.mapcardsY.length);
      // If the Depot is somehow on the horizontal edges (most likely due to misplaced "-" map card), manually shift it into place
      if (newThreat.x <= CELL_RESERVATION.x) {
        newThreat.x++;
      } else if (newThreat.x >= mapCardOffsetMax.x) {
        newThreat.x--;
      }
      // Depot is shifted away from vertical edges
      if (newThreat.y <= CELL_RESERVATION.y) {
        newThreat.y++;
      } else if (newThreat.y >= mapCardOffsetMax.y) {
        newThreat.y--;
      }
    }
    game.threatsActive.push(newThreat);
    console.debug(`${newThreat.name} (${newThreat.getStrength()}) was placed at ${newThreat.x},${newThreat.y}`);
    if (game.grid[newThreat.x][newThreat.y].length > 0 && !newThreat.canOverlapWithSquad) {
      console.debug("PROBLEM! Overlap has to be handled");
      newThreat.x = resolveThreatOverlap(newThreat, newThreat.x, newThreat.y);
      console.debug(`${newThreat.name} (${newThreat.getStrength()}) was shifted to ${newThreat.x},${newThreat.y}`);
      if (newThreat.x < 0) {
        console.debug(`${newThreat.name} (${newThreat.getStrength()}) has been discarded since the row is full`);
        continue;
      }
    }
    game.grid[newThreat.x][newThreat.y].push(newThreat);
    // Zach replied in an email that "the Depot is never on the edge of the map, as otherwise it's too hard to defeat",
    // so lock its column to wherever its initial location is.
    if (game.settings.SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS && newThreat.type !== Threat.type["Depot"]) {
      game.threatsPending.push(newThreat);
    }
    
    // The Depot is not one of the initial threat cards, so there will be a row with multiple threats
    if (newThreat.type === Threat.type["Depot"]) {
      i--;
    }
  }
  
  if (game.settings.SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS) {
    // Compute all the valid squares that threats can use, rather than recomputing the same results constantly when drawing
    for (let tp = 0; tp < game.threatsPending.length; tp++) {
      for (let tpCol = CELL_RESERVATION.x; tpCol < game.grid.length; tpCol++) {
        // Get all the valid squares + the threat's current square, since it can be moved back
        if (canThreatMoveToNewColumn(game.threatsPending[tp], tpCol, game.threatsPending[tp].y) || (!game.threatsPending[tp].isFixedColumn() && tpCol === game.threatsPending[tp].x)) {
          game.threatsPendingValidCoordinates.push(new MapCoordinate(tpCol, game.threatsPending[tp].y));
        }
      }
    }
  }
  
  if (game.threats.length <= 0) {
    console.debug(`The chopper has arrived! ${game.finalTurnsRemaining} turns (current one included) until the game ends`);
  }
}

function startPhaseManeuver() {
  console.debug("Encounter phase has ended.");
  // Reset squad member selection in case something was pressed beforehand 
  game.squadSelectedCoordinate = null;
  // Reset the pending threats, in case the columns were changed around
  game.threatsPending = [];
  game.threatsPendingValidCoordinates = [];
  // Remove the required active threats
  for (let i = 0; i < game.threatsActive.length; i++) {
    if (game.threatsActive[i].type === Threat.type["Mortar"]) {
      // Activate any threats that take instant effect in this phase
      activateMortar(game.threatsActive[i].x, game.threatsActive[i].y, true);
      game.threatsInactive.push(game.threatsActive.splice(i, 1));
      i--;
    }
  }
  // Remove the same threats from the grid
  for (let x = 0; x < game.grid.length; x++) {
    for (let y = 0; y < game.grid[x].length; y++) {
      let mortarIndex = containsThreatType(x, y, Threat.type["Mortar"]);
      if (mortarIndex >= 0) {
        console.debug(`Removing mortar at ${x},${y},${mortarIndex}`);
        game.grid[x][y].splice(mortarIndex, 1);
        continue;
      }
      
      // While the threat X,Y coordinates are calculated, apply flare logic here as well
      let flareIndex = containsThreatType(x, y, Threat.type["Flare"]);
      if (flareIndex >= 0) {
        let friendlyIndex = getFriendlyIndexAt(x, y, SquadMember.friendlyIndex);
        if (friendlyIndex >= 0) {
          console.debug(`${game.grid[x][y][friendlyIndex].name} was hit by the flare at ${x},${y},${flareIndex}`);
          game.grid[x][y][friendlyIndex].canMove = false;
        }
      }
    }
  }
  console.debug(JSON.stringify(game.grid));
  
  // PHASE SUMMARY
  // - Be able to move squad members (rotates them afterward)
  // - Cannot move rotated squad member (ignore abilities for now)
  // - Cannot move into a threat nor can diagonally move between multiple threats
  // - Can move diagonally between multiple squad members
  // - Can swap 2 unrotated squad members
  // - Be able to flip down squad members (rotates them afterward)
  // - Be able to flip up IF adjacent to an up squad member (rotates them afterward)
  // - At the end of the phase, unrotate all sqsuad members
  
  console.debug("Maneuver phase has started.");
}

function startPhaseAttack() {
  console.debug("Maneuver phase has ended.");
  // Clear movements, since these would not be valid in this phase
  game.moveCoordinates = [];

  for (let i = 0; i < game.squad.length; i++) {
    game.squad[i].postManeuverReset();
  }
  // Remove the required active threats
  for (let i = 0; i < game.threatsActive.length; i++) {
    if (game.threatsActive[i].type === Threat.type["Flare"]) {
      game.threatsInactive.push(game.threatsActive.splice(i, 1));
      i--;
    }
  }
  // Remove the same threats from the grid
  for (let x = 0; x < game.grid.length; x++) {
    for (let y = 0; y < game.grid[x].length; y++) {
      let flareIndex = containsThreatType(x, y, Threat.type["Flare"]);
      if (flareIndex >= 0) {
        console.debug(`Removing flare at ${x},${y},${flareIndex}`);
        game.grid[x][y].splice(flareIndex, 1);
      }
    }
  }
  
  // PHASE SUMMARY
  // - Target attackable threat from adjacent & up squad member
  // - Discard threat when attackers' combined strength >= threat strength 
  
  console.debug("Attack phase has started.");
}

function startPhaseCounterAttack() {
  console.debug("Attack phase has ended.");
  // Clear attack coordinates, since these are not relevant in this phase
  game.attackCoordinates = [];

  // Remove defeated active threats
  let defeatedThreatCoordinates = [];
  let threatsDistractedFromAttacking = false;
  for (let i = 0; i < game.threatsActive.length; i++) {
    console.debug(game.threatsActive[i]);
    if (game.threatsActive[i].isDefeated()) {
      console.debug(`Defeated ${game.threatsActive[i].name}`);
      // Remove the same threats from the grid
      let threatIndex = getFriendlyIndexAt(game.threatsActive[i].x, game.threatsActive[i].y, Threat.friendlyIndex);
      if (game.threatsActive[i].type === Threat.type["Depot"]) {
        threatsDistractedFromAttacking = true;
      }
      game.grid[game.threatsActive[i].x][game.threatsActive[i].y].splice(threatIndex, 1);
      game.threatsInactive.push(game.threatsActive.splice(i, 1));
      i--;
    } else {
      // Prevent accumulation of squad member attacks
      game.threatsActive[i].postAttackReset();
      
      if ((game.settings.THREAT_CANNOT_ATTACK_AT_ZERO_STRENGTH && game.threatsActive[i].getStrength() <= 0) || !game.threatsActive[i].canAttack || threatsDistractedFromAttacking) {
        // ABILITY: Threats with 0 strength, non-attacking threats or distracted threats do no attacks
        continue;
      }
      switch(game.threatsActive[i].type) {
        case Threat.type["Infantry 1"]:
        case Threat.type["Infantry 2"]:
          game.counterAttackCoordinates.push(...getAdjacentMapCoordinates(game.threatsActive[i].x, game.threatsActive[i].y, false, false));
          break;
        case Threat.type["Machine Gun"]:
          game.counterAttackCoordinatesDodgeable.push(...getAdjacentMapCoordinates(game.threatsActive[i].x, game.threatsActive[i].y, false, false));
          break;
        case Threat.type["Tank"]:
          for (let t = CELL_RESERVATION.x; t <= game.grid.length - 1; t++) {
            game.counterAttackCoordinatesDodgeable.push(new MapCoordinate(t, game.threatsActive[i].y));
          }
          break;
      }
    }
  }
  for (let i = 0; i < game.squad.length; i++) {
    game.squad[i].postAttackReset();
  }
  // Clear these out in the event of a distraction, as they can be accumulated before the actual determination of the depot being destroyed is realised
  if (threatsDistractedFromAttacking) {
    console.debug("Threats are distracted from attacking this turn");
    game.counterAttackCoordinates = [];
    game.counterAttackCoordinatesDodgeable = [];
  }
  determineGameOutcome();
  console.debug("Counter-Attack phase has started.");
  
  // PHASE SUMMARY
  // - Highlight all squares that active threats will attack
  // - Apply threat distraction rules that cause threats to not attack this turn
}

function startPhaseWrapUp() {
  console.debug("Counter-Attack phase has ended.");
  console.debug("Wrap Up phase has started.");
  // PHASE SUMMARY
  // - At the end, discard squad members as required + apply "down" rules
  // - At the end, discard all Tanks
  
  for (let c = 0; c < game.counterAttackCoordinates.length; c++) {
    let discardedFriendlyIndex = getFriendlyIndexAt(game.counterAttackCoordinates[c].x, game.counterAttackCoordinates[c].y, SquadMember.friendlyIndex);
    if (discardedFriendlyIndex >= 0) {
      let squadIndex = getSquadMemberIndexWithName(game.grid[game.counterAttackCoordinates[c].x][game.counterAttackCoordinates[c].y][discardedFriendlyIndex].name);
      console.debug(`${game.grid[game.counterAttackCoordinates[c].x][game.counterAttackCoordinates[c].y][discardedFriendlyIndex].name} did not make it...`);
      // Discard the squad member
      game.squad.splice(squadIndex, 1);
      increaseFinalTurns();
      // Remove the same squad member from the grid
      game.grid[game.counterAttackCoordinates[c].x][game.counterAttackCoordinates[c].y].splice(discardedFriendlyIndex, 1);
    }
  }
  for (let c = 0; c < game.counterAttackCoordinatesDodgeable.length; c++) {
    let discardedFriendlyIndex = getFriendlyIndexAt(game.counterAttackCoordinatesDodgeable[c].x, game.counterAttackCoordinatesDodgeable[c].y, SquadMember.friendlyIndex);
    if (discardedFriendlyIndex >= 0 && game.grid[game.counterAttackCoordinatesDodgeable[c].x][game.counterAttackCoordinatesDodgeable[c].y][discardedFriendlyIndex].up) {
      let squadIndex = getSquadMemberIndexWithName(game.grid[game.counterAttackCoordinatesDodgeable[c].x][game.counterAttackCoordinatesDodgeable[c].y][discardedFriendlyIndex].name);
      console.debug(`${game.grid[game.counterAttackCoordinatesDodgeable[c].x][game.counterAttackCoordinatesDodgeable[c].y][discardedFriendlyIndex].name} ducked too late...`);
      // Discard the squad member
      game.squad.splice(squadIndex, 1);
      // EXTRA: Players gain extra final turns with fewer squad members
      increaseFinalTurns();
      // Remove the same squad member from the grid
      game.grid[game.counterAttackCoordinatesDodgeable[c].x][game.counterAttackCoordinatesDodgeable[c].y].splice(discardedFriendlyIndex, 1);
    }
  }
  
  // All the counter-attacks have resolved now 
  game.counterAttackCoordinates = [];
  game.counterAttackCoordinatesDodgeable = [];
  // Remove the required active threats
  for (let i = 0; i < game.threatsActive.length; i++) {
    if (game.threatsActive[i].type === Threat.type["Tank"]) {
      game.threatsInactive.push(game.threatsActive.splice(i, 1));
      i--;
    }
  }
  // Remove the same threats from the grid
  for (let x = 0; x < CELL_RESERVATION.x; x++) {
    for (let y = 0; y < game.grid[0].length; y++) {
      // Simplify the loop under the premise that Tanks only occupt the first column 
      let tankIndex = containsThreatType(x, y, Threat.type["Tank"]);
      if (tankIndex >= 0) {
        console.debug(`Removing tank at ${x},${y},${tankIndex}`);
        game.grid[x][y].splice(tankIndex, 1);
      }
    }
  }
     
  determineGameOutcome();
  console.debug("Wrap Up phase has ended.");
}

function determineGameOutcome() {
  if (game.squad.length <= 0) {
    // It's still a loss if the entire squad is eliminated along with all the threats
    console.debug(`The entire squad has been eliminated. Reload the page to play again`);
    game.outcome = -1;
  } else if (game.threats.length <= 0) {
    if (isPhaseWrapUp()) {
      game.finalTurnsRemaining--;
      game.finalTurnsPar--;
    }
    if (game.finalTurnsPar < 0) {
      game.finalScore += game.finalTurnPenalty;
    }
    if (game.threatsActive.length <= 0) {
      console.debug(`You made it out alive! Reload the page to play again`);
      game.outcome = 1;
    } else if (game.finalTurnsRemaining <= 0) {
      console.debug(`You failed to clear all the threats before the end. Reload the page to play again`);
      game.outcome = -2;
    }
  }
  
  if (game.outcome < 0) {
    playSound(SOUND_MAPPING.GAME_LOSE);
  } else if (game.outcome >= 1) {
    playSound(SOUND_MAPPING.GAME_WIN);
  } else if (isPhaseWrapUp()) {
    // Don't blindly play the regular 'end of turn' jingle all the time, since this function is called in other phases
    playSound(SOUND_MAPPING.BUTTON_PHASE_NEXT_WRAP_UP);
  }
}

function drawGame() {
  background(COLOUR_MAPPING.BACKDROP_GAME);
  strokeWeight(2);
  stroke(0);
  rectMode(CENTER);
  
  // Draw empty grid
  let squadWidth = GRID_SQUARE_WIDTH_INNER;
  for (let x = 0; x < game.grid.length; x++) {
    for (let y = 0; y < game.grid[x].length; y++) {
      if (x < CELL_RESERVATION.x || y < CELL_RESERVATION.y) {
        // Use a different colour to indicate inaccessible cells
        fill(COLOUR_MAPPING.CELL_INACCESSIBLE);
      } else {
        fill(COLOUR_MAPPING.CELL_ACCESSIBLE);
      }
      drawSquareFromGridStart(x, y, GRID_SQUARE_WIDTH);
    }
  }
  
  // Draw elements within the grid cells
  for (let x = 0; x < game.grid.length; x++) {
    for (let y = 0; y < game.grid[x].length; y++) {
      for (let z = 0; z < game.grid[x][y].length; z++) {
        const elementCoordinate = getGridCoordinate(x, y);
        if (game.grid[x][y][z].isFriendly > 0) {
          game.grid[x][y][z].drawSquadMember(elementCoordinate.x, elementCoordinate.y, getIconImageForSquadMember(x, y, z));
          continue;
        } else if (game.grid[x][y][z].isFriendly < 0) {
          // Show a different icon if the threat is marked for defeat
          let iconImage = ui.imageMap.threats[game.grid[x][y][z].type].icon;
          if (game.grid[x][y][z].isDefeated()) {
            iconImage = IMAGE_MAPPING.ICON_SKULL;
          }
          game.grid[x][y][z].drawThreat(elementCoordinate.x, elementCoordinate.y, squadWidth, iconImage);
          
          // ABILITY: The Joker can reduce the strength of adjacent threats
          // This has to be done in draw() because the prerequisites required for the bonus could be lost in any phase
          let adjacentJokers = filterAdjacentFriendliesAt(x, y, false, SquadMember.type["The Joker"], true);
          if (adjacentJokers.length > 0) {
            game.grid[x][y][z].setStrengthReduction();
          } else {
            game.grid[x][y][z].resetStrengthReduction();
          }
        }
      }
    }
  }
  
  // Calculate the friendly index of the selected square to access various class members & functions without having to recompute the value each time
  let selectedFriendlyIndex = -1;
  if (game.squadSelectedCoordinate) {
    selectedFriendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
    
    // Highlight the selected squad member on the grid
    // This is done earlier than the threat highlighting because some elements can overlay this (e.g. counter-attack highlighting)
    noFill();
    stroke(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][selectedFriendlyIndex].colour);
    const squadMemberSquareWidth = game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][selectedFriendlyIndex].squareWidth;
    drawSquareFromGridStart(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, squadMemberSquareWidth);
  }
  
  // Draw movement squares
  for (let m = 0; m < game.moveCoordinates.length; m++) {
    fill(COLOUR_MAPPING.CELL_MOVEMENT);
    stroke(0);
    const moveCoordinate = drawSquareFromGridStart(game.moveCoordinates[m].x, game.moveCoordinates[m].y, GRID_SQUARE_WIDTH);
    if (selectedFriendlyIndex >= 0) {
      game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][selectedFriendlyIndex].drawSquadMemberCircle(moveCoordinate.x, moveCoordinate.y);
    }
  }
  
  // Draw attack squares
  for (let a = 0; a < game.attackCoordinates.length; a++) {
    fill(COLOUR_MAPPING.CELL_ATTACK);
    stroke(0);
    const attackCoordinate = drawSquareFromGridStart(game.attackCoordinates[a].x, game.attackCoordinates[a].y, GRID_SQUARE_WIDTH);
    if (selectedFriendlyIndex >= 0) {
      game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][selectedFriendlyIndex].drawSquadMemberCross(attackCoordinate.x, attackCoordinate.y);
    }
  }
  
  // Draw squad member items with increased priority in layering
  for (let s = 0; s < game.squad.length; s++) {
    if (game.squad[s].isAttacking()) {
      const squadMemberCoordinate = getGridCoordinate(game.squad[s].x, game.squad[s].y);
      const squadMemberAttackCoordinate = getGridCoordinate(game.squad[s].attackCoordinate.x, game.squad[s].attackCoordinate.y);
      game.squad[s].drawAttackLine(squadMemberCoordinate.x, squadMemberCoordinate.y, squadMemberAttackCoordinate.x, squadMemberAttackCoordinate.y);
    }
    
    // While there's a reference to a specific squad member, apply Pacifist bonus logic here
    // This has to be done in draw() because the prerequisites required for the bonus could be lost in any phase
    if (game.squad[s].canGetPacifistBonus()) {
      let adjacentPacifists = getAdjacentFriendliesAt(game.squad[s].x, game.squad[s].y, false);
      let shouldApplyPacifistBonus = false;
      for (let i = 0; i < adjacentPacifists.length; i++) {
        if (adjacentPacifists[i].grantsPacifistBonus()) {
          shouldApplyPacifistBonus = true;
          break;
        }
      }
      if (shouldApplyPacifistBonus) {
        game.squad[s].applyPacifistBonus();
      } else {
        game.squad[s].removePacifistBonus();
      }
    }
  }
  
  if (isPhaseEncounter()) {
    // FEATURE: Draw squares that threats are allowed to occupy when changing the column
    fill(COLOUR_MAPPING.CELL_ENCOUNTER);
    stroke(0);
    for (let tpc = 0; tpc < game.threatsPendingValidCoordinates.length && game.settings.SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS; tpc++) {
      drawSquareFromGridStart(game.threatsPendingValidCoordinates[tpc].x, game.threatsPendingValidCoordinates[tpc].y, GRID_SQUARE_WIDTH);
    }
  } else if (isPhaseCounterAttack()) {
    // Draw squares that threats will be attacking
    fill(COLOUR_MAPPING.CELL_COUNTERATTACK);
    stroke(0);
    let counterAttacks = game.counterAttackCoordinates.concat(game.counterAttackCoordinatesDodgeable);
    let counterAttackLookup = [];
    for (let c = 0; c < counterAttacks.length; c++) {
      const counterAttackCoordinate = getGridCoordinate(counterAttacks[c].x, counterAttacks[c].y);
      const counterAttackKey = `${counterAttackCoordinate.x},${counterAttackCoordinate.y}`;
      // Avoid drawing the same icon and colour over the same square by checking it against a list of known counter-attack locations
      if (counterAttackLookup.indexOf(counterAttackKey) < 0) {
        counterAttackLookup.push(counterAttackKey);
        image(IMAGE_MAPPING.ICON_CROSSHAIR, counterAttackCoordinate.x, counterAttackCoordinate.y, GRID_SQUARE_WIDTH_INNER, GRID_SQUARE_HEIGHT_INNER);
        drawSquareFromGridStart(counterAttacks[c].x, counterAttacks[c].y, GRID_SQUARE_WIDTH);
      }
      
    }
  }
  
  // Highlight the selected threat on the grid - but also show the squad member's selection as well if occupying the same cell
  // This is done after the rendering of the counter-attack squares to ensure priority layering
  for (let ts = 0; ts < game.threatsSelected.length; ts++) {
    noFill();
    stroke(COLOUR_MAPPING.HIGHLIGHT_THREAT);
    drawSquareFromGridStart(game.threatsSelected[ts].x, game.threatsSelected[ts].y, GRID_SQUARE_WIDTH);
  }
  
  // Show updated UI elements which may need to reflect the current phase
  updateUI();
  drawOverlayMessage();
}

function drawOverlayMessage() {  
  const outcomeMessageCentre = new MapCoordinate(GRID_SQUARE_WIDTH * game.grid.length, GRID_SQUARE_WIDTH * game.grid[0].length);
  let overlayMessageTitle = "2 TURNS LEFT";
  let overlayMessageDescription = "\nThe helicopter is arriving!\nClear the remaining threats to win";
  let overlayTitleColour = COLOUR_MAPPING.FONT_FINAL_TURNS;
  
  switch (game.outcome) {
    case 1:
      overlayMessageTitle = "YOU WIN";
      overlayMessageDescription = "All threats have been defeated";
      overlayTitleColour = COLOUR_MAPPING.FONT_YOU_WIN;
      break;
    case 0:
      if (!isPhaseWrapUp()) {
        return;
      }
      // Negative offset is needed because threats cannot spawn in the topmost row
      if (game.threats.length <= (game.grid[0].length - CELL_RESERVATION.y)) {
        let turnPlural = "TURNS";
        if (game.finalTurnsRemaining === 1) {
          turnPlural = "TURN";
        }
        overlayMessageTitle = `${game.finalTurnsRemaining} ${turnPlural} LEFT`;
        overlayMessageDescription = "\nThe helicopter is arriving!\nClear the remaining threats to win";
        overlayTitleColour = COLOUR_MAPPING.FONT_FINAL_TURNS;
        game.isInFinalTurns = true;
      } else {
        overlayMessageTitle = `TURN ${game.turn}`;
        overlayMessageDescription = `${game.threats.length + game.threatsActive.length} threats remaining`;
        overlayTitleColour = COLOUR_MAPPING.FONT_FINAL_TURNS;
      }
      break;
    case -1:
      overlayMessageTitle = "YOU LOSE";
      overlayMessageDescription = "\nThe entire squad\nhas been eliminated";
      overlayTitleColour = COLOUR_MAPPING.FONT_YOU_LOSE;
      break;
    case -2:
      overlayMessageTitle = "YOU LOSE";
      overlayMessageDescription = "All threats were not eliminated";
      overlayTitleColour = COLOUR_MAPPING.FONT_YOU_LOSE;
      break;
    default:
      return;
  }
  
  noStroke();
  fill(COLOUR_MAPPING.BACKDROP_GAME_PROMPT);
  rectMode(CORNERS);
  rect(GRID_START.x, GRID_START.y, outcomeMessageCentre.x, (GRID_START.y * 0.5) + outcomeMessageCentre.y);
  fill(overlayTitleColour);
  textAlign(CENTER, CENTER);
  textSize(36);
  textFont(FONT_MAPPING.MONTSERRAT_EXTRABOLD);
  text(overlayMessageTitle, (GRID_START.x + outcomeMessageCentre.x) / 2, (GRID_START.y + outcomeMessageCentre.y) / 2);
  textSize(17);
  fill(COLOUR_MAPPING.WHITE);
  textFont(FONT_MAPPING.MONTSERRAT_MEDIUM);
  text(overlayMessageDescription, (GRID_START.x + outcomeMessageCentre.x) / 2, GRID_START.y + (outcomeMessageCentre.y / 2));
}

function setup() {
  setupUI();
  game.menuIndex = MENU_MAPPING.OVERVIEW;
}

function mouseClicked(event) {
  if (game.menuIndex !== MENU_MAPPING.GAME || isSettingsPromptActive()) {
    return;
  }
  console.debug(event);
  // This needs to account for scrollbars when zoomed in or on smaller displays
  let clickX = Math.floor((event.x + window.scrollX - (GRID_START.x * 0.5)) / GRID_SQUARE_WIDTH);
  let clickY = Math.floor((event.y + window.scrollY - (GRID_START.y * 0.75)) / GRID_SQUARE_HEIGHT);
  console.debug(clickX);
  console.debug(clickY);
  
  if (isPhaseEncounter()) {
    if (game.settings.SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS) {
      // FEATURE: Threats can be assigned to a selectable column
      for (let t = 0; t < game.threatsPending.length; t++) {
        if (game.threatsPending[t].y === clickY) {
          console.debug(`Moving threat to ${game.threatsPending[t].x}, ${game.threatsPending[t].y}`);
          let unfriendlyIndex = containsThreatType(game.threatsPending[t].x, game.threatsPending[t].y, game.threatsPending[t].type);
          // First column is reserved for tanks
          if (clickX >= CELL_RESERVATION.x && canThreatMoveToNewColumn(game.threatsPending[t], clickX, clickY)) {
            game.grid[game.threatsPending[t].x][game.threatsPending[t].y].splice(unfriendlyIndex, 1);
            game.threatsPending[t].x = clickX;
            game.grid[game.threatsPending[t].x][game.threatsPending[t].y].push(game.threatsPending[t]);
            break;
          }
        }
      }
    }
  } else if (isPhaseManeuver()) {
    // If this is checked later, swapping squad member positions isn't as easy
    for (let m = 0; m < game.moveCoordinates.length; m++) {
      if (clickX === game.moveCoordinates[m].x && clickY === game.moveCoordinates[m].y) {
        let oldFriendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
        let neighbourFriendlyIndex = getFriendlyIndexAt(clickX, clickY, SquadMember.friendlyIndex);
        if (neighbourFriendlyIndex >= 0) {
          // Switching squad members (this would only be possible when both are movable)
          console.debug(`Switched squad members at ${game.squadSelectedCoordinate.x},${game.squadSelectedCoordinate.y} <--> ${clickX},${clickY}`);
          game.grid[clickX][clickY].push(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex]);
          game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y].push(game.grid[clickX][clickY][neighbourFriendlyIndex]);
          // Register movements
          game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex].registerMove();
          game.grid[clickX][clickY][neighbourFriendlyIndex].registerMove();
          // Update squad list as well
          game.squad[getSquadMemberIndexWithName(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex].name)].setCoordinates(clickX, clickY);
          game.squad[getSquadMemberIndexWithName(game.grid[clickX][clickY][neighbourFriendlyIndex].name)].setCoordinates(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y)
          // Remove the squad members from their old positions
          game.grid[clickX][clickY].splice(neighbourFriendlyIndex, 1);
          game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y].splice(oldFriendlyIndex, 1);
        } else {
          // Moving a squad member
          console.debug(`Moving squad member at ${game.squadSelectedCoordinate.x},${game.squadSelectedCoordinate.y} --> ${clickX},${clickY}`);
          game.grid[clickX][clickY].push(game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex]);
          // Register movements
          game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex].registerMove();
          // Update squad list as well
          let name = game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][oldFriendlyIndex].name;
          game.squad[getSquadMemberIndexWithName(name)].setCoordinates(clickX, clickY);
          // Remove the squad member from their old position
          game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y].splice(oldFriendlyIndex, 1);
        }
        
        playSound(SOUND_MAPPING.SQUAD_MOVEMENT);
        pressCancel();
        // Force the movement squares to disappear once a movement is made
        return false;
      }
    }
  } else if (isPhaseAttack()) {
    for (let a = 0; a < game.attackCoordinates.length; a++) {
      if (clickX === game.attackCoordinates[a].x && clickY === game.attackCoordinates[a].y) {
        let attackerFriendlyIndex = getFriendlyIndexAt(game.squadSelectedCoordinate.x, game.squadSelectedCoordinate.y, SquadMember.friendlyIndex);
        
        game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][attackerFriendlyIndex].attackCoordinate = new MapCoordinate(clickX, clickY);
        
        let threatIndex = getFriendlyIndexAt(clickX, clickY, Threat.friendlyIndex);
        game.grid[clickX][clickY][threatIndex].strengthOpposition += game.grid[game.squadSelectedCoordinate.x][game.squadSelectedCoordinate.y][attackerFriendlyIndex].strength;
        
        pressCancel();
        // Force the attack squares to disappear once an attack is made
        return false;
      }
    }
  }
  
  // User pressed some other area on the grid
  if (clickX >= 0 && clickX < game.grid.length &&
      clickY >= 0 && clickY < game.grid[0].length) {
        console.debug(game.grid[clickX][clickY]);
        // Determine if a squad member was pressed on
        let friendlyIndex = getFriendlyIndexAt(clickX, clickY, SquadMember.friendlyIndex);
        let threatIndex = getFriendlyIndexAt(clickX, clickY, Threat.friendlyIndex);
        if (friendlyIndex >= 0) {
          if (isPhaseManeuver()) {
            // Prevent shown buttons from persisting from the previous selection
            pressCancel();
            // Generate the possible movement squares
            // 
            // ABILITY: The Athlete can move once after already moving
            if (game.grid[clickX][clickY][friendlyIndex].up && (game.grid[clickX][clickY][friendlyIndex].isMovable() || game.grid[clickX][clickY][friendlyIndex].canMoveAfterMoving())) {
              game.moveCoordinates = getMovementCoordinates(clickX, clickY);
            } else {
              // The squad member cannot move, but might be able to do other actions when selected
              game.moveCoordinates = [];
            }
          } else if (isPhaseAttack()) {
            // ABILITY: The Mouse can attack when down
            if ((game.grid[clickX][clickY][friendlyIndex].up || game.grid[clickX][clickY][friendlyIndex].canAttackWhenDown()) && game.grid[clickX][clickY][friendlyIndex].canAttack && !game.grid[clickX][clickY][friendlyIndex].isAttacking()) {
              // ABILITY: The Natural is allowed to attack diagonals
              game.attackCoordinates = getAttackCoordinates(clickX, clickY, game.grid[clickX][clickY][friendlyIndex].canAttackDiagonally());
            } else {
              // We only care about clearing the valid attack poitions here
              game.attackCoordinates = [];
            }
          }
          game.squadSelectedCoordinate = new MapCoordinate(clickX, clickY);
          playSoundSquadSelect(game.grid[clickX][clickY][friendlyIndex]);
          // Flipping up is only allowed in the Maneuver phase, so no point in doing redundant computations for other phases
          if (isPhaseManeuver()) {
            game.squadSelectedCoordinateCanFlipUp = canFlipUp(clickX, clickY, friendlyIndex);
          }
        } else {
          // User pressed on some area without a squad member in it
          pressCancel();
        }
        
        // Get info about threats at the given location
        if (threatIndex >= 0) {
          game.threatsSelected = getAllThreatsAt(clickX, clickY);
          for (let i = 0; i < game.threatsSelected.length; i++) {
            playSoundThreatSelect(game.threatsSelected[i].type);
          }
        } else {
          game.threatsSelected = [];
        }
      }
  return false;
}

function preload() {
  IMAGE_MAPPING = {
    "OVERVIEW": loadImage("images/game_banner.png"),
    "SETTINGS": loadImage("images/settings.png"),
    "ICON_SKULL": loadImage("images/icons/skull.png"),
    "ICON_CROSSHAIR": loadImage("images/icons/crosshair.png"),
    "ICON_THREAT_TANK": loadImage("images/icons/tank.png"),
    "ICON_THREAT_INFANTRY_1": loadImage("images/icons/infantry1.png"),
    "ICON_THREAT_INFANTRY_2": loadImage("images/icons/infantry2.png"),
    "ICON_THREAT_MACHINE_GUN": loadImage("images/icons/machinegun.png"),
    "ICON_THREAT_FLARE": loadImage("images/icons/flare.png"),
    "ICON_THREAT_MORTAR": loadImage("images/icons/mortar.png"),
    "ICON_THREAT_DEPOT": loadImage("images/icons/depot.png"),
    "ICON_SQUAD_LEADER_UP": loadImage("images/icons/squad_leader_up.png"),
    "ICON_SQUAD_LEADER_DOWN": loadImage("images/icons/squad_leader_down.png"),
    "ICON_SQUAD_ATHLETE_UP": loadImage("images/icons/squad_athlete_up.png"),
    "ICON_SQUAD_ATHLETE_DOWN": loadImage("images/icons/squad_athlete_down.png"),
    "ICON_SQUAD_MOUSE_UP": loadImage("images/icons/squad_mouse_up.png"),
    "ICON_SQUAD_MOUSE_DOWN": loadImage("images/icons/squad_mouse_down.png"),
    "ICON_SQUAD_NATURAL_UP": loadImage("images/icons/squad_natural_up.png"),
    "ICON_SQUAD_NATURAL_DOWN": loadImage("images/icons/squad_natural_down.png"),
    "ICON_SQUAD_PACIFIST_UP": loadImage("images/icons/squad_pacifist_up.png"),
    "ICON_SQUAD_PACIFIST_DOWN": loadImage("images/icons/squad_pacifist_down.png"),
    "ICON_SQUAD_HAMMER_UP": loadImage("images/icons/squad_hammer_up.png"),
    "ICON_SQUAD_HAMMER_DOWN": loadImage("images/icons/squad_hammer_down.png"),
    "ICON_SQUAD_ANVIL_UP": loadImage("images/icons/squad_anvil_up.png"),
    "ICON_SQUAD_ANVIL_DOWN": loadImage("images/icons/squad_anvil_down.png"),
    "ICON_SQUAD_JOKER_UP": loadImage("images/icons/squad_joker_up.png"),
    "ICON_SQUAD_JOKER_DOWN": loadImage("images/icons/squad_joker_down.png"),
  };
  FONT_MAPPING = {
    "MONTSERRAT_EXTRABOLD": loadFont("fonts/Montserrat-ExtraBold.ttf"),
    "MONTSERRAT_MEDIUM": loadFont("fonts/Montserrat-Medium.ttf"),
  };
  SOUND_MAPPING = {
    "BUTTON_NEW_GAME": loadSound("sounds/misc/game_new.wav"),
    "BUTTON_PHASE_NEXT": loadSound("sounds/misc/phase_next.wav"),
    "BUTTON_PHASE_NEXT_WRAP_UP": loadSound("sounds/misc/phase_next_wrap_up.wav"),
    "BUTTON_UNDO": loadSound("sounds/misc/game_undo.wav"),
    "BUTTON_FLIP_UP": loadSound("sounds/misc/flip_up.wav"),
    "BUTTON_FLIP_DOWN": loadSound("sounds/misc/flip_down.wav"),
    "BUTTON_SETTINGS": loadSound("sounds/misc/settings.wav"),
    "GAME_LOSE": loadSound("sounds/misc/game_lose.wav"),
    "GAME_WIN": loadSound("sounds/misc/game_win.wav"),
    "SQUAD_MOVEMENT": loadSound("sounds/misc/squad_movement.wav"),
    "SELECT_THREAT": {
      // These map to the values of each threat type
      // Threats make a noise regardless of the phase, as their presence is relevant in all phases
      0: [loadSound("sounds/threats/tank.wav")],
      1: [loadSound("sounds/threats/infantry_1.wav")],
      2: [loadSound("sounds/threats/infantry_2.wav")],
      3: [loadSound("sounds/threats/machine_gun.wav")],
      4: [loadSound("sounds/threats/flare.wav")],
      5: [loadSound("sounds/threats/mortar.wav")],
      6: [loadSound("sounds/threats/depot.wav")],
    },
    "SELECT_SQUAD": {
      // Each squad member says certain phrases depending on the phase
      // The general principle is that squad mmebers should only say something if the player can utilise them in that phase
      "The Leader": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_leader_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_leader_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_leader_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_leader_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_leader_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_leader_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Athlete": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_athlete_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_athlete_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_athlete_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_athlete_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_athlete_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_athlete_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Mouse": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_mouse_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_mouse_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_mouse_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_mouse_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_mouse_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_mouse_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Natural": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_natural_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_natural_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_natural_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_natural_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_natural_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_natural_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Pacifist": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_pacifist_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_pacifist_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_pacifist_idle_3.wav"),
        ],
        2: [],
        3: [],
        4: [],
      },
      "The Hammer": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_hammer_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_hammer_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_hammer_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_hammer_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_hammer_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_hammer_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Anvil": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_anvil_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_anvil_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_anvil_idle_3.wav"),
        ],
        2: [
          loadSound("sounds/squad/attack/squad_anvil_attack_1.wav"),
          loadSound("sounds/squad/attack/squad_anvil_attack_2.wav"),
          loadSound("sounds/squad/attack/squad_anvil_attack_3.wav"),
        ],
        3: [],
        4: [],
      },
      "The Joker": {
        0: [],
        1: [
          loadSound("sounds/squad/idle/squad_joker_idle_1.wav"),
          loadSound("sounds/squad/idle/squad_joker_idle_2.wav"),
          loadSound("sounds/squad/idle/squad_joker_idle_3.wav"),
        ],
        2: [],
        3: [],
        4: [],
      },
    },
  };
  if (!sessionStorage.getItem(SESSION_STORAGE_KEY_SETTINGS)) {
    // Set the default settings and store them in the browser storage to be persisted
    configureSettingsDefault();
    // Only invoking applySettings() to set the initial session storage values
    applySettings(false);
  }
}

function draw() {
  switch (game.menuIndex) {
    case MENU_MAPPING.GAME:
      drawGame();
      break;
    case MENU_MAPPING.OVERVIEW:
      drawOverview();
      break;
  }
}
