
const fs = require('fs');
const content = fs.readFileSync('c:/Users/amend/.gemini/antigravity/scratch/Amieira Marina/apps/customer-site/src/app/dashboard/reservations/page.tsx', 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const divRegex = /<div\b|<\/div\s*>/g;
    let match;
    while ((match = divRegex.exec(line)) !== null) {
        if (match[0] === '<div') {
            stack.push({ line: i + 1, type: 'open' });
        } else {
            if (stack.length === 0) {
                console.log(`Extra closing div at line ${i + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    stack.forEach(s => console.log(`Unclosed div at line ${s.line}`));
}
