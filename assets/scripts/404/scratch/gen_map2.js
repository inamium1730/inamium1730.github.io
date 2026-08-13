const genMap = (text) => {
    const font = {
        'A': [' AAA ', 'AAAAA', 'AA AA', 'AAAAA', 'AAAAA', 'AA AA', 'AA AA'],
        'B': ['BBBB ', 'BBBBB', 'BB BB', 'BBBB ', 'BBBBB', 'BB BB', 'BBBB '],
        'C': [' CCC ', 'CCCCC', 'CC   ', 'CC   ', 'CC   ', 'CCCCC', ' CCC '],
        'D': ['DDDD ', 'DDDDD', 'DD DD', 'DD DD', 'DD DD', 'DDDDD', 'DDDD '],
        'E': ['EEEEE', 'EEEEE', 'EE   ', 'EEEEE', 'EE   ', 'EEEEE', 'EEEEE'],
        'F': ['FFFFF', 'FFFFF', 'FF   ', 'FFFF ', 'FF   ', 'FF   ', 'FF   '],
        'I': [' III ', ' III ', ' III ', ' III ', ' III ', ' III ', ' III '],
        'N': ['NN NN', 'NNNNN', 'NNNNN', 'NN NN', 'NN NN', 'NN NN', 'NN NN'],
        'O': [' OOO ', 'OOOOO', 'OO OO', 'OO OO', 'OO OO', 'OOOOO', ' OOO '],
        'R': ['RRRR ', 'RRRRR', 'RR RR', 'RRRR ', 'RR RR', 'RR RR', 'RR RR'],
        'S': [' SSS ', 'SSSSS', 'SS   ', ' SSS ', '   SS', 'SSSSS', ' SSS ']
    };
    let rows = [];
    for(let r=0; r<7; r++) {
        let rowStr = '';
        for(let i=0; i<text.length; i++) {
            let char = text[i];
            rowStr += (font[char] ? font[char][r] : '     ') + '  ';
        }
        rows.push('        "' + rowStr.trimEnd() + '"');
    }
    return rows.join(',\n');
};
console.log('ACSS:\n' + genMap('ACSS'));
console.log('FBDN:\n' + genMap('FBDN'));
