const { Threat } = require('./threat.js.testclass');

describe("Threat unit tests", () => {
  test("Test constructor", () => {
    const testThreat = new Threat(0, 0, 0);
    expect(testThreat.isFriendly).toEqual(Threat.friendlyIndex);
  });

  test("Test strength reduction setting functions", () => {
    const testThreat = new Threat(0, 0, 0);
    testThreat.setStrengthReduction();
    expect(testThreat.strengthReduction).toBeGreaterThan(0);
    expect(testThreat.getStrengthCSSClass()).toEqual("ui-strength-boosted");

    testThreat.resetStrengthReduction();
    expect(testThreat.strengthReduction).toEqual(0);
    expect(testThreat.getStrengthCSSClass()).toEqual("ui-strength-normal");
  });

  test("Test strength reduction on strength", () => {
    const testThreat = new Threat(Threat.type["Infantry 2"], 0, 0);
    testThreat.setStrengthReduction();
    expect(testThreat.getStrength()).toEqual(1);

    testThreat.resetStrengthReduction();
    expect(testThreat.getStrength()).toEqual(2);

    testThreat.strength = -1;
    expect(testThreat.getStrength()).toEqual(-1);
  });
  
  test("Test post attack reset", () => {
    const testThreat = new Threat(0, 0, 0);
    testThreat.strengthOpposition = 1;
    testThreat.postAttackReset();
    expect(testThreat.strengthOpposition).toEqual(0);
  });
  
  test("Test tank special properties", () => {
    const testThreat = new Threat(Threat.type["Tank"], 0, 0);
    expect(testThreat.isFixedColumn()).toBeTruthy();
  });
  
  describe("Tets defeated status", () => {
    test("Test basic defeat", () => {
      const testThreat = new Threat(Threat.type["Infantry 1"], 0, 0);
      testThreat.strengthOpposition = testThreat.getStrength();
      expect(testThreat.isDefeated()).toBeTruthy();
    });

    test("Test basic survival", () => {
      const testThreat = new Threat(Threat.type["Machine Gun"], 0, 0);
      testThreat.strengthOpposition = 2;
      expect(testThreat.isDefeated()).toBeFalsy();
    });

    test("Test defeat with strength reduction", () => {
      const testThreat = new Threat(Threat.type["Machine Gun"], 0, 0);
      testThreat.setStrengthReduction();
      testThreat.strengthOpposition = 2;
      expect(testThreat.isDefeated()).toBeTruthy();
    });

    test("Test survival due to exemption from attacks", () => {
      const testThreat = new Threat(Threat.type["Flare"], 0, 0);
      testThreat.strengthOpposition = 1;
      expect(testThreat.isDefeated()).toBeFalsy();
    });

    test("Test survival due to exemption from attacks (ignore strength opposition value)", () => {
      const testThreat = new Threat(Threat.type["Mortar"], 0, 0);
      testThreat.strengthOpposition = testThreat.strength - 1;
      expect(testThreat.isDefeated()).toBeFalsy();
    });

    test("Test survival due to 0 strength opposition", () => {
      const testThreat = new Threat(Threat.type["Infantry 1"], 0, 0);
      testThreat.setStrengthReduction();
      testThreat.strengthOpposition = 0;
      expect(testThreat.isDefeated()).toBeFalsy();
    });
  });
});
