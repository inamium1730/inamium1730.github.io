const fs = require('fs');
let code = fs.readFileSync('maps.js', 'utf8');
code = code.replace(/export const MAP(\d) = \[([\s\S]*?)\];/g, (match, p1, p2) => {
    let name = 'NOT';
    if(p1=='3') name='FOUND';
    if(p1=='4') name='ERROR';
    if(p1=='5') name='BOSS'; // not spawned, just boss
    if(p1=='6') name='403'; // actually NOT, FOUND, ERROR
    if(p1=='7') name='DENIED';
    if(p1=='8') name='ACCESS';
    if(p1=='9') name='FORBIDDEN';
    return `export const MAP${p1} = {
    name: '${name}',
    spawnInterval: 3000,
    layout: [${p2}]
};`;
});
fs.writeFileSync('maps.js', code);
