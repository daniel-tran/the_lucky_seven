class Threat {
  static friendlyIndex = -1;
  static type = {
    "Tank": 0,
    "Infantry 1": 1,
    "Infantry 2": 2,
    "Machine Gun": 3,
    "Flare": 4,
    "Mortar": 5,
  };
  
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.strength = 0;
    this.name = "";
    this.description = "";
    this.canOverlapWithSquad = false;
    this.isFriendly = Threat.friendlyIndex;
    this.strengthOpposition = 0;
    this.strengthReduction = 0;
    
    let description = [];
    switch (type) {
      case Threat.type["Tank"]:
        this.name = "Tank";
        description = ["Discard all squad members in this row that are up.", "Then discard this card."];
        this.strength = 9;
        this.canOverlapWithSquad = true;
        break;
      case Threat.type["Infantry 1"]:
        this.name = "Infantry";
        description = ["Discard all adjacent squad members."];
        this.strength = 1;
        this.canOverlapWithSquad = false;
        break;
      case Threat.type["Infantry 2"]:
        this.name = "Infantry";
        description = ["Discard all adjacent squad members."];
        this.strength = 2;
        this.canOverlapWithSquad = false;
        break;
      case Threat.type["Machine Gun"]:
        this.name = "Machine Gun";
        description = ["Discard all adjacent squad members that are up."];
        this.strength = 3;
        this.canOverlapWithSquad = false;
        break;
      case Threat.type["Flare"]:
        this.name = "Flare";
        description = ["The squad member here may not move.", "Other squad members may not move here.", "Discard this card at the end of the phase."];
        this.strength = 0;
        this.canOverlapWithSquad = true;
        break;
      case Threat.type["Mortar"]:
        this.name = "Mortar";
        description = ["Flip down and rotate the squad member here.", "Then flip down all adjacent squad members.", "Finally, discard this card."];
        this.strength = 0;
        this.canOverlapWithSquad = true;
        break;
    }
    this.descriptionHTML = description.join("<br>");
    
    this.colourActive = "#FF000080";
    this.colourDefeated = "#00FF0080";
  }
  
  drawThreat(drawAtX, drawAtY, squareWidth, threatImage) {
    imageMode(CENTER);
    image(threatImage, drawAtX, drawAtY, squareWidth, squareWidth);
    if (this.isDefeated()) {
      fill(this.colourDefeated);
      square(drawAtX, drawAtY, squareWidth);
    } else {
      fill(this.colourActive);
    }
  }
  
  isDefeated() {
    // To be defeated, threat must be attackable and attacked by a non-zero force 
    return this.strength > 0 && this.strengthOpposition > 0 && this.strengthOpposition >= this.getStrength();
  }
  
  postAttackReset() {
    this.strengthOpposition = 0;
  }
  
  // Returns the net strength of the threat with reductions applied
  getStrength() {
    if (this.strength <= 0) {
      // Strength cannot drop below 0 - and even 0 is just a placeholder for non-attacking threats
      return this.strength;
    }
    return this.strength - this.strengthReduction;
  }
  
  getStrengthCSSClass() {
    if (this.strengthReduction > 0) {
      return "ui-strength-boosted";
    }
    return "ui-strength-normal";
  }
  
  setStrengthReduction() {
    this.strengthReduction = 1;
  }
  
  resetStrengthReduction() {
    this.strengthReduction = 0;
  }
  
  isFixedColumn() {
    return this.type === Threat.type["Tank"];
  }
}
