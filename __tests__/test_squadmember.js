const { SquadMember } = require("../squadmember.js");

describe("Squad member unit tests", () => {
  test("Test constructor", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 0);
    expect(testSquadMember.isFriendly).toEqual(SquadMember.friendlyIndex);
  });
  
  test("Test coordinate setting", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 1);
    testSquadMember.setCoordinates(1, 2);
    expect(testSquadMember.x).toEqual(1);
    expect(testSquadMember.y).toEqual(2);
  });
  
  test("Test flip up", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 2);
    testSquadMember.registerFlip(true);
    expect(testSquadMember.up).toBeTruthy();
    expect(testSquadMember.hasBeenFlipped).toBeTruthy();
    expect(testSquadMember.rotated).toBeTruthy();
    expect(testSquadMember.getUpStatusString()).toEqual("up");
    expect(testSquadMember.getImageBorderColour()).toEqual(testSquadMember.colour);
    // The squad member still has the internal state to move, but there are restrictions applied elsewhere to prevent this
    expect(testSquadMember.canMove).toBeTruthy();
    expect(testSquadMember.movementsRemaining).toEqual(1);
  });
  
  test("Test flip down", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 64);
    testSquadMember.registerFlip(false);
    expect(testSquadMember.up).toBeFalsy();
    expect(testSquadMember.hasBeenFlipped).toBeTruthy();
    expect(testSquadMember.rotated).toBeTruthy();
    expect(testSquadMember.getUpStatusString()).toEqual("down");
    expect(testSquadMember.getImageBorderColour()).toEqual(testSquadMember.colourBorderDown);

    expect(testSquadMember.canMove).toBeFalsy();
    expect(testSquadMember.movementsRemaining).toEqual(0);
    expect(testSquadMember.getStrength()).toEqual(0);
  });
  
  test("Test next-phase reset after flip down", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 8);
    testSquadMember.registerFlip(false);
    testSquadMember.postManeuverReset();
    expect(testSquadMember.up).toBeFalsy(); // Up status persists into other phases
    expect(testSquadMember.hasBeenFlipped).toBeFalsy();
    expect(testSquadMember.rotated).toBeFalsy();
    expect(testSquadMember.canMove).toBeTruthy();
    expect(testSquadMember.movementsRemaining).toEqual(1);
  });
  
  test("Test attack checks", () => {
    const testSquadMember = new SquadMember("The Spy", 0, "#FFFFFF", 32);
    testSquadMember.attackCoordinate = {};
    expect(testSquadMember.isAttacking()).toBeTruthy();
    testSquadMember.postAttackReset();
    expect(testSquadMember.isAttacking()).toBeFalsy();
  });
  
  describe("Squad member unit tests", () => {
    test("The Leader", () => {
      const testSquadMember = new SquadMember("The Leader", 1, "#FFFFFF", 1);
      // Imitate the environment in the Maneuver phase when The Leader has started as down
      testSquadMember.up = false;
      expect(testSquadMember.canFlipUpWithoutSquadMember()).toBeTruthy();
      // Can't flip back up after flipping down on the same turn
      testSquadMember.registerFlip(false);
      expect(testSquadMember.canFlipUpWithoutSquadMember()).toBeFalsy();
      // Can't flip up if already up (even if the flip status is reset)
      testSquadMember.registerFlip(true);
      testSquadMember.hasBeenFlipped = false;
      expect(testSquadMember.canFlipUpWithoutSquadMember()).toBeFalsy();
    });

    test("The Athlete", () => {
      const testSquadMember = new SquadMember("The Athlete", 1, "#FFFFFF", 2);
      testSquadMember.registerMove();
      expect(testSquadMember.rotated).toBeTruthy();
      expect(testSquadMember.canMove).toBeTruthy();
      expect(testSquadMember.movementsRemaining).toEqual(1);
      expect(testSquadMember.canMoveAfterMoving()).toBeTruthy();
      expect(testSquadMember.isMovable()).toBeFalsy();
    });

    test("The Natural", () => {
      const testSquadMember = new SquadMember("The Natural", 1, "#FFFFFF", 8);
      expect(testSquadMember.canAttackDiagonally()).toBeTruthy();
    });

    test("The Mouse", () => {
      const testSquadMember = new SquadMember("The Mouse", 1, "#FFFFFF", 4);
      expect(testSquadMember.canAttackWhenDown()).toBeTruthy();
      expect(testSquadMember.getStrength()).toEqual(testSquadMember.strength);

      testSquadMember.registerMove();
      expect(testSquadMember.canFlipDownAfterMoving()).toBeTruthy();
    });

    test("The Pacifist", () => {
      const testSquadMember = new SquadMember("The Pacifist", 0, "#FFFFFF", 16);
      expect(testSquadMember.grantsPacifistBonus()).toBeTruthy();
      testSquadMember.registerFlip(false);
      expect(testSquadMember.grantsPacifistBonus()).toBeFalsy();
    });

    test("The Anvil & Hammer", () => {
      const testSquadMember = new SquadMember("The Anvil & Hammer", 1, "#FFFFFF", 32);
      const originalStrength = testSquadMember.getStrength();
      expect(testSquadMember.canGetPacifistBonus()).toBeTruthy();

      testSquadMember.applyPacifistBonus();
      expect(testSquadMember.getStrength()).toBeGreaterThan(originalStrength);
      expect(testSquadMember.getStrengthCSSClass()).toEqual("ui-strength-boosted");

      testSquadMember.registerFlip(false);
      expect(testSquadMember.canGetPacifistBonus()).toBeFalsy();

      // Squad member hasn't flipped back up yet, so should default to 0 strength
      testSquadMember.removePacifistBonus();
      expect(testSquadMember.getStrength()).toEqual(0);
      expect(testSquadMember.getStrengthCSSClass()).toEqual("ui-strength-reduced");
      
      testSquadMember.registerFlip(true);
      expect(testSquadMember.getStrength()).toEqual(originalStrength);
      expect(testSquadMember.getStrengthCSSClass()).toEqual("ui-strength-normal");
    });
  });
});
