
const fs = require('fs');
const content = fs.readFileSync('c:/Users/amend/.gemini/antigravity/scratch/Amieira Marina/apps/customer-site/src/app/dashboard/reservations/page.tsx', 'utf8');

const stack = [];
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(' || char === '{' || char === '[') {
        stack.push({ char, pos: i });
    } else if (char === ')' || char === '}' || char === ']') {
        if (stack.length === 0) {
            console.log(`Extra closing ${char} at pos ${i}`);
            continue;
        }
        const last = stack.pop();
        if ((char === ')' && last.char !== '(') ||
            (char === '}' && last.char !== '{') ||
            (char === ']' && last.char !== '[')) {
            console.log(`Mismatched ${char} at pos ${i}, expected closer for ${last.char} from pos ${last.pos}`);
        }
    }
}
if (stack.length > 0) {
    stack.forEach(s => {
        const line = content.substring(0, s.pos).split('\n').length;
        console.log(`Unclosed ${s.char} from line ${line}`);
    });
}
