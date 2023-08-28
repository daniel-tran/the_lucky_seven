class SquadMember {
    constructor(name, strength, colour, type) {
        this.name = name;
        this.strength = strength;
        this.originalStrength = strength;
        this.colour = colour;
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.rotated = false;
        this.up = true;
        this.canMove = true;
        this.canAttack = !(this.type & 16);
        this.attackCoordinate = null;
        this.postMovementActions = [];
        this.movementsAllowed = 1;
        
        // Type is an enum to allow multiple abilities
        if (this.type & 2) {
          this.postMovementActions.push("MOVE");
          this.movementsAllowed = 2;
        }
        this.movementsRemaining = this.movementsAllowed;
        if (this.type & 4) {
          this.postMovementActions.push("FLIPDOWN");
        }

        this.isFriendly = 1;
        this.squareWidth = 40;
        this.squareHeight = this.squareWidth;
        this.boostedStrength = 2;
        this.hasBeenFlipped = false;
        
        this.colourBorderDown = "#6F6868";
        this.descriptionHTML = this.getAbilityText();
    }
    
    getAbilityText() {
      let abilityDescList = [];
      if (this.type & 1) {
        abilityDescList.push("Allows diagonally adjacent squad members to get up.");
        abilityDescList.push("Can get up without adjacent squad members.");
      }
      if (this.type & 2) {
        abilityDescList.push("Can move twice when moving.");
      }
      if (this.type & 4) {
        abilityDescList.push("Can flip down after moving.");
        abilityDescList.push("Can attack adjacent threats when down.");
      }
      if (this.type & 8) {
        abilityDescList.push("Can attack diagonally.");
      }
      if (this.type & 16) {
        abilityDescList.push("Cannot attack.");
      }
      if (this.type & 32) {
        abilityDescList.push(`Has strength ${this.boostedStrength} when the Pacifist is adjacent and up.`);
      }
      if (this.type & 64) {
        abilityDescList.push("Reduces the strength of each adjacent threat by 1.");
      }
      return abilityDescList.join("<br>");
    }
    
    drawSquadMember(drawAtX, drawAtY, squadMemberImage) {
      // Need to do some temporary transformations to rotate the image
      push();
      translate(drawAtX, drawAtY);
      angleMode(DEGREES);
      if (this.rotated) {
        rotate(-90);
      }
      
      imageMode(CENTER);
      noTint();
      // Translated coordinates mean x,y coordinates are now relative to that
      image(squadMemberImage, 0, 0, this.squareWidth, this.squareWidth);
      pop();
    }
    
    setCoordinates(x, y) {
      this.x = x;
      this.y = y;
    }
    
    drawAttackLine(startAtX, startAtY, endAtX, endAtY) {
      strokeWeight(2);
      stroke(0);
      line(startAtX, startAtY, endAtX, endAtY);
      
      // Draw a circle where the attack originates from
      this.drawSquadMemberCircle(startAtX, startAtY)
      
      // Draw a cross where the attack will land
      this.drawSquadMemberCross(endAtX, endAtY);
    }
    
    drawSquadMemberCircle(startAtX, startAtY) {
      strokeWeight(2);
      stroke(0);
      ellipseMode(CENTER);
      fill(this.colour);
      const attackOriginRadius = 10;
      circle(startAtX, startAtY, attackOriginRadius);
    }
    
    drawSquadMemberCross(drawAtX, drawAtY) {
      strokeWeight(2);
      stroke(0);
      const attackCrossRadius = 5;
      line(drawAtX - attackCrossRadius, drawAtY - attackCrossRadius, drawAtX + attackCrossRadius, drawAtY + attackCrossRadius);
      line(drawAtX - attackCrossRadius, drawAtY + attackCrossRadius, drawAtX + attackCrossRadius, drawAtY - attackCrossRadius);
    }
    
    registerFlip(flipStatus) {
      this.up = flipStatus;
      this.registerMove();
      this.hasBeenFlipped = true;
    }
    
    registerMove() {
      this.rotated = true;
      this.movementsRemaining--;
      if (this.movementsRemaining <= 0) {
        this.canMove = false;
      }
    }
    
    postManeuverReset() {
      this.rotated = false;
      this.canMove = true;
      this.hasBeenFlipped = false;
      this.movementsRemaining = this.movementsAllowed;
    }
    
    postAttackReset() {
      this.attackCoordinate = null;
    }
    
    isMovable() {
      return this.canMove && !this.rotated;
    }
    
    isAttacking() {
      return this.attackCoordinate !== null;
    }
    
    canAttackDiagonally() {
      return this.type & 8;
    }
    
    canAttackWhenDown() {
      return this.type & 4;
    }
    
    grantsPacifistBonus() {
      // Pacifist bonus is not applicable if the squad member has other abilities
      return this.type === 16 && this.up;
    }
    
    applyPacifistBonus() {
      this.strength = this.boostedStrength;
    }
    
    canGetPacifistBonus() {
      return this.type & 32 && this.up;
    }
    
    removePacifistBonus() {
      this.strength = this.originalStrength;
    }
    
    canMoveAfterMoving() {
      // Secondary move is only possible after a move action - anything else invalidates this ability
      return this.canMove && this.movementsRemaining > 0 && !this.hasBeenFlipped && this.postMovementActions.indexOf("MOVE") >= 0;
    }
    
    canFlipDownAfterMoving() {
      // Flip down is only possible after a move action - anything else invalidates this ability
      return !this.canMove && this.up && !this.hasBeenFlipped && this.postMovementActions.indexOf("FLIPDOWN") >= 0;
    }

    canFlipUpWithoutSquadMember() {
      return this.type & 1 && !this.hasBeenFlipped && !this.up;
    }
    
    getUpStatusString() {
      if (this.up) {
        return "up";
      }
      return "down";
    }
    
    getStrength() {
      if (this.up || this.canAttackWhenDown()) {
        return this.strength;
      }
      return 0;
    }
    
    getStrengthCSSClass() {
      if (this.getStrength() <= 0 && this.strength > 0) {
        // Don't show the strength as bad if the squad member originally had 0 strength
        return "ui-strength-reduced";
      }
      if (this.strength >= this.boostedStrength) {
        return "ui-strength-boosted";
      }
      return "ui-strength-normal";
    }
    
    getImageBorderColour() {
      if (this.up) {
        return this.colour;
      }
      return this.colourBorderDown;
    }
}
