
const fs = require('fs');
const content = fs.readFileSync('c:/Users/amend/.gemini/antigravity/scratch/Amieira Marina/apps/customer-site/src/app/dashboard/reservations/page.tsx', 'utf8');

const lines = content.split('\n');
let level = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openMatches = line.match(/<div\b/g) || [];
    const closeMatches = line.match(/<\/div\s*>/g) || [];

    level += openMatches.length;
    level -= closeMatches.length;

    if (openMatches.length > 0 || closeMatches.length > 0) {
        console.log(`${(i + 1).toString().padStart(4)}: [${level}] ${line.trim().substring(0, 50)}`);
    }
}
