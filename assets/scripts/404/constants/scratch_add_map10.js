const fs = require('fs');
let code = fs.readFileSync('maps.js', 'utf8');

const map10Layout = `export const MAP10 = {
    name: '403',
    spawnInterval: null,
    maxEnemies: 0,
    layout: [
        " 33333333333333 ",
        "3333333333333333",
        "3300000000000033",
        "3000000000000003",
        "300 000  000 003",
        "3000000000000003",
        "300 00000000 003",
        "300  000000  003",
        " 30000000000003 ",
        "  333333333333  ",
        "                ",
        "        4       ",
        "        444     ",
        "        4 44    ",
        "        4  4    "
    ]
};
`;

if (!code.includes('export const MAP10')) {
    code += '\n' + map10Layout;
    fs.writeFileSync('maps.js', code);
    console.log('MAP10 added to maps.js');
} else {
    console.log('MAP10 already exists in maps.js');
}
