const fs = require('fs');
const path = require('path');

// Load mocks into global scope
const mocks = require('./mocks.js');
global.SpreadsheetApp = mocks.SpreadsheetApp;

// Load the GAS file content and execute it in global scope
const gasCode = fs.readFileSync(path.join(__dirname, 'main.gs'), 'utf8');
eval(gasCode);

// Run the test
try {
    const result = greetFromSheet();
    console.log("Test Passed!");
    console.log("Result:", result);

    if (result === "Hello World from Google Apps Script!") {
        process.exit(0);
    } else {
        console.error("Unexpected result:", result);
        process.exit(1);
    }
} catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
}
