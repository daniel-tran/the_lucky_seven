/**
 * @jest-environment jsdom
 */
const { configureSettingsDefault, normaliseSettingNumber, applySettings, closeSettings, toggleSettings } = require("../utilities_overview.js");

// This section was sourced from https://dev.to/snowleo208/things-i-learned-after-writing-tests-for-js-and-html-page-4lja
// It loads the contents of a HTML page without the attached JavaScript
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
jest.dontMock('fs');

describe("Overview utilities unit tests", () => {
  // This section was sourced from https://dev.to/snowleo208/things-i-learned-after-writing-tests-for-js-and-html-page-4lja
  beforeEach(() => {
    // Since this is loading the index page as is, elements that are dynamically set up are not available
    document.documentElement.innerHTML = html.toString();
  });

  test("Test initial load of setting prompt", () => {
    expect(document.getElementById("ui-settings-prompt")).toBeTruthy();
  });
  
  test("Test toggle settings", () => {
    toggleSettings("ui-settings-page2");
    expect(document.getElementsByClassName("ui-settings-page1")[0].style.display).toEqual("none");
    expect(document.getElementsByClassName("ui-settings-page2")[0].style.display).toEqual("block");
  });
  
  test("Test setting normalisation (integer)", () => {
    const elementId = "ui-settings-option-0";
    document.getElementById(elementId).value = "-1";
    expect(normaliseSettingNumber(elementId)).toEqual(0);

    document.getElementById(elementId).value = "9000";
    expect(normaliseSettingNumber(elementId)).toEqual(7);

    document.getElementById(elementId).value = "The Colonel";
    expect(normaliseSettingNumber(elementId)).toEqual(0);
  });
  
  test("Test default settings", () => {
    const elementId = "ui-settings-option-0";
    configureSettingsDefault();
    expect(document.getElementById(elementId).value).toEqual("1");
  });
});
