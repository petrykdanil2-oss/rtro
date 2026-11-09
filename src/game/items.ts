export type CatalystKind = 'staff' | 'wand' | 'tome' | 'orb' | 'focus';
export type HandSlotTag = 'left_only' | 'right_only' | 'both' | 'two_handed';

export type DamageType = 'slash' | 'blunt' | 'pierce' | 'magic';
export type ArmorSlot = 'head' | 'torso' | 'arms' | 'legs';

export interface ArmorResistStats {
  slash: number; // 0.0 - 1.0 (e.g. 0.35 = 35% resist)
  blunt: number;
  pierce: number;
}

export interface InventoryItem {
  id: string; // unique item instance id
  type: 'weapon' | 'shield' | 'focus' | 'armor' | 'misc';
  name: string;
  iconType: 'sword' | 'steel_sword' | 'staff' | 'shield' | 'orb' | 'gold' | 'potion' | 'key' | 'two_handed' | 'armor' | 'ear' | 'flower' | 'ore' | 'ale' | 'bow' | 'arrow' | 'quiver';
  handSlot?: HandSlotTag; // 'left_only' | 'right_only' | 'both' | 'two_handed'
  subtitle: string;
  stats: string;
  lore: string;
  damageBonus?: number;
  penetration?: number;
  weight?: number;
  blockStrength?: number;
  magicGuardBonus?: number;
  catalyst?: boolean;
  catalystType?: CatalystKind;
  damageType?: DamageType;
  twoHanded?: boolean;

  // Slot-based Armor properties
  armorSlot?: ArmorSlot;
  defenseResists?: ArmorResistStats;

  // Passive buffs
  passiveDamageMult?: number;
  passiveCastTimeMult?: number;
  passiveMishapReduction?: number;
  activeDamageMult?: number;
  activeCastTimeMult?: number;
  boundSpellId?: string;
}

export interface LocationData {
  id: 'dungeon' | 'forest';
  name: string;
  map: number[][];
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  torchColor: number;
  torchIntensity: number;
}

export const FOREST_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
