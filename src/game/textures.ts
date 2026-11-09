// Procedural 16x16 wall textures & 32x32 4-state enemy sprites (idle, windup, attack, block)

export const TEX_SIZE = 16;
export const SPRITE_SIZE = 32;

export type RGBA = [number, number, number, number];

function hexToRgba(hex: string, a = 255): RGBA {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b, a];
}

const TRANSPARENT: RGBA = [0, 0, 0, 0];

function hash(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export interface TextureSet {
  walls: Record<number, RGBA[]>;
  sprites: Record<string, RGBA[]>;
  spriteSize: Record<string, number>;
}

function createStoneWall(baseHex: string, mortarHex: string, accentHex: string, seed: number): RGBA[] {
  const base = hexToRgba(baseHex);
  const mortar = hexToRgba(mortarHex);
  const accent = hexToRgba(accentHex);
  const data: RGBA[] = new Array(TEX_SIZE * TEX_SIZE);

  for (let y = 0; y < TEX_SIZE; y++) {
    const row = Math.floor(y / 4);
    const isHorizontalMortar = y % 4 === 0;
    const offset = (row % 2) * 4;

    for (let x = 0; x < TEX_SIZE; x++) {
      const isVerticalMortar = (x + offset) % 8 === 0;
      const idx = y * TEX_SIZE + x;
      if (isHorizontalMortar || isVerticalMortar) {
        data[idx] = mortar;
      } else {
        const n = hash(x, y, seed);
        if (n > 0.82) {
          data[idx] = accent;
        } else if (n < 0.18) {
          data[idx] = [
            Math.max(0, base[0] - 18),
            Math.max(0, base[1] - 18),
            Math.max(0, base[2] - 18),
            255,
          ];
        } else {
          data[idx] = base;
        }
      }
    }
  }
  return data;
}

function createIronBars(): RGBA[] {
  const stone = hexToRgba('#2b2930');
  const iron = hexToRgba('#7a828e');
  const darkIron = hexToRgba('#3f444d');
  const data: RGBA[] = new Array(TEX_SIZE * TEX_SIZE);

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const idx = y * TEX_SIZE + x;
      if (y < 2 || y > 13) {
        data[idx] = stone;
      } else if (x % 4 === 1) {
        data[idx] = iron;
      } else if (x % 4 === 2) {
        data[idx] = darkIron;
      } else {
        data[idx] = [14, 12, 18, 255];
      }
    }
  }
  return data;
}

function createExitPortal(): RGBA[] {
  const frame = hexToRgba('#4a3b2c');
  const glow1 = hexToRgba('#38bdf8');
  const glow2 = hexToRgba('#0284c7');
  const core = hexToRgba('#e0f2fe');
  const data: RGBA[] = new Array(TEX_SIZE * TEX_SIZE);

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const idx = y * TEX_SIZE + x;
      if (x === 0 || x === 15 || y === 0 || y === 15) {
        data[idx] = frame;
      } else {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2.5) data[idx] = core;
        else if (dist < 5.0) data[idx] = glow1;
        else data[idx] = glow2;
      }
    }
  }
  return data;
}

function parseAsciiSprite(rows: string[], palette: Record<string, string>, size: number): RGBA[] {
  const data: RGBA[] = new Array(size * size).fill(TRANSPARENT);
  for (let y = 0; y < size; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < size; x++) {
      const ch = row[x] || '.';
      if (ch !== '.' && palette[ch]) {
        data[y * size + x] = hexToRgba(palette[ch]);
      }
    }
  }
  return data;
}

export function buildTextures(): TextureSet {
  const walls: Record<number, RGBA[]> = {
    1: createStoneWall('#524e56', '#242126', '#6b6670', 1),
    2: createStoneWall('#3f4d43', '#1d241f', '#576b5c', 2),
    3: createStoneWall('#594242', '#261a1a', '#8c2d2d', 3),
    4: createIronBars(),
    5: createExitPortal(),
  };

  const ratPal = { b: '#1f1814', g: '#6e5a4f', r: '#ef4444', p: '#d48c8c', s: '#e2e8f0' };
  const skelPal = { w: '#e5dec9', k: '#18141c', m: '#475569', y: '#ca8a04', b: '#78350f', s: '#cbd5e1', f: '#f8fafc' };
  const cultPal = { r: '#7f1d1d', k: '#0f0a12', y: '#facc15', g: '#450a0a', m: '#64748b', b: '#334155', s: '#e2e8f0', f: '#fef08a' };
  const wardPal = { y: '#eab308', k: '#1c1917', r: '#ef4444', m: '#475569', b: '#78350f', s: '#e2e8f0', f: '#ffffff' };

  const sprites: Record<string, RGBA[]> = {
    // --- RAT (4 states) ---
    rat_idle: parseAsciiSprite(
      [
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '...........bb......bb...........',
        '..........bppb....bppb..........',
        '.........bggggbbbbggggb.........',
        '........bggggggggggggggb........',
        '.......bgggrrggggggrrgggb.......',
        '.......bggggggggggggggggb.......',
        '......bggggggggppggggggggb......',
        '......bgggggggppppgggggggb......',
        '.....bggggggggggggggggggggb.....',
        '.....bggggggggggggggggggggb.....',
        '......bggggggggggggggggggb......',
        '.......bggggggggggggggggb.......',
        '........bbbggggggggggbbb........',
        '.......bpppb........bpppb.......',
        '......bppppb........bppppb......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      ratPal,
      32
    ),
    rat_windup: parseAsciiSprite(
      [
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '...........bb......bb...........',
        '..........bppb....bppb..........',
        '.........bggggbbbbggggb.........',
        '........bgggrrggggggrrggb.......',
        '.......bgggggggggggggggggb......',
        '.......bgggggggppggggggggb......',
        '......bgggggggppppggggggggb.....',
        '.....bgggggggggggggggggggggb....',
        '....bppbggggggggggggggggbppb....',
        '....bppb.bggggggggggggb.bppb....',
        '..........bggggggggggb..........',
        '...........bggggggggb...........',
        '............bbbbbbbb............',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      ratPal,
      32
    ),
    rat_attack: parseAsciiSprite(
      [
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '.........bb........bb...........',
        '........bppb......bppb..........',
        '.......bggggbbbbbbggggb.........',
        '......bgggrrggggggrrgggb........',
        '.....bggggggggppggggggggb.......',
        '.....bgggggggppppgggggggb.......',
        '....bggggggggggggggggggggb......',
        '...ssbggggggggggggggggggbss.....',
        '..sssbggggggggggggggggggbsss....',
        '...ss.bbbbggggggggggbbbb.ss.....',
        '.........bpppb..bpppb...........',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      ratPal,
      32
    ),
    rat_block: parseAsciiSprite(
      [
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '..........bbbbbbbbbbbb..........',
        '.........bggggggggggggb.........',
        '........bgggrrgggggrrggb........',
        '.......bggggggggggggggggb.......',
        '......bggggggggppggggggggb......',
        '......bggggggggggggggggggb......',
        '......bggggggggggggggggggb......',
        '.......bbbbbbbbbbbbbbbbbb.......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      ratPal,
      32
    ),

    // --- SKELETON (4 states) ---
    skeleton_idle: parseAsciiSprite(
      [
        '............wwwwwwww............',
        '...........wwwwwwwwww...........',
        '..........wwwwwwwwwwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwwwwwwwwww..........',
        '...........wwwwkkwwww...........',
        '............wwwwwwww............',
        '.............wwkkww.............',
        '..............wwww..............',
        '.........mmmmwwwwwwmmmm.........',
        '........mmmmmwwwwwwmmmmm........',
        '...yyyy.mmm..wwwwww..mmm..ss....',
        '..ybbbby.mm..wwwwww..mm..sss....',
        '..ybwwby.mm..wwwwww..mm..sss....',
        '..ybwwby.mm..wwwwww..mm..sss....',
        '..ybbbby.mm...wwww...mm..sss....',
        '...yyyy..mm...wwww...mm..sss....',
        '.........mm...wwww...mm..yyy....',
        '..............wwww........y.....',
        '.............ww..ww.............',
        '.............ww..ww.............',
        '............ww....ww............',
        '............ww....ww............',
        '...........ww......ww...........',
        '...........ww......ww...........',
        '..........mmm......mmm..........',
        '.........mmmm......mmmm.........',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      skelPal,
      32
    ),
    skeleton_windup: parseAsciiSprite(
      [
        '.........................sss....',
        '........................ssss....',
        '............wwwwwwww....sss.....',
        '...........wwwwwwwwww..sss......',
        '..........wwwwwwwwwwww.yyy......',
        '..........wwwkkwwkkwww..y.......',
        '..........wwwkkwwkkwww.mm.......',
        '..........wwwwwwwwwwwwmm........',
        '...........wwwwkkwwww...........',
        '............wwwwwwww............',
        '.............wwkkww.............',
        '.........mmmmwwwwwwmmmm.........',
        '........mmmmmwwwwww.............',
        '...yyyy.mmm..wwwwww.............',
        '..ybbbby.mm..wwwwww.............',
        '..ybwwby.mm..wwwwww.............',
        '..ybwwby.mm...wwww..............',
        '..ybbbby.mm...wwww..............',
        '...yyyy.......wwww..............',
        '..............wwww..............',
        '.............ww..ww.............',
        '.............ww..ww.............',
        '............ww....ww............',
        '............ww....ww............',
        '...........ww......ww...........',
        '...........ww......ww...........',
        '..........mmm......mmm..........',
        '.........mmmm......mmmm.........',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      skelPal,
      32
    ),
    skeleton_attack: parseAsciiSprite(
      [
        '............wwwwwwww............',
        '...........wwwwwwwwww...........',
        '..........wwwwwwwwwwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwwwwwwwwww..........',
        '...........wwwwkkwwww...........',
        '............wwwwwwww............',
        '.............wwkkww.............',
        '..............wwww..............',
        '.........mmmmwwwwwwmmmm.........',
        '........mmmmmwwwwwwmmmmm........',
        '..yyyy..mmm..wwwwww..mmmm.......',
        '.ybbbby.mm...wwwwww....mmmm.....',
        '.ybwwby.mm...wwwwww......yyyffff',
        '.ybwwby.mm....wwww.......yyyffff',
        '.ybbbby.......wwww..............',
        '..yyyy........wwww..............',
        '..............wwww..............',
        '.............ww..ww.............',
        '.............ww..ww.............',
        '............ww....ww............',
        '............ww....ww............',
        '...........ww......ww...........',
        '...........ww......ww...........',
        '..........mmm......mmm..........',
        '.........mmmm......mmmm.........',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      skelPal,
      32
    ),
    skeleton_block: parseAsciiSprite(
      [
        '............wwwwwwww............',
        '...........wwwwwwwwww...........',
        '..........wwwwwwwwwwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwkkwwkkwww..........',
        '..........wwwwwwwwwwww..........',
        '...........wwwwkkwwww...........',
        '............wwwwwwww............',
        '..........yyyyyyyyyyyy..........',
        '.........ybbbbbbbbbbbby.........',
        '.........ybwwwwwwwwwwby.........',
        '.........ybwwwwwwwwwwby.........',
        '.........ybwwwwwwwwwwby.........',
        '.........ybwwwwwwwwwwby.........',
        '.........ybwwwwwwwwwwby.........',
        '.........ybbbbbbbbbbbby.........',
        '..........yyyyyyyyyyyy..........',
        '..............wwww..............',
        '..............wwww..............',
        '.............ww..ww.............',
        '.............ww..ww.............',
        '............ww....ww............',
        '............ww....ww............',
        '...........ww......ww...........',
        '...........ww......ww...........',
        '..........mmm......mmm..........',
        '.........mmmm......mmmm.........',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      skelPal,
      32
    ),

    // --- CULTIST (4 states) ---
    cultist_idle: parseAsciiSprite(
      [
        '............rrrrrrrr............',
        '...........rrrrrrrrrr...........',
        '..........rrrrkkkkrrrr..........',
        '.........rrrrkkkkkkrrrr.........',
        '.........rrrkykrrkykrrr.........',
        '.........rrrrkkkkkkrrrr.........',
        '..........rrrrrrrrrrrr..........',
        '.........rrrrrrrrrrrrrr.........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '......rrrrrggggggggggrrrrr......',
        '.....rrrrrrggggggggggrrrrrr.....',
        '..mmmm.rrrrggggggggggrrrr..ss...',
        '.mbbbbm.rrrggggggggggrrr..sss...',
        '.mbyybm.rrrggggggggggrrr..sss...',
        '.mbbbbm.rrrggggggggggrrr..sss...',
        '..mmmm..rrrggggggggggrrr..yyy...',
        '........rrrggggggggggrrr...y....',
        '........rrrrrrrrrrrrrrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrr........rrrrrr......',
        '......kkkkkk........kkkkkk......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      cultPal,
      32
    ),
    cultist_windup: parseAsciiSprite(
      [
        '.........................sss....',
        '........................ssss....',
        '............rrrrrrrr....sss.....',
        '...........rrrrrrrrrr..yyy......',
        '..........rrrrkkkkrrrr..y.......',
        '.........rrrrkkkkkkrrrrrr.......',
        '.........rrrkykrrkykrrrr........',
        '.........rrrrkkkkkkrrrr.........',
        '..........rrrrrrrrrrrr..........',
        '.........rrrrrrrrrrrrrr.........',
        '........rrrrrrrrrrrrrrrr........',
        '..mmmm.rrrrggggggggggrrr........',
        '.mbbbbm.rrrggggggggggrrr........',
        '.mbyybm.rrrggggggggggrrr........',
        '.mbbbbm.rrrggggggggggrrr........',
        '..mmmm..rrrggggggggggrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrr........rrrrrr......',
        '......kkkkkk........kkkkkk......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      cultPal,
      32
    ),
    cultist_attack: parseAsciiSprite(
      [
        '............rrrrrrrr............',
        '...........rrrrrrrrrr...........',
        '..........rrrrkkkkrrrr..........',
        '.........rrrrkkkkkkrrrr.........',
        '.........rrrkykrrkykrrr.........',
        '.........rrrrkkkkkkrrrr.........',
        '..........rrrrrrrrrrrr..........',
        '.........rrrrrrrrrrrrrr.........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '..mmmm.rrrrggggggggggrrrrr......',
        '.mbbbbm.rrrggggggggggrrrrrr.....',
        '.mbyybm.rrrggggggggggrrr..yyyfff',
        '.mbbbbm.rrrggggggggggrrr..yyyfff',
        '..mmmm..rrrggggggggggrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrr........rrrrrr......',
        '......kkkkkk........kkkkkk......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      cultPal,
      32
    ),
    cultist_block: parseAsciiSprite(
      [
        '............rrrrrrrr............',
        '...........rrrrrrrrrr...........',
        '..........rrrrkkkkrrrr..........',
        '.........rrrrkkkkkkrrrr.........',
        '.........rrrkykrrkykrrr.........',
        '.........rrrrkkkkkkrrrr.........',
        '..........rrrrrrrrrrrr..........',
        '.........mmmmmmmmmmmmmm.........',
        '........mbbbbbbbbbbbbbbm........',
        '........mbyyyyyyyyyyyybm........',
        '........mbyyyyyyyyyyyybm........',
        '........mbbbbbbbbbbbbbbm........',
        '.........mmmmmmmmmmmmmm.........',
        '........rrrrrrrrrrrrrrrr........',
        '........rrrrrrrrrrrrrrrr........',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '.......rrrrrrrrrrrrrrrrrr.......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrrrrrrrrrrrrrrrr......',
        '......rrrrrr........rrrrrr......',
        '......kkkkkk........kkkkkk......',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      cultPal,
      32
    ),

    // --- WARDEN BOSS (4 states) ---
    warden_idle: parseAsciiSprite(
      [
        '.......yy..............yy.......',
        '.......yyy............yyy.......',
        '........yyy.yyyyyyyy.yyy........',
        '.........yyyyyyyyyyyyyy.........',
        '.........yykkkkkkkkkkyy.........',
        '.........yykkrrkkrrkkyy.........',
        '.........yykkkkkkkkkkyy.........',
        '..........yyyyyyyyyyyy..........',
        '........mmmmmmmmmmmmmmmm........',
        '.......mmmmmmmmmmmmmmmmmm.......',
        '..yyyy.mmmmmmmyyyymmmmmmm..sss..',
        '.ybbbby.mmmmmyyyyyymmmmm..ssss..',
        '.ybssby.mmmmmyyyyyymmmmm..ssss..',
        '.ybssby.mmmmmyyyyyymmmmm..ssss..',
        '.ybssby.mmmmmmyyyymmmmmm..ssss..',
        '.ybbbby.mmmmmmmmmmmmmmmm..ssss..',
        '..yyyy..mmmmmmmmmmmmmmmm..ssss..',
        '........mmmmmmmmmmmmmmmm..yyyy..',
        '........mmmmmmmmmmmmmmmm...yy...',
        '........mmmmmmm..mmmmmmm........',
        '.......mmmmmmm....mmmmmmm.......',
        '.......mmmmmm......mmmmmm.......',
        '......mmmmmm........mmmmmm......',
        '......mmmmmm........mmmmmm......',
        '.....mmmmmmm........mmmmmmm.....',
        '.....yyyyyyy........yyyyyyy.....',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      wardPal,
      32
    ),
    warden_windup: parseAsciiSprite(
      [
        '..........................ssss..',
        '.........................sssss..',
        '.......yy..............yyssss...',
        '.......yyy............yyssss....',
        '........yyy.yyyyyyyy.yyyyyy.....',
        '.........yyyyyyyyyyyyyy.yy......',
        '.........yykkkkkkkkkkyymm.......',
        '.........yykkrrkkrrkkyym........',
        '.........yykkkkkkkkkkyy.........',
        '..........yyyyyyyyyyyy..........',
        '........mmmmmmmmmmmmmmmm........',
        '..yyyy.mmmmmmmyyyymmmmmm........',
        '.ybbbby.mmmmmyyyyyymmmmm........',
        '.ybssby.mmmmmyyyyyymmmmm........',
        '.ybssby.mmmmmyyyyyymmmmm........',
        '.ybssby.mmmmmmyyyymmmmmm........',
        '.ybbbby.mmmmmmmmmmmmmmmm........',
        '..yyyy..mmmmmmmmmmmmmmmm........',
        '........mmmmmmm..mmmmmmm........',
        '.......mmmmmmm....mmmmmmm.......',
        '.......mmmmmm......mmmmmm.......',
        '......mmmmmm........mmmmmm......',
        '......mmmmmm........mmmmmm......',
        '.....mmmmmmm........mmmmmmm.....',
        '.....yyyyyyy........yyyyyyy.....',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      wardPal,
      32
    ),
    warden_attack: parseAsciiSprite(
      [
        '.......yy..............yy.......',
        '.......yyy............yyy.......',
        '........yyy.yyyyyyyy.yyy........',
        '.........yyyyyyyyyyyyyy.........',
        '.........yykkkkkkkkkkyy.........',
        '.........yykkrrkkrrkkyy.........',
        '.........yykkkkkkkkkkyy.........',
        '..........yyyyyyyyyyyy..........',
        '........mmmmmmmmmmmmmmmm........',
        '.......mmmmmmmmmmmmmmmmmm.......',
        '.yyyy..mmmmmmmyyyymmmmmmmm......',
        'ybbbby.mmmmmmyyyyyymmmmmmmm.....',
        'ybssby.mmmmmmyyyyyymmmmm..yyyyff',
        'ybssby.mmmmmmyyyyyymmmmm..yyyyff',
        'ybssby.mmmmmmmyyyymmmmmm........',
        'ybbbby.mmmmmmmmmmmmmmmmm........',
        '.yyyy..mmmmmmmmmmmmmmmmm........',
        '........mmmmmmm..mmmmmmm........',
        '.......mmmmmmm....mmmmmmm.......',
        '.......mmmmmm......mmmmmm.......',
        '......mmmmmm........mmmmmm......',
        '......mmmmmm........mmmmmm......',
        '.....mmmmmmm........mmmmmmm.....',
        '.....yyyyyyy........yyyyyyy.....',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      wardPal,
      32
    ),
    warden_block: parseAsciiSprite(
      [
        '.......yy..............yy.......',
        '.......yyy............yyy.......',
        '........yyy.yyyyyyyy.yyy........',
        '.........yyyyyyyyyyyyyy.........',
        '.........yykkkkkkkkkkyy.........',
        '.........yykkrrkkrrkkyy.........',
        '.........yykkkkkkkkkkyy.........',
        '.........yyyyyyyyyyyyyy.........',
        '........ybbbbbbbbbbbbbby........',
        '........ybssssssssssssby........',
        '........ybssssssssssssby........',
        '........ybssssssssssssby........',
        '........ybssssssssssssby........',
        '........ybssssssssssssby........',
        '........ybssssssssssssby........',
        '........ybbbbbbbbbbbbbby........',
        '.........yyyyyyyyyyyyyy.........',
        '........mmmmmmm..mmmmmmm........',
        '.......mmmmmmm....mmmmmmm.......',
        '.......mmmmmm......mmmmmm.......',
        '......mmmmmm........mmmmmm......',
        '......mmmmmm........mmmmmm......',
        '.....mmmmmmm........mmmmmmm.....',
        '.....yyyyyyy........yyyyyyy.....',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
      ],
      wardPal,
      32
    ),

    potion: parseAsciiSprite(
      [
        '................',
        '................',
        '......bbbb......',
        '.......bb.......',
        '......gggg......',
        '.....grrrrg.....',
        '....grrrrrrg....',
        '....grrwwrrg....',
        '....grrrrrrg....',
        '....grrrrrrg....',
        '.....gggggg.....',
        '................',
        '................',
        '................',
        '................',
        '................',
      ],
      { b: '#a16207', g: '#cbd5e1', r: '#dc2626', w: '#fecaca' },
      16
    ),
    chest: parseAsciiSprite(
      [
        '................',
        '................',
        '................',
        '................',
        '................',
        '...yyyyyyyyyy...',
        '..ybbbbbbbbbby..',
        '..ybbyyyyyybby..',
        '..ybbbbbbbbbby..',
        '..ybbbbbbbbbby..',
        '..yyyyyyyyyyyy..',
        '................',
        '................',
        '................',
        '................',
        '................',
      ],
      { y: '#eab308', b: '#78350f' },
      16
    ),
    sword: parseAsciiSprite(
      [
        '.............ss.',
        '............sss.',
        '...........sss..',
        '..........sss...',
        '.........sss....',
        '........sss.....',
        '.......sss......',
        '......sss.......',
        '....yyss........',
        '.....yy.........',
        '....b..y........',
        '...b............',
        '................',
        '................',
        '................',
        '................',
      ],
      { s: '#e2e8f0', y: '#eab308', b: '#78350f' },
      16
    ),
  };

  const spriteSize: Record<string, number> = {
    rat_idle: 32,
    rat_windup: 32,
    rat_attack: 32,
    rat_block: 32,
    skeleton_idle: 32,
    skeleton_windup: 32,
    skeleton_attack: 32,
    skeleton_block: 32,
    cultist_idle: 32,
    cultist_windup: 32,
    cultist_attack: 32,
    cultist_block: 32,
    warden_idle: 32,
    warden_windup: 32,
    warden_attack: 32,
    warden_block: 32,
    potion: 16,
    chest: 16,
    sword: 16,
  };

  return { walls, sprites, spriteSize };
}
