
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');

let curly = 0;
let round = 0;
let square = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') curly++;
    if (content[i] === '}') curly--;
    if (content[i] === '(') round++;
    if (content[i] === ')') round--;
    if (content[i] === '[') square++;
    if (content[i] === ']') square--;
}

console.log(`Curly: ${curly}, Round: ${round}, Square: ${square}`);
