// Mocking Google Apps Script services for local testing
const SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getActiveSheet: () => ({
      getRange: (address) => ({
        getValue: () => {
          if (address === "A1") return "World";
          return "";
        }
      })
    })
  })
};

// Exporting mock for Node environment
if (typeof module !== 'undefined') {
  module.exports = { SpreadsheetApp };
}
