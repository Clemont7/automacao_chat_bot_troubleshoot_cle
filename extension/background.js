// Makes clicking the toolbar icon open the side panel (instead of a popup),
// so it behaves like the Claude in Chrome side panel: docked to the right,
// full height of the browser window.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
