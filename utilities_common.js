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
  if (x > game.grid.length || x < 0 || !game.grid[x]) {
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

function canFlipUp(x, y, z) {
  if (game.grid[x][y][z].up) {
    console.debug(`Not able to flip up because ${game.grid[x][y][z].name} is already up`);
    return false;
  }
  if (game.grid[x][y][z].rotated) {
    console.debug(`Not able to flip up because ${game.grid[x][y][z].name} is rotated`);
    return false;
  }
  
  if (game.grid[x][y][z].canFlipUpWithoutSquadMember()) {
    console.debug("The Leader can flip up by themselves");
    return true;
  }
  
  let adjacentLeaders = filterAdjacentFriendliesAt(x, y, true, SquadMember.type["The Leader"], true);
  if (adjacentLeaders.length > 0) {
    console.debug("The Leader is nearby! Able to flip up from a diagonal position in addition to the normal flip up rules.");
    return true;
  }
  
  let adjacentSquares = getAdjacentMapCoordinates(x, y, false, false);
  for (let i = 0; i < adjacentSquares.length; i++) {
    console.debug(`Checking ${adjacentSquares[i].x},${adjacentSquares[i].y}`);
    let adjacentFriendlyIndex = getFriendlyIndexAt(adjacentSquares[i].x, adjacentSquares[i].y, SquadMember.friendlyIndex);
    if (adjacentFriendlyIndex >= 0 && game.grid[adjacentSquares[i].x][adjacentSquares[i].y][adjacentFriendlyIndex].up) {
      return true;
    }
  }
  console.debug("Not able to flip up because there is no adjacent squad member who is up");
  return false;
}

function getAdjacentMapCoordinates(startX, startY, includeSelf, includeDiagonals) {
  let coordinates = [
    new MapCoordinate(startX, startY - 1),
    new MapCoordinate(startX + 1, startY),
    new MapCoordinate(startX, startY + 1),
    new MapCoordinate(startX - 1, startY),
  ];
  if (includeSelf) {
    coordinates.push(new MapCoordinate(startX, startY));
  }
  if (includeDiagonals) {
    coordinates.push(new MapCoordinate(startX + 1, startY - 1),
                     new MapCoordinate(startX + 1, startY + 1),
                     new MapCoordinate(startX - 1, startY + 1),
                     new MapCoordinate(startX - 1, startY - 1));
  }
  for (let c = 0; c < coordinates.length; c++) {
    // Remember that the first column and row is reserved
    if (coordinates[c].x <= 0 || coordinates[c].x >= game.grid.length ||
        coordinates[c].y <= 0 || coordinates[c].y >= game.grid[0].length) {
          coordinates.splice(c, 1);
          c--;
        }
  }
  return coordinates;
}

function getMovementCoordinates(startX, startY) {
  let coordinates = getAdjacentMapCoordinates(startX, startY, false, true);
  let coordinatesValid = [];
  for (let c = 0; c < coordinates.length; c++) {
    if (containsFriendlyIndex(coordinates[c].x, coordinates[c].y, Threat.friendlyIndex)) {
      // Space is occupied by a threat
      console.debug("Space is occupied by a threat");
      continue;
    }
    let friendlyIndex = getFriendlyIndexAt(coordinates[c].x, coordinates[c].y, SquadMember.friendlyIndex);
    if (friendlyIndex >= 0 && (!game.grid[coordinates[c].x][coordinates[c].y][friendlyIndex].isMovable() || !game.grid[coordinates[c].x][coordinates[c].y][friendlyIndex].up)) {
      // Space is occupied by a immovable squad member (remember that squad members who are down cannot move at all)
      console.debug("Space is occupied by a immovable squad member");
      continue;
    }
    // Exclude diagonal spaces that are cut off by threats
    let relativeMapCoordinate = getRelativeMapCoordinate(startX, startY, coordinates[c].x, coordinates[c].y);
    if ((relativeMapCoordinate.x === -1 && relativeMapCoordinate.y === -1) ||
        (relativeMapCoordinate.x === 1 && relativeMapCoordinate.y === -1) ||
        (relativeMapCoordinate.x === -1 && relativeMapCoordinate.y === 1) ||
        (relativeMapCoordinate.x === 1 && relativeMapCoordinate.y === 1)) {
          console.debug(`Testing diagonal square on ${coordinates[c].x},${coordinates[c].y}`);
          console.debug(`using vector ${relativeMapCoordinate.x},${relativeMapCoordinate.y}`);
          console.debug(`which means ${startX + relativeMapCoordinate.x},${startY}`);
          console.debug(`and ${startX},${startY + relativeMapCoordinate.y}`);
          // Since the start cell and relative coordinate are valid positions in the grid,
          // it can be inferred that the adjacent coordinates shared by them are also valid
          // (unless a non-qualdrilateral grid is allowed, then this would have to be revisited)
          if (containsFriendlyIndex(startX + relativeMapCoordinate.x, startY, Threat.friendlyIndex) &&
              containsFriendlyIndex(startX, startY + relativeMapCoordinate.y, Threat.friendlyIndex)) {
                console.debug("Space is blocked off by adjacent threats");
                continue;
              }
        }
    
    coordinatesValid.push(coordinates[c]);
  }
  return coordinatesValid;
}

function getAttackCoordinates(startX, startY, includeDiagonals) {
  let coordinates = getAdjacentMapCoordinates(startX, startY, false, includeDiagonals);
  let coordinatesValid = [];
  for (let c = 0; c < coordinates.length; c++) {
    if (containsFriendlyIndex(coordinates[c].x, coordinates[c].y, Threat.friendlyIndex)) {
      console.debug(`${coordinates[c].x}, ${coordinates[c].y} can be attacked`);
      coordinatesValid.push(coordinates[c]);
    }
  }
  return coordinatesValid;
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

function updateCardDescription(description, imagePath, cardDescriptionIndex, frameColour, useGrayscale) {
  // Only update the HTML if there is an actual change (includes toggling of the same description after pressing an empty square)
  // The same logic could be independently applied to the card image too, but the image is usually tied to the description anyway
  if (ui.cardDescriptions[cardDescriptionIndex].description.html() !== description || ui.cardDescriptions[cardDescriptionIndex].description.style("display") === "none") {
    ui.cardDescriptions[cardDescriptionIndex].description.html(description);
    ui.cardDescriptions[cardDescriptionIndex].image.attribute("src", imagePath);
    if (frameColour.length > 0) {
      ui.cardDescriptions[cardDescriptionIndex].image.style("border", `${ui.lineThicknessCardDescriptionBorder} solid ${frameColour}`);
    } else {
      ui.cardDescriptions[cardDescriptionIndex].image.style("border", "none");
    }
    if (useGrayscale) {
      grayscale = 100;
    } else {
      grayscale = 0;
    }
    ui.cardDescriptions[cardDescriptionIndex].image.style("filter", `grayscale(${grayscale}%)`);
    
    // Show the new contents
    ui.cardDescriptions[cardDescriptionIndex].description.show();
    ui.cardDescriptions[cardDescriptionIndex].image.show();
  }
}

// Module exports should only be set when running unit tests, as this causes a console error when running the sketch
if (typeof exports !== "undefined") {
  module.exports = { findMapCardWithValue, shuffleListNonDestructively };
}
