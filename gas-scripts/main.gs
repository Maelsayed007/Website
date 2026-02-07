function greetFromSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var name = sheet.getRange("A1").getValue();
  return "Hello " + name + " from Google Apps Script!";
}
