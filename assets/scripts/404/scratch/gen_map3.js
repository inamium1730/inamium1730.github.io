const A = [
    '   AAA   ',
    '  AAAAA  ',
    ' AAA AAA ',
    'AAA   AAA',
    'AAAAAAAAA',
    'AAAAAAAAA',
    'AAA   AAA',
    'AAA   AAA',
    'AAA   AAA'
];
const C = [
    '  CCCCC  ',
    ' CCCCCCC ',
    'CCC   CCC',
    'CCC      ',
    'CCC      ',
    'CCC      ',
    'CCC   CCC',
    ' CCCCCCC ',
    '  CCCCC  '
];
const S = [
    ' SSSSSSS ',
    'SSSSSSSS ',
    'SSS      ',
    ' SSSSSSS ',
    '  SSSSSSS',
    '      SSS',
    '      SSS',
    'SSSSSSSS ',
    ' SSSSSSS '
];
const F = [
    'FFFFFFFF ',
    'FFFFFFFF ',
    'FFF      ',
    'FFFFFFF  ',
    'FFFFFFF  ',
    'FFF      ',
    'FFF      ',
    'FFF      ',
    'FFF      '
];
const B = [
    'BBBBBBB  ',
    'BBBBBBBB ',
    'BBB   BBB',
    'BBBBBBBB ',
    'BBBBBBB  ',
    'BBB   BBB',
    'BBB   BBB',
    'BBBBBBBB ',
    'BBBBBBB  '
];
const D = [
    'DDDDDDD  ',
    'DDDDDDDD ',
    'DDD   DDD',
    'DDD   DDD',
    'DDD   DDD',
    'DDD   DDD',
    'DDD   DDD',
    'DDDDDDDD ',
    'DDDDDDD  '
];
const N = [
    'NNN   NNN',
    'NNNN  NNN',
    'NNNNN NNN',
    'NNNNNNNNN',
    'NNN NNNNN',
    'NNN  NNNN',
    'NNN   NNN',
    'NNN   NNN',
    'NNN   NNN'
];

const combine = (letters) => {
    let lines = [];
    for(let r=0; r<9; r++) {
        let row = '';
        for(let l of letters) {
            row += l[r] + '  ';
        }
        lines.push('        \"' + row.trimEnd() + '\"');
    }
    return lines.join(',\n');
};

console.log('ACSS:\n' + combine([A, C, S, S]));
console.log('FBDN:\n' + combine([F, B, D, N]));
