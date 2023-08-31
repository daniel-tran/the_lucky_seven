function isGameInProgress() {
  return game.outcome === 0;
}

function isPhaseEncounter() {
  return game.phase === 0;
}

function isPhaseManeuver() {
  return game.phase === 1;
}

function isPhaseAttack() {
  return game.phase === 2;
}

function isPhaseCounterAttack() {
  return game.phase === 3;
}

function isPhaseWrapUp() {
  return game.phase === 4;
}

function getCardImagePathForSquadMember(x, y, z) {
  return ui.imageMap.squad[game.grid[x][y][z].name]["up"].card;
}

function getIconImageForSquadMember(x, y, z) {
  let upStatus = game.grid[x][y][z].getUpStatusString();
  return ui.imageMap.squad[game.grid[x][y][z].name][upStatus].icon;
}

function playSound(sound) {
  // Don't play the sound if it hasn't loaded yet
  if (sound) {
    sound.playMode("restart");
    sound.play();
  }
}

function playSoundFromList(soundList) {
  if (soundList && soundList.length > 0) {
    const index = Math.floor(Math.random() * soundList.length);
    playSound(soundList[index]);
  }
}

function playSoundThreatSelect(threatType) {
  if (!isGameInProgress()) {
    return;
  }
  playSoundFromList(SOUND_MAPPING.SELECT_THREAT[threatType]);
}

function playSoundSquadSelect(squadMember) {
  if (!squadMember.up || !isGameInProgress()) {
    return;
  }
  playSoundFromList(SOUND_MAPPING.SELECT_SQUAD[squadMember.name][game.phase]);
}

// Given a list of map cards, this returns the index of the first map card
// that contains a specific value of interest. Returns -1 if no map cards were found.
function findMapCardWithValue(mapCardList, valueToFind) {
  for (let i = 0; i < mapCardList.length; i++) {
    if (mapCardList[i].includes(valueToFind)) {
      return i;
    }
  }
  return -1;
}

// This is using the Fisher-Yates shuffle algorithm
function shuffleListNonDestructively(list, finalOffset = 0) {
  for (let i = 0; i < list.length; i++) {
    let newIndex = Math.floor(Math.random() * (i + 1));
    [list[i], list[newIndex]] = [list[newIndex], list[i]];
  }
  if (finalOffset > 0) {
    return list.slice(0, -finalOffset);
  }
  return list;
}

function getRelativeMapCoordinate(startX, startY, finishX, finishY) {
  return new MapCoordinate(finishX - startX, finishY - startY);
}

// Destructively modifies the grid object to remove all friendlies at the given cell
function removeFriendliesAt(column, row) {
  for (let i = 0; i < game.grid[column][row].length; i++) {
    if (game.grid[column][row][i].isFriendly > 0) {
      game.grid[column][row].splice(i, 1);
      increaseFinalTurns();
      break;
    }
  }
}

// Returns whether the given cell contains an object with a particular friendly index
function containsFriendlyIndex(column, row, friendlyIndex) {
  for (let i = 0; i < game.grid[column][row].length; i++) {
    if (game.grid[column][row][i].isFriendly === friendlyIndex) {
      return true;
    }
  }
  return false;
}

// Returns the index of the first friendly entity in a given cell (-1 if there are none)
function getFriendlyIndexAt(column, row, friendlyIndex) {
  for (let i = 0; i < game.grid[column][row].length; i++) {
    if (game.grid[column][row][i].isFriendly === friendlyIndex) {
      return i;
    }
  }
  return -1;
}

// Returns the cell index at a given coordinate that has a specific threat type. Otherwise, returns -1
function containsThreatType(column, row, threatType) {
  for (let i = 0; i < game.grid[column][row].length; i++) {
    if (game.grid[column][row][i].isFriendly < 0 && game.grid[column][row][i].type === threatType) {
      return i;
    }
  }
  return -1;
}

// Returns the first squad index that matches the provided name
function getSquadMemberIndexWithName(name) {
  for (let i = 0; i < game.squad.length; i++) {
    if (game.squad[i].name === name) {
      return i;
    }
  }
  return -1;
}

// Returns all the threats at the given coordinates
function getAllThreatsAt(column, row) {
  let threatsAtCoordinate = [];
  for (let i = 0; i < game.grid[column][row].length; i++) {
    if (game.grid[column][row][i].isFriendly < 0) {
      threatsAtCoordinate.push(game.grid[column][row][i]);
    }
  }
  return threatsAtCoordinate;
}

function canThreatMoveToNewColumn(threat, x, y) {
  if (x > game.grid.length || x < 0) {
    // The Y coordinate is handled outside of this function and doesn't need to be checked
    console.debug(`${threat.name} cannot move to ${x},${y} because it is out of bounds`);
    return false;
  }
  // Disable column changing using a base condition
  let canMoveToNewCell = !threat.isFixedColumn();
  for (let ci = 0; ci < game.grid[x][y].length && canMoveToNewCell; ci++) {
    if ((game.grid[x][y][ci].isFriendly > 0 && !threat.canOverlapWithSquad) ||
        (game.grid[x][y][ci].isFriendly < 0 && !threat.canOverlapWithSquad && !game.grid[x][y][ci].canOverlapWithSquad)) {
      console.debug(`Cannot move ${threat.name} to new cell`);
      canMoveToNewCell = false;
      break;
    }
  }
  return canMoveToNewCell;
}

// Returns a list of adjacent SquadMember objects at the given coordinates
function getAdjacentFriendliesAt(column, row, includeDiagonals) {
  let adjacentSquares = getAdjacentMapCoordinates(column, row, false, includeDiagonals);
  let friendlyList = [];
  for (let i = 0; i < adjacentSquares.length; i++) {
    let friendlyIndex = getFriendlyIndexAt(adjacentSquares[i].x, adjacentSquares[i].y, SquadMember.friendlyIndex);
    if (friendlyIndex >= 0) {
      friendlyList.push(game.grid[adjacentSquares[i].x][adjacentSquares[i].y][friendlyIndex]);
    }
  }
  return friendlyList;
}

// Returns a list of adjacent SquadMember objects that meet certain filter criteria at the given coordinates
function filterAdjacentFriendliesAt(column, row, includeDiagonals, filterType, filterUp) {
  let adjacentFriendlies = getAdjacentFriendliesAt(column, row, includeDiagonals);
  let filteredFriendlies = [];
  for (let i = 0; i < adjacentFriendlies.length; i++) {
    if (adjacentFriendlies[i].type & filterType && adjacentFriendlies[i].up === filterUp) {
      filteredFriendlies.push(adjacentFriendlies[i]);
    }
  }
  return filteredFriendlies;
}

function increaseFinalTurns() {
  // EXTRA: Players gain extra final turns with fewer squad members
  if (!game.isInFinalTurns && game.settings.FINAL_TURNS_INCREASE_FROM_DEFEATED_SQUAD_MEMBERS) {
    game.finalTurnsRemaining++;
  }
}

// Returns the HTML text for a <div> tag with a provided CSS class and the inner text
function getHTMLTextDivWithClass(divText, divClass) {
  return `<div class="${divClass}">${divText}</div>`;
}

function setTurnLabelText() {
  ui.turnLabel.html(`Turn ${game.turn}`);
}

function isSettingsPromptActive() {
  return document.getElementById("ui-settings-prompt").style.display === "block";
}

function generateButton(buttonX, buttonY, buttonWide, buttonHigh, buttonText, buttonCallback, isActive, buttonExtraCssClass = "") {
  let uiButton = createButton(buttonText);
  uiButton.position(buttonX, buttonY);
  uiButton.size(buttonWide, buttonHigh);
  uiButton.mousePressed(buttonCallback);
  uiButton.addClass(`ui-button ui-element ${buttonExtraCssClass}`);
  if (isActive) {
    uiButton.show();
  } else {
    uiButton.hide();
  }
  return uiButton;
}

function generateParagraphText(paragraphX, paragraphY, paragraphText, paragraphClass, isActive) {
  let uiParagraphText = createP(paragraphText);
  uiParagraphText.position(paragraphX, paragraphY);
  uiParagraphText.addClass(`ui-paragraph ui-element ${paragraphClass}`);
  if (isActive) {
    uiParagraphText.show();
  } else {
    uiParagraphText.hide();
  }
  return uiParagraphText;
}

function generateCardImage(imageX, imageY, imagePath, imageAltText, isActive) {
  let uiCardImage = createImg(imagePath, imageAltText);
  uiCardImage.addClass("ui-card-image ui-element");
  uiCardImage.position(imageX, imageY);
  if (isActive) {
    uiCardImage.show();
  } else {
    uiCardImage.hide();
  }
  return uiCardImage;
}
