const chars = {
  '4': [
    "444   444",
    "444   444",
    "444   444",
    "444444444",
    "444444444",
    "      444",
    "      444",
    "      444",
    "      444"
  ],
  '0': [
    "  00000  ",
    " 0000000 ",
    "000   000",
    "000   000",
    "000   000",
    "000   000",
    "000   000",
    " 0000000 ",
    "  00000  "
  ],
  '3': [
    "333333333",
    "333333333",
    "      333",
    "  333333 ",
    "  333333 ",
    "      333",
    "      333",
    "333333333",
    "333333333"
  ],
  'D': [
    "DDDDDDD  ",
    "DDDDDDDD ",
    "DDD   DDD",
    "DDD   DDD",
    "DDD   DDD",
    "DDD   DDD",
    "DDD   DDD",
    "DDDDDDDD ",
    "DDDDDDD  "
  ],
  'E': [
    "EEEEEEEE",
    "EEEEEEEE",
    "EEE     ",
    "EEEEEEE ",
    "EEEEEEE ",
    "EEE     ",
    "EEE     ",
    "EEEEEEEE",
    "EEEEEEEE"
  ],
  'N': [
    "NNN   NNN",
    "NNNN  NNN",
    "NNNNN NNN",
    "NNNNNNNNN",
    "NNN NNNNN",
    "NNN  NNNN",
    "NNN   NNN",
    "NNN   NNN",
    "NNN   NNN"
  ],
  'I': [
    "III",
    "III",
    "III",
    "III",
    "III",
    "III",
    "III",
    "III",
    "III"
  ],
  'A': [
    "   AAA   ",
    "  AAAAA  ",
    " AAA AAA ",
    "AAA   AAA",
    "AAAAAAAAA",
    "AAAAAAAAA",
    "AAA   AAA",
    "AAA   AAA",
    "AAA   AAA"
  ],
  'C': [
    "  CCCCC  ",
    " CCCCCCC ",
    "CCC   CCC",
    "CCC      ",
    "CCC      ",
    "CCC      ",
    "CCC   CCC",
    " CCCCCCC ",
    "  CCCCC  "
  ],
  'S': [
    "  SSSSSSS",
    " SSSSSSSS",
    "SSS      ",
    " SSSSSSS ",
    "  SSSSSSS",
    "      SSS",
    "      SSS",
    "SSSSSSSS ",
    " SSSSSSS "
  ],
  'F': [
    "FFFFFFFF",
    "FFFFFFFF",
    "FFF     ",
    "FFFFFFF ",
    "FFFFFFF ",
    "FFF     ",
    "FFF     ",
    "FFF     ",
    "FFF     "
  ],
  'O': [
    "  OOOOO  ",
    " OOOOOOO ",
    "OOO   OOO",
    "OOO   OOO",
    "OOO   OOO",
    "OOO   OOO",
    "OOO   OOO",
    " OOOOOOO ",
    "  OOOOO  "
  ],
  'R': [
    "RRRRRRR   ",
    "RRRRRRRR  ",
    "RRR   RRR ",
    "RRR   RRR ",
    "RRRRRRRR  ",
    "RRRRRRR   ",
    "RRR  RRR  ",
    "RRR   RRR ",
    "RRR    RRR"
  ],
  'B': [
    "BBBBBBB  ",
    "BBBBBBBB ",
    "BBB   BBB",
    "BBBBBBBB ",
    "BBBBBBB  ",
    "BBB   BBB",
    "BBB   BBB",
    "BBBBBBBB ",
    "BBBBBBB  "
  ]
};

function genMap(word) {
  let lines = [];
  for (let i = 0; i < 9; i++) {
    let row = [];
    for (let c of word) {
      row.push(chars[c][i]);
    }
    lines.push(`    "${row.join('  ')}"`);
  }
  return lines.join(',\n');
}

console.log("export const MAP6 = [\n" + genMap("403") + "\n];\n");
console.log("export const MAP7 = [\n" + genMap("DENIED") + "\n];\n");
console.log("export const MAP8 = [\n" + genMap("ACCESS") + "\n];\n");
console.log("export const MAP9 = [\n" + genMap("FORBIDDEN") + "\n];\n");
