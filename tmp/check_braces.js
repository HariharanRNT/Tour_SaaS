
import fs from 'fs';

const content = fs.readFileSync('d:/Hariharan/G-Project/RNT_Tour/frontend/src/app/plan-trip/page.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
for (let i = 0; i < 900; i++) {
    const line = lines[i];
    if (line === undefined) break;
    
    // Simple count (ignoring strings/comments for now, but usually they are balanced)
    const matches = line.match(/{/g);
    if (matches) openBraces += matches.length;
    const closures = line.match(/}/g);
    if (closures) openBraces -= closures.length;
    
    if (openBraces === 0 && i > 61) {
        console.log(`Potential closure at line ${i + 1}: ${line}`);
    }
}
console.log(`Final open braces at line 900: ${openBraces}`);
