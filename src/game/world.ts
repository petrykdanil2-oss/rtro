export type HeroClassId = 'warrior' | 'mage' | 'archer';

export interface HeroClass {
  id: HeroClassId;
  name: string;
  subtitle: string;
  maxHp: number;
  maxStamina: number;
  baseDamage: number;
  speed: number;
  magicGuard: number;
  hasMagic: boolean;
}

export const HERO_CLASSES: HeroClass[] = [
  {
    id: 'warrior',
    name: 'Воин',
    subtitle: 'Высокое здоровье, крепкий щит и сокрушительный удар мечом',
    maxHp: 130,
    maxStamina: 110,
    baseDamage: 20,
    speed: 1.25,
    magicGuard: 0,
    hasMagic: false,
  },
  {
    id: 'mage',
    name: 'Маг',
    subtitle: 'Повелитель Знаков, вооруженный боевым посохом (без щита)',
    maxHp: 90,
    maxStamina: 90,
    baseDamage: 10,
    speed: 1.3,
    magicGuard: 10,
    hasMagic: true,
  },
  {
    id: 'archer',
    name: 'Лучник',
    subtitle: 'Меткий стрелок из тени: дальнобойный лук, колчан стрел, капюшон и стремительный шаг',
    maxHp: 105,
    maxStamina: 135,
    baseDamage: 14,
    speed: 1.38,
    magicGuard: 0,
    hasMagic: false,
  },
];

export type EnemyAIState = 'idle' | 'windup' | 'attack' | 'block';

export type EnemyKind = 'rat' | 'skeleton' | 'cultist' | 'warden' | 'bandit';

export interface SlotResists {
  slash: number;
  blunt: number;
  pierce: number;
}

export interface EnemyArmorSlots {
  head?: SlotResists;
  torso?: SlotResists;
  arms?: SlotResists;
  legs?: SlotResists;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  armorSlots?: EnemyArmorSlots;
  hasJoints?: boolean;
  bleedTimer?: number;
  bleedDps?: number;
  speed: number;
  baseSpeed?: number;
  slowTimer?: number;
  xp: number;
  aiState: EnemyAIState;
  stateTimer: number;
  comboRemaining: number;
  stagger: number;
  stunTimer: number;
  parryStaggerTimer: number;
  attackCooldown: number;
  hurtTimer: number;
  attackHitChecked?: boolean;
  alive: boolean;
}

export function isSolidTile(tile: number | undefined, doorOpen = false): boolean {
  if (tile === undefined) return true;
  if (tile === 1 || tile === 2 || tile === 3 || tile === 4 || tile === 8) {
    return true;
  }
  if (tile === 5) {
    return !doorOpen;
  }
  return false;
}

export type ItemKind = 'potion' | 'chest' | 'sword' | 'staff' | 'gold' | 'key' | 'two_handed' | 'armor' | 'npc' | 'ear' | 'flower' | 'ore' | 'ale' | 'weapon' | 'bow';

export interface WorldItem {
  id: number;
  kind: ItemKind;
  name: string;
  x: number;
  y: number;
  collected: boolean;
  opened?: boolean;
  hasPotion?: boolean;
  hasGold?: boolean;
  goldAmount?: number;
  armorSlot?: 'head' | 'torso' | 'arms' | 'legs';
  isTwoHanded?: boolean;
  npcId?: 'elder_mark' | 'merchant_gus' | 'blacksmith_torin' | 'innkeeper_bran' | 'herbalist_isolda' | 'hunter_ragnar' | 'guard_olgerd';
  flowerId?: number;
  npcRole?: string;
  dialogLines?: string[];
}

// 22x22 Daggerfall-style dungeon ("Склеп Пепла") with wide 2-3 tile corridors and grand halls
// 0 = empty, 1 = stone, 2 = mossy stone, 3 = blood stone, 4 = iron bars, 5 = exit portal
export const INITIAL_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 2, 2, 0, 0, 2, 2, 2, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 4, 4, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 6, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 0, 0, 0, 8, 8, 8, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 8, 8, 8, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 7, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export function createInitialEnemies(): Enemy[] {
  return [
    {
      id: 1,
      kind: 'rat',
      name: 'Гигантская крыса',
      x: 7.5,
      y: 3.5,
      hp: 40,
      maxHp: 40,
      damage: 18,
      armor: 0,
      hasJoints: false,
      speed: 1.2,
      xp: 30,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 2,
      kind: 'rat',
      name: 'Чумная крыса',
      x: 3.5,
      y: 7.5,
      hp: 45,
      maxHp: 45,
      damage: 20,
      armor: 0,
      hasJoints: false,
      speed: 1.25,
      xp: 35,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 3,
      kind: 'skeleton',
      name: 'Скелет-страж',
      x: 10.5,
      y: 7.5,
      hp: 75,
      maxHp: 75,
      damage: 30,
      armor: 15,
      hasJoints: true,
      armorSlots: {
        head: { slash: 0.15, blunt: 0.30, pierce: 0.10 },
        torso: { slash: 0.35, blunt: 0.20, pierce: 0.20 },
        arms: { slash: 0.15, blunt: 0.10, pierce: 0.10 },
        legs: { slash: 0.15, blunt: 0.10, pierce: 0.10 },
      },
      speed: 1.0,
      xp: 65,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 4,
      kind: 'skeleton',
      name: 'Костяной воин',
      x: 3.5,
      y: 11.5,
      hp: 85,
      maxHp: 85,
      damage: 34,
      armor: 20,
      hasJoints: true,
      armorSlots: {
        head: { slash: 0.20, blunt: 0.35, pierce: 0.15 },
        torso: { slash: 0.40, blunt: 0.25, pierce: 0.25 },
        arms: { slash: 0.20, blunt: 0.15, pierce: 0.15 },
        legs: { slash: 0.20, blunt: 0.15, pierce: 0.15 },
      },
      speed: 1.0,
      xp: 75,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 5,
      kind: 'cultist',
      name: 'Тёмный культист',
      x: 12.5,
      y: 3.5,
      hp: 100,
      maxHp: 100,
      damage: 38,
      armor: 10,
      hasJoints: false,
      armorSlots: {
        torso: { slash: 0.15, blunt: 0.10, pierce: 0.10 },
      },
      speed: 1.05,
      xp: 100,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 6,
      kind: 'cultist',
      name: 'Жрец Пепла',
      x: 14.5,
      y: 14.5,
      hp: 110,
      maxHp: 110,
      damage: 42,
      armor: 12,
      hasJoints: false,
      armorSlots: {
        torso: { slash: 0.20, blunt: 0.15, pierce: 0.15 },
      },
      speed: 1.05,
      xp: 110,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 7,
      kind: 'skeleton',
      name: 'Страж катакомб',
      x: 6.5,
      y: 16.5,
      hp: 90,
      maxHp: 90,
      damage: 36,
      armor: 20,
      hasJoints: true,
      armorSlots: {
        head: { slash: 0.20, blunt: 0.35, pierce: 0.15 },
        torso: { slash: 0.45, blunt: 0.25, pierce: 0.25 },
        arms: { slash: 0.20, blunt: 0.15, pierce: 0.15 },
        legs: { slash: 0.20, blunt: 0.15, pierce: 0.15 },
      },
      speed: 1.0,
      xp: 85,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 8,
      kind: 'warden',
      name: 'Страж Склепа',
      x: 18.5,
      y: 2.5,
      hp: 190,
      maxHp: 190,
      damage: 52,
      armor: 35,
      hasJoints: true,
      armorSlots: {
        head: { slash: 0.35, blunt: 0.50, pierce: 0.20 },
        torso: { slash: 0.55, blunt: 0.45, pierce: 0.30 },
        arms: { slash: 0.35, blunt: 0.25, pierce: 0.20 },
        legs: { slash: 0.30, blunt: 0.25, pierce: 0.20 },
      },
      speed: 0.9,
      xp: 220,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    // Bandits in outdoor bandit camp
    {
      id: 20,
      kind: 'bandit',
      name: 'Разбойник с тесаком',
      x: 36.5,
      y: 39.5,
      hp: 75,
      maxHp: 75,
      damage: 24,
      armor: 10,
      hasJoints: false,
      speed: 1.15,
      xp: 60,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 21,
      kind: 'bandit',
      name: 'Бандит-грабитель',
      x: 40.5,
      y: 39.5,
      hp: 80,
      maxHp: 80,
      damage: 26,
      armor: 12,
      hasJoints: false,
      speed: 1.1,
      xp: 65,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 22,
      kind: 'bandit',
      name: 'Разбойник-застрельщик',
      x: 37.5,
      y: 42.5,
      hp: 75,
      maxHp: 75,
      damage: 25,
      armor: 10,
      hasJoints: false,
      speed: 1.15,
      xp: 60,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
    {
      id: 23,
      kind: 'bandit',
      name: 'Главарь шайки',
      x: 41.5,
      y: 42.5,
      hp: 120,
      maxHp: 120,
      damage: 32,
      armor: 18,
      hasJoints: false,
      speed: 1.05,
      xp: 110,
      aiState: 'idle',
      stateTimer: 0,
      comboRemaining: 0,
      stagger: 0,
      stunTimer: 0,
      parryStaggerTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      alive: true,
    },
  ];
}

export function createInitialItems(): WorldItem[] {
  return [
    // Starting dungeon items (chests + starting sword)
    { id: 1, kind: 'sword', name: 'Стальной клинок', x: 1.5, y: 4.5, collected: false },
    {
      id: 2,
      kind: 'chest',
      name: 'Сундук стража',
      x: 8.5,
      y: 1.5,
      collected: false,
      opened: false,
      hasPotion: true,
      hasGold: true,
      goldAmount: 45,
    },
    {
      id: 5,
      kind: 'chest',
      name: 'Сундук Стража Склепа',
      x: 19.5,
      y: 1.5,
      collected: false,
      opened: false,
      hasPotion: true,
      hasGold: true,
      goldAmount: 75,
    },

    // Living Village NPCs
    {
      id: 101,
      kind: 'npc',
      name: 'Старейшина Марк',
      npcId: 'elder_mark',
      npcRole: 'Старейшина деревни',
      x: 17.0,
      y: 35.5,
      collected: false,
    },
    {
      id: 102,
      kind: 'npc',
      name: 'Торговец Гус',
      npcId: 'merchant_gus',
      npcRole: 'Купец и бакалейщик',
      x: 11.5,
      y: 38.0,
      collected: false,
    },
    {
      id: 103,
      kind: 'npc',
      name: 'Кузнец Торин',
      npcId: 'blacksmith_torin',
      npcRole: 'Оружейный кузнец',
      x: 18.5,
      y: 41.5,
      collected: false,
    },
    {
      id: 104,
      kind: 'npc',
      name: 'Трактирщик Бран',
      npcId: 'innkeeper_bran',
      npcRole: 'Хозяин таверны «Пьяный Гоблин»',
      x: 13.5,
      y: 33.5,
      collected: false,
    },
    {
      id: 105,
      kind: 'npc',
      name: 'Травница Изольда',
      npcId: 'herbalist_isolda',
      npcRole: 'Знахарка и алхимик',
      x: 8.5,
      y: 42.0,
      collected: false,
    },
    {
      id: 106,
      kind: 'npc',
      name: 'Охотник Рагнар',
      npcId: 'hunter_ragnar',
      npcRole: 'Следопыт и зверолов',
      x: 22.5,
      y: 37.0,
      collected: false,
    },
    {
      id: 107,
      kind: 'npc',
      name: 'Страж Ольгерд',
      npcId: 'guard_olgerd',
      npcRole: 'Караульный у ворот',
      x: 17.5,
      y: 29.5,
      collected: false,
    },

    // Moon Lilies for Herbalist Quest (Secret forest glade)
    {
      id: 121,
      kind: 'flower',
      name: 'Лунная Лилия',
      flowerId: 1,
      x: 27.5,
      y: 24.5,
      collected: false,
    },
    {
      id: 122,
      kind: 'flower',
      name: 'Лунная Лилия',
      flowerId: 2,
      x: 29.0,
      y: 25.5,
      collected: false,
    },
    {
      id: 123,
      kind: 'flower',
      name: 'Лунная Лилия',
      flowerId: 3,
      x: 28.0,
      y: 26.5,
      collected: false,
    },

    // Stolen Ore for Blacksmith Quest (Bandit camp)
    {
      id: 125,
      kind: 'ore',
      name: 'Мешок со стальной рудой',
      x: 41.5,
      y: 41.5,
      collected: false,
    },

    // Bandit Camp Treasure Chest
    {
      id: 110,
      kind: 'chest',
      name: 'Сундук атамана',
      x: 42.5,
      y: 39.5,
      collected: false,
      opened: false,
      hasPotion: true,
      hasGold: true,
      goldAmount: 140,
    },

    // Hunting Bow at Ragnar's Archery Range
    {
      id: 130,
      kind: 'weapon',
      name: 'Охотничий лук',
      x: 23.8,
      y: 36.2,
      collected: false,
    },
  ];
}
