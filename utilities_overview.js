function pressOverviewRules() {
  window.open("https://coincidence.games/the-lucky-seven/rules/", "_blank");
}

function pressOverviewAbout() {
  window.open("https://coincidence.games/the-lucky-seven/", "_blank");
}

function drawOverview(){
  // Hide buttons that are normally shown by default during gameplay
  for (let i = 0; i < ui.phaseLabels.length; i++) {
    ui.phaseLabels[i].hide();
  }
  for (let g = 0; g < ui.gameButtons.length; g++) {
    ui.gameButtons[g].hide();
  }
  
  for (let cd = 0; cd < ui.cardDescriptions.length; cd++) {
    ui.cardDescriptions[cd].description.hide();
  }
  ui.turnLabel.hide();
  // Show buttons that are specific to the overview
  for (let b = 0; b < ui.overview.buttons.length; b++) {
    ui.overview.buttons[b].show();
  }
  ui.overview.title.show();
  background(COLOUR_MAPPING.BACKDROP_OVERVIEW_SKY);
  image(IMAGE_MAPPING.OVERVIEW, 0, 100);
  
  // Extend the ground part of the banner image downwards
  fill(COLOUR_MAPPING.BACKDROP_OVERVIEW_GROUND);
  noStroke();
  rectMode(CORNERS);
  rect(0, 380, width, height);
}

function toggleSettings(elementClassName) {
  let allSettingElements = document.querySelectorAll(".ui-settings-option-left,.ui-settings-option-right");
  for (let i = 0; i < allSettingElements.length; i++) {
    let displayMode = "none";
    if (allSettingElements[i].classList.contains(elementClassName)) {
      displayMode = "block";
    }
    allSettingElements[i].style.display = displayMode;
  }
}

function closeSettings() {
  document.getElementById("ui-settings-prompt").style.display = "none";
  toggleSettings("ui-settings-page1");
}

function showSettings() {
  document.getElementById("ui-settings-prompt").style.display = "block";
  // Prefill settings upon showing to automatically undo any changes if the user presses Cancel
  let storedSettings = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY_SETTINGS));
  document.getElementById("ui-settings-option-0").value = storedSettings.SQUAD_MEMBERS_SUBTRACTION;
  document.getElementById("ui-settings-option-1").checked = storedSettings.THREAT_CANNOT_ATTACK_AT_ZERO_STRENGTH;
  document.getElementById("ui-settings-option-2").checked = storedSettings.SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS;
  document.getElementById("ui-settings-option-3").checked = storedSettings.FINAL_TURNS_INCREASE_FROM_DEFEATED_SQUAD_MEMBERS;
  document.getElementById("ui-settings-option-4").value = storedSettings.THREAT_COUNT_TOTAL;
  document.getElementById("ui-settings-option-5").value = storedSettings.THREAT_COUNT_MAPPING[1];
  document.getElementById("ui-settings-option-6").value = storedSettings.THREAT_COUNT_MAPPING[2];
  document.getElementById("ui-settings-option-7").value = storedSettings.THREAT_COUNT_MAPPING[3];
  document.getElementById("ui-settings-option-8").value = storedSettings.THREAT_COUNT_MAPPING[4];
  document.getElementById("ui-settings-option-9").value = storedSettings.THREAT_COUNT_MAPPING[5];
  document.getElementById("ui-settings-option-10").value = storedSettings.THREAT_COUNT_MAPPING[0];
}

// Ensures a numeric input respects the min and max bounds, and sets the respective element to the normalised value
function normaliseSettingNumber(fieldElementId) {
  let fieldElement = document.getElementById(fieldElementId);
  let fieldElementValue = 0;
  if (!isNaN(fieldElement.value) && fieldElement.value.trim().length > 0 ) {
    // Extract the proper numerical value to make comparison operations easier
    fieldElementValue = parseInt(fieldElement.value)
  };
  let fieldElementMax = parseInt(fieldElement.max);
  let fieldElementMin = parseInt(fieldElement.min);

  if (!isNaN(fieldElementMin)) {
    fieldElementValue = Math.max(fieldElementMin, fieldElementValue);
  }
  if (!isNaN(fieldElementMax)) {
    fieldElementValue = Math.min(fieldElementMax, fieldElementValue);
  }
  fieldElement.value = fieldElementValue;
  return fieldElementValue;
}

function applySettings() {
  sessionStorage.setItem(SESSION_STORAGE_KEY_SETTINGS, JSON.stringify(
  {
    // The total number of squad members subtracted when the game starts
    SQUAD_MEMBERS_SUBTRACTION: normaliseSettingNumber("ui-settings-option-0"),

    // The total number of threats the player will be required to clear in a game
    THREAT_COUNT_TOTAL: normaliseSettingNumber("ui-settings-option-4"),

    // Threat distribution (by threat type) when generating the list of threats that need to be cleared
    // The total count should be at least THREAT_COUNT_TOTAL
    THREAT_COUNT_MAPPING: {
      0: normaliseSettingNumber("ui-settings-option-10"),
      1: normaliseSettingNumber("ui-settings-option-5"),
      2: normaliseSettingNumber("ui-settings-option-6"),
      3: normaliseSettingNumber("ui-settings-option-7"),
      4: normaliseSettingNumber("ui-settings-option-8"),
      5: normaliseSettingNumber("ui-settings-option-9"),
    },

    // Controls whether threats with 0 strength still have the ability to defeat squad members
    THREAT_CANNOT_ATTACK_AT_ZERO_STRENGTH: document.getElementById("ui-settings-option-1").checked,

    // Controls whether defeated squad members prior to the chopper arriving add extra final turns
    FINAL_TURNS_INCREASE_FROM_DEFEATED_SQUAD_MEMBERS: document.getElementById("ui-settings-option-3").checked,

    // Controls whether new threats in the Encounter phase can change columns, subject to overlap conditions
    SELECTABLE_COLUMN_FOR_ENCOUNTERED_THREATS: document.getElementById("ui-settings-option-2").checked,
  }));
  closeSettings();
  pressGameReset();
}

function configureSettingsDefault() {
  document.getElementById("ui-settings-option-0").value = "1";
  document.getElementById("ui-settings-option-1").checked = false;
  document.getElementById("ui-settings-option-2").checked = false;
  document.getElementById("ui-settings-option-3").checked = false;
  document.getElementById("ui-settings-option-4").value = "28";
  document.getElementById("ui-settings-option-5").value = "6";
  document.getElementById("ui-settings-option-6").value = "6";
  document.getElementById("ui-settings-option-7").value = "6";
  document.getElementById("ui-settings-option-8").value = "6";
  document.getElementById("ui-settings-option-9").value = "6";
  document.getElementById("ui-settings-option-10").value = "4";
}