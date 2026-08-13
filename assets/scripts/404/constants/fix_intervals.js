const fs = require('fs');
let code = fs.readFileSync('maps.js', 'utf8');
code = code.replace(/export const MAP(\d) = \{\s*name: '([^']+)',\s*spawnInterval: 3000,\s*layout: \[/g, (match, p1, p2) => {
    let interval = 10000;
    if(p1 == '1' || p1 == '2') interval = 20000;
    if(p1 == '3') interval = 15000;
    return `export const MAP${p1} = {
    name: '${p2}',
    spawnInterval: ${interval},
    layout: [`;
});
fs.writeFileSync('maps.js', code);
