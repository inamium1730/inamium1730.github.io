const fs = require('fs');
let content = fs.readFileSync('maps.js', 'utf8');

const mapData = {
    'MAP1': 0,
    'MAP2': 2,
    'MAP3': 4,
    'MAP4': 6,
    'MAP5': 0,
    'MAP6': 6,
    'MAP7': 6,
    'MAP8': 6,
    'MAP9': 6
};

for (const [mapName, maxEnemies] of Object.entries(mapData)) {
    const regex = new RegExp('(export const ' + mapName + ' = \\{[\\s\\S]*?name: \\'[^\']*?\\',\\r?\\n)', 'm');
    content = content.replace(regex, '$1    maxEnemies: ' + maxEnemies + ',\n');
}

fs.writeFileSync('maps.js', content);
