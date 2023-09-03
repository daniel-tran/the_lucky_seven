const { findMapCardWithValue, shuffleListNonDestructively, getRelativeMapCoordinate } = require("../utilities_common.js");

describe("Common utilities unit tests", () => {
  test("Test basic map card finding", () => {
    const mapCardList = [[1], [3]];
    const targetValue = 3;
    expect(findMapCardWithValue(mapCardList, targetValue)).toEqual(1);
  });

  test("Test unsuccessful map card finding", () => {
    const mapCardList = [[1], [3]];
    const targetValue = 5;
    expect(findMapCardWithValue(mapCardList, targetValue)).toEqual(-1);
  });

  test("Test map card finding with multiple values", () => {
    const mapCardList = [[1], [3, 5, 7]];
    const targetValue = 5;
    expect(findMapCardWithValue(mapCardList, targetValue)).toEqual(1);
  });

  test("Test map card finding with duplicate values", () => {
    const mapCardList = [[1, 5, 7], [3, 5, 7]];
    const targetValue = 5;
    expect(findMapCardWithValue(mapCardList, targetValue)).toEqual(0);
  });

  test("Test non-destructive shuffle", () => {
    // Need to define the list of items separately as there seems to be some sort of pass-by-reference interference going on
    let list = [1, 3, 5, 7, 9];
    const listShuffled = shuffleListNonDestructively([1, 3, 5, 7, 9]);
    expect(listShuffled).not.toEqual(list);
  });

  test("Test non-destructive shuffle with offset", () => {
    // Need to define the list of items separately as there seems to be some sort of pass-by-reference interference going on
    let list = [1, 3, 5, 7, 9];
    const listShuffled = shuffleListNonDestructively([1, 3, 5, 7, 9], 1);
    expect(listShuffled).not.toEqual(list);
    expect(listShuffled.length).not.toEqual(list.length);
  });
});
