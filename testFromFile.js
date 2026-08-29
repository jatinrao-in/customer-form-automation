const fs = require('fs');
const { parseRow } = require('./src/parseRow');

// Read the raw row from input.txt
const rawRowText = fs.readFileSync('input.txt', 'utf-8').trim();

if (!rawRowText || rawRowText.startsWith('//')) {
    console.log("Please paste your Excel row into input.txt first.");
    process.exit(1);
}

// Parse and print the result
const parsed = parseRow(rawRowText);
console.log(JSON.stringify(parsed, null, 2));
