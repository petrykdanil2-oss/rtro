import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Backpack } from 'lucide-react';
import {
  HERO_CLASSES,
  HeroClass,
  INITIAL_MAP,
  createInitialEnemies,
  createInitialItems,
  Enemy,
  WorldItem,
  isSolidTile,
} from './game/world';
import * as THREE from 'three';
import {
  LOWPOLY_W,
  LOWPOLY_H,
  LowPolyDungeonRenderer,
  InteractionTarget,
} from './game/lowpoly3d';

export interface DialogChoice {
  text: string;
  action: () => void;
  isQuest?: boolean;
}

export interface ActiveDialog {
  npcId: string;
  npcName: string;
  npcRole: string;
  speech: string;
  choices: DialogChoice[];
}

export interface VillageQuest {
  id: string;
  title: string;
  giver: string;
  giverRole: string;
  status: 'available' | 'active' | 'completed';
  objective: string;
  current: number;
  target: number;
  description: string;
  rewardText: string;
}

import { InventoryItem, FOREST_MAP } from './game/items';
import {
  PotionFlaskIcon,
  HelmetIcon,
  AmuletIcon,
  ArmorIcon,
  GlovesIcon,
  LegsIcon,
  BootsIcon,
  RingIcon,
  SwordWeaponIcon,
  TwoHandedSwordIcon,
  ShieldItemIcon,
  MagicOrbIcon,
  StaffWeaponIcon,
  GoldPouchIcon,
  DungeonKeyIcon,
  CharacterPaperdollArt,
} from './game/inventoryView';
import { ALL_SPELLS, Spell, checkMagicMishap } from './game/spells';
import { GrimoireModal } from './game/grimoireView';
import { ItemPreview3D } from './game/ItemPreview3D';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER' | 'VICTORY';

const BowIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 21 C11 15, 11 9, 5 3" stroke="#d97706" strokeWidth="2.5" />
    <line x1="5" y1="3" x2="5" y2="21" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="2 1" />
    <path d="M5 12 L18 12" stroke="#e2e8f0" strokeWidth="1.8" />
    <path d="M15 9 L19 12 L15 15" stroke="#94a3b8" fill="#cbd5e1" strokeWidth="1" />
  </svg>
);

const ArrowIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="19" x2="19" y2="5" stroke="#b45309" strokeWidth="2" />
    <path d="M15 5 L19 5 L19 9" stroke="#94a3b8" fill="#e2e8f0" strokeWidth="1.5" />
    <path d="M5 16 L8 19" stroke="#64748b" strokeWidth="1.5" />
  </svg>
);

const QuiverIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 8 L15 5 L17 19 C17 20.5 15.5 21 14 21 L10 21 C8.5 21 7 20.5 7 19 Z" fill="#78350f" stroke="#d97706" />
    <line x1="10" y1="5" x2="8" y2="2" stroke="#e2e8f0" strokeWidth="1.5" />
    <line x1="12" y1="5" x2="12" y2="1.5" stroke="#e2e8f0" strokeWidth="1.5" />
    <line x1="14" y1="5" x2="16" y2="2" stroke="#e2e8f0" strokeWidth="1.5" />
  </svg>
);

const renderGlobalItemIcon = (type: InventoryItem['iconType'], isSteel?: boolean) => {
  switch (type) {
    case 'staff':
      return <StaffWeaponIcon className="w-5 h-5 flex-shrink-0" />;
    case 'two_handed':
      return <TwoHandedSwordIcon className="w-5 h-5 text-[#e2e8f0] flex-shrink-0" />;
    case 'armor':
      return <ArmorIcon className="w-5 h-5 text-[#94a3b8] flex-shrink-0" />;
    case 'sword':
      return <SwordWeaponIcon className="w-5 h-5 flex-shrink-0" />;
    case 'steel_sword':
      return <SwordWeaponIcon isSteel className="w-5 h-5 flex-shrink-0" />;
    case 'shield':
      return <ShieldItemIcon className="w-5 h-5 flex-shrink-0" />;
    case 'orb':
      return <MagicOrbIcon className="w-5 h-5 flex-shrink-0" />;
    case 'gold':
      return <GoldPouchIcon className="w-5 h-5 text-[#facc15] flex-shrink-0" />;
    case 'key':
      return <DungeonKeyIcon className="w-5 h-5 text-[#facc15] flex-shrink-0" />;
    case 'ear':
      return <span className="text-base select-none">👂</span>;
    case 'bow':
      return <BowIcon className="w-5 h-5 text-[#f59e0b] flex-shrink-0" />;
    case 'arrow':
      return <ArrowIcon className="w-5 h-5 text-[#e2e8f0] flex-shrink-0" />;
    case 'quiver':
      return <QuiverIcon className="w-5 h-5 text-[#d97706] flex-shrink-0" />;
    case 'flower':
      return <span className="text-base select-none">🌸</span>;
    case 'ore':
      return <span className="text-base select-none">⛏️</span>;
    case 'ale':
      return <span className="text-base select-none">🍺</span>;
    case 'potion':
      return <span className="text-base select-none">🧪</span>;
    default:
      return null;
  }
};

interface HudSnapshot {
  locationName?: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  resonance: number;
  magicGuard: number;
  hasMagic: boolean;
  level: number;
  xp: number;
  nextXp: number;
  gold: number;
  kills: number;
  potions: number;
  weaponName: string;
  weaponBonus: number;
  weaponPenetration: number;
  weaponWeight: number;
  shieldBlockStrength: number;
  shieldBlockEfficiency: number;
  shieldWeight: number;
  playerArmor: number;
  armorHead: { slash: number; blunt: number; pierce: number };
  armorTorso: { slash: number; blunt: number; pierce: number };
  armorArms: { slash: number; blunt: number; pierce: number };
  armorLegs: { slash: number; blunt: number; pierce: number };
  staminaRegenMult: number;
  isBlocking: boolean;
  parryBonusReady: boolean;
  parryCooldown: number;
  isParrying: boolean;
  isPowerChargingRH: boolean;
  powerChargePctRH: number;
  isPowerChargingLH: boolean;
  powerChargePctLH: number;
  playerStagger: number;
  playerStunTimer: number;
  rhSpellId?: string | null;
  lhSpellId?: string | null;
  rhCasting?: boolean;
  lhCasting?: boolean;
  rhCastElapsed?: number;
  rhCastTotal?: number;
  lhCastElapsed?: number;
  lhCastTotal?: number;
  bowState?: 'idle' | 'drawing' | 'full' | 'recover';
  bowDraw?: number;
}


// 3-Layer Sequential Armor Calculator

let nextItemId = 1000;
function getNextItemId(eng?: any): number {
  if (eng && typeof eng.nextItemId === 'number') {
    eng.nextItemId += 1;
    return eng.nextItemId;
  }
  nextItemId += 1;
  return nextItemId;
}

function dropLootForEnemy(enemy: any, eng: any, renderer: any, setBanner: (msg: string | null) => void) {
  // Gold drop on ground (automatic proximity / pickup) - exactly one pouch per enemy
  const goldAmount = enemy.kind === 'warden' ? 50 : enemy.kind === 'cultist' ? 25 : enemy.kind === 'bandit' ? (25 + Math.floor(Math.random() * 20)) : 15;
  const goldItem: any = {
    id: getNextItemId(eng),
    kind: 'gold',
    name: `Кошель (${goldAmount} монет)`,
    x: enemy.x + (Math.random() - 0.5) * 0.25,
    y: enemy.y + (Math.random() - 0.5) * 0.25,
    collected: false,
    goldAmount,
  };
  eng.items.push(goldItem);
  renderer?.spawnWorldItem(goldItem);

  // Equipment drops
  if (enemy.kind === 'warden') {
    // Warden drops Two-Handed Zweihander + Plate Cuirass + Greathelm
    const greatsword: any = {
      id: getNextItemId(eng),
      kind: 'two_handed',
      name: 'Цвайхендер Смотрителя',
      x: enemy.x + 0.20,
      y: enemy.y,
      collected: false,
      isTwoHanded: true,
    };
    const plateDrop: any = {
      id: getNextItemId(eng),
      kind: 'armor',
      name: 'Латная кираса Смотрителя',
      x: enemy.x - 0.20,
      y: enemy.y,
      collected: false,
      armorSlot: 'torso',
    };
    const helmDrop: any = {
      id: getNextItemId(eng),
      kind: 'armor',
      name: 'Рогатый шлем Смотрителя',
      x: enemy.x,
      y: enemy.y + 0.20,
      collected: false,
      armorSlot: 'head',
    };
    eng.items.push(greatsword, plateDrop, helmDrop);
    renderer?.spawnWorldItem(greatsword);
    renderer?.spawnWorldItem(plateDrop);
    renderer?.spawnWorldItem(helmDrop);
    setBanner('★ Смотритель повержен! На полу: Цвайхендер, Кираса, Шлем и Золото! ★');
    setTimeout(() => setBanner(null), 4500);
  } else if (enemy.kind === 'skeleton') {
    const roll = Math.random();
    if (roll < 0.45) {
      const swordItem: any = {
        id: getNextItemId(eng),
        kind: 'sword',
        name: 'Стальной меч стража',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
      };
      eng.items.push(swordItem);
      renderer?.spawnWorldItem(swordItem);
    } else if (roll < 0.70) {
      const torsoDrop: any = {
        id: getNextItemId(eng),
        kind: 'armor',
        name: 'Нагрудник скелета-стража',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
        armorSlot: 'torso',
      };
      eng.items.push(torsoDrop);
      renderer?.spawnWorldItem(torsoDrop);
    } else if (roll < 0.85) {
      const helmDrop: any = {
        id: getNextItemId(eng),
        kind: 'armor',
        name: 'Железный шлем стража',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
        armorSlot: 'head',
      };
      eng.items.push(helmDrop);
      renderer?.spawnWorldItem(helmDrop);
    } else {
      const armsDrop: any = {
        id: getNextItemId(eng),
        kind: 'armor',
        name: 'Кованые наручи стража',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
        armorSlot: 'arms',
      };
      eng.items.push(armsDrop);
      renderer?.spawnWorldItem(armsDrop);
    }
  } else if (enemy.kind === 'cultist') {
    if (Math.random() < 0.6) {
      const pot: any = {
        id: getNextItemId(eng),
        kind: 'potion',
        name: 'Зелье исцеления',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
      };
      eng.items.push(pot);
      renderer?.spawnWorldItem(pot);
    } else {
      const vest: any = {
        id: getNextItemId(eng),
        kind: 'armor',
        name: 'Одеяние культиста',
        x: enemy.x + 0.12,
        y: enemy.y,
        collected: false,
        armorSlot: 'torso',
      };
      eng.items.push(vest);
      renderer?.spawnWorldItem(vest);
    }
  } else if (enemy.kind === 'bandit') {
    // 100% drops Bandit Ear trophy on ground
    const earItem: any = {
      id: getNextItemId(eng),
      kind: 'ear',
      name: 'Ухо разбойника',
      x: enemy.x + 0.12,
      y: enemy.y,
      collected: false,
    };
    eng.items.push(earItem);
    renderer?.spawnWorldItem(earItem);

    // 50% chance for bandit cutlass or healing potion (single gold pouch dropped above)
    if (Math.random() < 0.5) {
      const swordItem: any = {
        id: getNextItemId(eng),
        kind: 'sword',
        name: 'Бандитский тесак',
        x: enemy.x,
        y: enemy.y + 0.15,
        collected: false,
      };
      eng.items.push(swordItem);
      renderer?.spawnWorldItem(swordItem);
    } else {
      const potItem: any = {
        id: getNextItemId(eng),
        kind: 'potion',
        name: 'Зелье лечения',
        x: enemy.x,
        y: enemy.y + 0.15,
        collected: false,
      };
      eng.items.push(potItem);
      renderer?.spawnWorldItem(potItem);
    }
  }
}

function calculatePerSlotDamage(
  rawDamage: number,
  damageType: 'slash' | 'blunt' | 'pierce' | 'magic',
  penetration: number, // 0 to 100
  hitZone: string, // 'head' | 'torso' | 'arms' | 'legs' | 'joint' | 'back'
  slots: {
    head?: { slash: number; blunt: number; pierce: number };
    torso?: { slash: number; blunt: number; pierce: number };
    arms?: { slash: number; blunt: number; pierce: number };
    legs?: { slash: number; blunt: number; pierce: number };
  }
): { finalDamage: number; absorbed: number; bypassedArmor: boolean } {
  if (damageType === 'magic') {
    return { finalDamage: Math.max(1, Math.floor(rawDamage)), absorbed: 0, bypassedArmor: false };
  }

  // ANATOMIC JOINT: 100% full unmitigated direct flesh damage!
  if (hitZone === 'joint') {
    return { finalDamage: Math.max(1, Math.floor(rawDamage)), absorbed: 0, bypassedArmor: true };
  }

  // Map zone to armor piece
  let slotResists: { slash: number; blunt: number; pierce: number } | undefined;
  if (hitZone === 'head') slotResists = slots.head;
  else if (hitZone === 'arms') slotResists = slots.arms;
  else if (hitZone === 'legs') slotResists = slots.legs;
  else slotResists = slots.torso; // torso & back default to torso armor

  if (!slotResists) {
    return { finalDamage: Math.max(1, Math.floor(rawDamage)), absorbed: 0, bypassedArmor: false };
  }

  const penMult = Math.max(0, 1 - penetration / 100);
  const resistPct = (slotResists[damageType] || 0) * penMult;
  const absorbed = rawDamage * Math.min(0.90, resistPct);
  const finalDamage = Math.max(1, Math.floor(rawDamage - absorbed));

  return {
    finalDamage,
    absorbed: Math.round(absorbed),
    bypassedArmor: false,
  };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedClass, setSelectedClass] = useState<HeroClass>(HERO_CLASSES[0]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [grimoireOpen, setGrimoireOpen] = useState(false);
  const [assignedSpellIds, setAssignedSpellIds] = useState<(string | null)[]>([
    'spark',
    'frost_glance',
    'fireball',
    'minor_heal',
    null,
  ]);
  const [selectedSpellSlot, setSelectedSpellSlot] = useState<number>(0);
  const [rhSpellId, setRhSpellId] = useState<string | null>('spark');
  const [lhSpellId, setLhSpellId] = useState<string | null>('frost_glance');
  const [mishapBanner, setMishapBanner] = useState<string | null>(null);
  const [selectedWeaponForInspection, setSelectedWeaponForInspection] = useState<InventoryItem | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{
    title: string;
    subtitle: string;
    stats?: string;
    lore: string;
  } | null>(null);

  // Equipped items & Inventory bag state
  const [mainHandItem, setMainHandItem] = useState<InventoryItem | null>(null);
  const [offHandItem, setOffHandItem] = useState<InventoryItem | null>(null);
  const [equippedHelmet, setEquippedHelmet] = useState<InventoryItem | null>(null);
  const [equippedTorso, setEquippedTorso] = useState<InventoryItem | null>(null);
  const [equippedArms, setEquippedArms] = useState<InventoryItem | null>(null);
  const [equippedLegs, setEquippedLegs] = useState<InventoryItem | null>(null);
  const [aimedJoint, setAimedJoint] = useState<boolean>(false);
  const [bagSlots, setBagSlots] = useState<(InventoryItem | null)[]>(() =>
    Array(11).fill(null)
  );
  // Dragging source: 'bag_0'..'bag_10' or 'mainHand' or 'offHand'
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<'dungeon' | 'forest'>('dungeon');
  const [pixelFilterEnabled, setPixelFilterEnabled] = useState(true);

  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [noticeBoardOpen, setNoticeBoardOpen] = useState(false);
  const [questTrackerCollapsed, setQuestTrackerCollapsed] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string>('bandits');
  const [selectedQuestTab, setSelectedQuestTab] = useState<'all' | 'active' | 'completed'>('active');

  const [hud, setHud] = useState<HudSnapshot>({
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    resonance: 0,
    magicGuard: 0,
    hasMagic: false,
    level: 1,
    xp: 0,
    nextXp: 100,
    gold: 0,
    kills: 0,
    potions: 1,
    locationName: 'Склеп Пепла',
    weaponName: 'Ржавый меч',
    weaponBonus: 0,
    weaponPenetration: 10,
    weaponWeight: 4.5,
    shieldBlockStrength: 75,
    shieldBlockEfficiency: 0,
    shieldWeight: 3.5,
    playerArmor: 35,
    isBlocking: false,
    parryBonusReady: false,
    parryCooldown: 0,
    isParrying: false,
    isPowerChargingRH: false,
    powerChargePctRH: 0,
    isPowerChargingLH: false,
    powerChargePctLH: 0,
    playerStagger: 0,
    playerStunTimer: 0,
    armorHead: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    armorTorso: { slash: 0.45, blunt: 0.35, pierce: 0.20 },
    armorArms: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    armorLegs: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    staminaRegenMult: 1.0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const renderer3dRef = useRef<LowPolyDungeonRenderer | null>(null);
  useEffect(() => {
    renderer3dRef.current?.setPixelatedRendering(pixelFilterEnabled);
  }, [pixelFilterEnabled]);
  const interactionTargetRef = useRef<InteractionTarget | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const lmbHoldRef = useRef<{
    timerId: number | null;
    startTime: number;
    isHoldCasting: boolean;
    isRHMelee: boolean;
    isBow: boolean;
  }>({
    timerId: null,
    startTime: 0,
    isHoldCasting: false,
    isRHMelee: false,
    isBow: false,
  });
  const rmbHoldRef = useRef<{
    startTime: number;
    isLHWeapon: boolean;
    isLHCatalyst: boolean;
  }>({
    startTime: 0,
    isLHWeapon: false,
    isLHCatalyst: false,
  });

  const engineRef = useRef({
    playerX: 2.5,
    playerY: 2.5,
    playerAngle: 0,
    playerPitch: 0,
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    baseDamage: 18,
    weaponBonus: 0,
    weaponName: 'Ржавый меч',
    weaponPenetration: 10,
    weaponWeight: 4.5,
    shieldBlockStrength: 75,
    shieldBlockEfficiency: 0,
    shieldWeight: 3.5,
    playerArmor: 35,
    armorHead: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    armorTorso: { slash: 0.45, blunt: 0.35, pierce: 0.20 },
    armorArms: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    armorLegs: { slash: 0.20, blunt: 0.15, pierce: 0.10 },
    staminaRegenMult: 1.0,
    equippedHelmet: null as InventoryItem | null,
    equippedTorso: null as InventoryItem | null,
    equippedArms: null as InventoryItem | null,
    equippedLegs: null as InventoryItem | null,
    speed: 1.25,
    level: 1,
    xp: 0,
    nextXp: 100,
    gold: 0,
    kills: 0,
    potions: 1,
    mana: 0,
    maxMana: 0,
    manaRegen: 0,
    resonance: 0,
    magicGuard: 0,
    hasMagic: false,
    timeSinceLastCast: 10,
    silenceTimer: 0,
    spellCooldowns: {} as Record<string, number>,
    swingTimer: 0,
    swingHitChecked: false,
    offHandSwingTimer: 0,
    offHandSwingHitChecked: false,
    isBlocking: false,
    isMapOpen: false,
    parryWindowTimer: 0,
    parryBonusTimer: 0,
    parryAttemptTimer: 0,
    parryCooldownTimer: 0,
    powerSwingTimer: 0,
    powerSwingCharging: false,
    powerSwingChargeElapsed: 0,
    powerSwingHitChecked: false,
    bow: {
      state: 'idle' as 'idle' | 'drawing' | 'full' | 'recover',
      draw: 0,
      recoverTimer: 0,
    },
    offHandPowerSwingTimer: 0,
    offHandPowerSwingCharging: false,
    offHandPowerSwingChargeElapsed: 0,
    offHandPowerSwingHitChecked: false,
    hurtFlash: 0,
    cameraShake: 0,
    hitStopTimer: 0,
    playerStagger: 0,
    playerStunTimer: 0,
    enemies: [] as Enemy[],
    items: [] as WorldItem[],
    explored: [] as boolean[][],
    keys: new Set<string>(),
    currentLocation: 'dungeon' as 'dungeon' | 'forest',
    bossKeyDropped: false,
    dungeonDoorUnlocked: false,
    banditQuestState: 'not_started' as 'not_started' | 'active' | 'completed',
    banditEars: 0,
    questBandits: 'available' as 'available' | 'active' | 'completed',
    questCrypt: 'available' as 'available' | 'active' | 'completed',
    questOre: 'available' as 'available' | 'active' | 'completed',
    questLilies: 'available' as 'available' | 'active' | 'completed',
    questAle: 'available' as 'available' | 'active' | 'completed',
    moonLilies: 0,
    hasStolenOre: false,
    hasDarkAle: false,
    wardenDefeated: false,
    selectedSpellSlot: 0,
    rhSpellId: 'spark' as string | null,
    lhSpellId: 'frost_glance' as string | null,
    rhCasting: false,
    rhCastElapsed: 0,
    rhCastTotal: 0,
    lhCasting: false,
    lhCastElapsed: 0,
    lhCastTotal: 0,
    assignedSpellIds: [
      'spark',
      'frost_glance',
      'fireball',
      'minor_heal',
      null,
    ] as (string | null)[],
    mainHandItem: null as InventoryItem | null,
    offHandItem: null as InventoryItem | null,
    bagSlots: [] as (InventoryItem | null)[],
  });

  const startGame = useCallback((hero: HeroClass) => {
    const explored = INITIAL_MAP.map((row) => row.map(() => false));
    const eng = engineRef.current;
    eng.playerX = 2.5;
    eng.playerY = 2.5;
    eng.playerAngle = 0;
    eng.hp = hero.maxHp;
    eng.maxHp = hero.maxHp;
    eng.stamina = hero.maxStamina;
    eng.maxStamina = hero.maxStamina;
    eng.baseDamage = hero.baseDamage;
    eng.weaponBonus = 0;
    if (hero.id === 'archer') {
      eng.weaponName = 'Охотничий лук';
      eng.weaponPenetration = 25;
      eng.weaponWeight = 2.2;
      eng.shieldBlockStrength = 0;
      eng.shieldBlockEfficiency = 0;
      eng.shieldWeight = 0;
      eng.playerArmor = 22;
    } else if (hero.id === 'mage') {
      eng.weaponName = 'Сучковатый посох';
      eng.weaponPenetration = 5;
      eng.weaponWeight = 2.5;
      eng.shieldBlockStrength = 0;
      eng.shieldBlockEfficiency = 0;
      eng.shieldWeight = 0;
      eng.playerArmor = 15;
    } else {
      eng.weaponName = 'Ржавый меч';
      eng.weaponPenetration = 10;
      eng.weaponWeight = 4.5;
      eng.shieldBlockStrength = 75;
      eng.shieldBlockEfficiency = 0;
      eng.shieldWeight = 3.5;
      eng.playerArmor = 35;
    }
    eng.speed = hero.speed;
    eng.resonance = 0;
    eng.magicGuard = hero.magicGuard;
    eng.hasMagic = hero.hasMagic;
    eng.timeSinceLastCast = 10;
    eng.silenceTimer = 0;
    eng.spellCooldowns = {};
    eng.level = 1;
    eng.xp = 0;
    eng.nextXp = 100;
    eng.gold = 0;
    eng.kills = 0;
    eng.potions = 1;
    eng.swingTimer = 0;
    eng.offHandSwingTimer = 0;
    eng.isBlocking = false;
    eng.parryWindowTimer = 0;
    eng.parryBonusTimer = 0;
    eng.parryAttemptTimer = 0;
    eng.parryCooldownTimer = 0;
    eng.powerSwingTimer = 0;
    eng.powerSwingCharging = false;
    eng.powerSwingChargeElapsed = 0;
    eng.powerSwingHitChecked = false;
    eng.offHandPowerSwingTimer = 0;
    eng.offHandPowerSwingCharging = false;
    eng.offHandPowerSwingChargeElapsed = 0;
    eng.offHandPowerSwingHitChecked = false;
    eng.hurtFlash = 0;
    eng.enemies = createInitialEnemies();
    eng.items = createInitialItems();
    eng.explored = explored;
    eng.keys.clear();
    eng.bossKeyDropped = false;
    eng.dungeonDoorUnlocked = false;
    eng.banditQuestState = 'not_started';
    eng.banditEars = 0;
    eng.selectedSpellSlot = 0;
    setSelectedSpellSlot(0);
    eng.rhSpellId = 'spark';
    eng.lhSpellId = 'frost_glance';
    eng.rhCasting = false;
    eng.rhCastElapsed = 0;
    eng.rhCastTotal = 0;
    eng.lhCasting = false;
    eng.lhCastElapsed = 0;
    eng.lhCastTotal = 0;
    setRhSpellId('spark');
    setLhSpellId('frost_glance');
    eng.assignedSpellIds = ['spark', 'frost_glance', 'fireball', 'minor_heal', null];
    setAssignedSpellIds(['spark', 'frost_glance', 'fireball', 'minor_heal', null]);
    eng.currentLocation = 'dungeon';
    setCurrentLocation('dungeon');

    // Body-Slot Armor (Helmet, Torso, Arms, Legs)
    const startTorso: InventoryItem = hero.id === 'warrior' ? {
      id: 'start_torso_cuirass',
      type: 'armor',
      name: 'Кованый нагрудник',
      iconType: 'armor',
      armorSlot: 'torso',
      subtitle: 'Защита корпуса (Торс)',
      stats: 'Защита: 50% руб · 35% дроб · 30% кол',
      lore: 'Стальной кованый нагрудник. Надёжно защищает жизненно важные органы в груди.',
      defenseResists: { slash: 0.50, blunt: 0.35, pierce: 0.30 },
    } : hero.id === 'archer' ? {
      id: 'start_torso_leather',
      type: 'armor',
      name: 'Кожаная куртка следопыта',
      iconType: 'armor',
      armorSlot: 'torso',
      subtitle: 'Защита корпуса (Торс)',
      stats: 'Защита: 30% руб · 25% дроб · 35% кол',
      lore: 'Дублёная мягкая кожа. Обеспечивает свободу плечам для стрельбы из лука.',
      defenseResists: { slash: 0.30, blunt: 0.25, pierce: 0.35 },
    } : {
      id: 'start_torso_robe',
      type: 'armor',
      name: 'Мантия адепта',
      iconType: 'armor',
      armorSlot: 'torso',
      subtitle: 'Защита корпуса (Торс)',
      stats: 'Защита: 15% руб · 15% дроб · 10% кол',
      lore: 'Зачарованная плотная ткань, слегка смягчающая скользящие удары.',
      defenseResists: { slash: 0.15, blunt: 0.15, pierce: 0.10 },
    };

    const startHelmet: InventoryItem | null = hero.id === 'warrior' ? {
      id: 'start_helmet',
      type: 'armor',
      name: 'Шлем стражника',
      iconType: 'armor',
      armorSlot: 'head',
      subtitle: 'Защита головы (Шлем)',
      stats: 'Защита: 35% руб · 45% дроб · 20% кол',
      lore: 'Стальной куполообразный шлем. Спасает череп от дробящих ударов.',
      defenseResists: { slash: 0.35, blunt: 0.45, pierce: 0.20 },
    } : hero.id === 'archer' ? {
      id: 'start_hood',
      type: 'armor',
      name: 'Капюшон стрелка',
      iconType: 'armor',
      armorSlot: 'head',
      subtitle: 'Защита головы (Капюшон)',
      stats: 'Защита: 15% руб · 15% дроб · 20% кол',
      lore: 'Плотный суконный капюшон с маской от ветра и пыли.',
      defenseResists: { slash: 0.15, blunt: 0.15, pierce: 0.20 },
    } : null;

    const startArms: InventoryItem | null = hero.id === 'warrior' ? {
      id: 'start_arms',
      type: 'armor',
      name: 'Латные наручи',
      iconType: 'armor',
      armorSlot: 'arms',
      subtitle: 'Защита рук (Наручи)',
      stats: 'Защита: 30% руб · 20% дроб · 20% кол',
      lore: 'Сегментированные пластины, прикрывающие предплечья от секущих атак.',
      defenseResists: { slash: 0.30, blunt: 0.20, pierce: 0.20 },
    } : hero.id === 'archer' ? {
      id: 'start_bracers',
      type: 'armor',
      name: 'Краги лучника',
      iconType: 'armor',
      armorSlot: 'arms',
      subtitle: 'Защита рук (Краги)',
      stats: 'Защита: 20% руб · 15% дроб · 25% кол',
      lore: 'Кожаные краги с медными пластинами, защищающие руки от удара тетивы.',
      defenseResists: { slash: 0.20, blunt: 0.15, pierce: 0.25 },
    } : null;

    const startLegs: InventoryItem | null = hero.id === 'warrior' ? {
      id: 'start_legs',
      type: 'armor',
      name: 'Поножи оруженосца',
      iconType: 'armor',
      armorSlot: 'legs',
      subtitle: 'Защита ног (Поножи)',
      stats: 'Защита: 30% руб · 25% дроб · 20% кол',
      lore: 'Стальные наголенники с наколенниками.',
      defenseResists: { slash: 0.30, blunt: 0.25, pierce: 0.20 },
    } : hero.id === 'archer' ? {
      id: 'start_boots',
      type: 'armor',
      name: 'Сапоги следопыта',
      iconType: 'armor',
      armorSlot: 'legs',
      subtitle: 'Защита ног (Сапоги)',
      stats: 'Защита: 20% руб · 20% дроб · 20% кол',
      lore: 'Мягкие кожаные сапоги для бесшумного шага.',
      defenseResists: { slash: 0.20, blunt: 0.20, pierce: 0.20 },
    } : null;

    eng.equippedHelmet = startHelmet;
    eng.equippedTorso = startTorso;
    eng.equippedArms = startArms;
    eng.equippedLegs = startLegs;
    setEquippedHelmet(startHelmet);
    setEquippedTorso(startTorso);
    setEquippedArms(startArms);
    setEquippedLegs(startLegs);

    eng.staminaRegenMult = 1.0;

    eng.armorHead = startHelmet?.defenseResists || { slash: 0, blunt: 0, pierce: 0 };
    eng.armorTorso = startTorso.defenseResists || { slash: 0, blunt: 0, pierce: 0 };
    eng.armorArms = startArms?.defenseResists || { slash: 0, blunt: 0, pierce: 0 };
    eng.armorLegs = startLegs?.defenseResists || { slash: 0, blunt: 0, pierce: 0 };

    // Create starting equipment as items
    const startMainHand: InventoryItem =
      hero.id === 'mage'
        ? {
            id: 'start_staff',
            type: 'weapon',
            name: 'Сучковатый посох',
            iconType: 'staff',
            catalystType: 'staff',
            damageType: 'blunt',
            handSlot: 'both' as const,
            subtitle: 'Оружие мага · Катализатор Знаков',
            stats: `Урон: ${hero.baseDamage} (Дробящий) · ЛКМ: каст правой рукой · Срыв: -20%`,
            lore: 'Резной ясеневый посох. Удерживайте ЛКМ для заготовки и каста выбранного заклинания правой руки.',
            damageBonus: 0,
            penetration: 5,
            weight: 2.5,
            catalyst: true,
            passiveMishapReduction: 20,
            activeDamageMult: 1.3,
            activeCastTimeMult: 1.0,
          }
        : hero.id === 'archer'
        ? {
            id: 'start_bow',
            type: 'weapon',
            name: 'Охотничий лук',
            iconType: 'bow',
            damageType: 'pierce',
            handSlot: 'two_handed' as const,
            twoHanded: true,
            subtitle: 'Двуручное стрелковое оружие',
            stats: `Урон: ${hero.baseDamage + 14} (Колющий) · ЛКМ: натяжение и выстрел · Пробитие: 25%`,
            lore: 'Гибкий тисовый лук с тугой тетивой. Зажмите ЛКМ для натяжения и отпустите для точного выстрела.',
            damageBonus: 14,
            penetration: 25,
            weight: 2.2,
            catalyst: false,
          }
        : {
            id: 'start_sword',
            type: 'weapon',
            name: 'Ржавый меч',
            iconType: 'sword',
            damageType: 'slash',
            handSlot: 'both' as const,
            subtitle: 'Правая рука · Оружие ближнего боя',
            stats: `Урон: ${hero.baseDamage} (Рубящий) · Пробитие: 10%`,
            lore: 'Зазубренный клинок с пятнами ржавчины, найденный на входе в склеп.',
            damageBonus: 0,
            penetration: 10,
            weight: 4.5,
            catalyst: false,
          };

    const startOffHand: InventoryItem | null =
      hero.id === 'mage'
        ? {
            id: 'start_orb',
            type: 'focus',
            name: 'Сфера Хаоса',
            iconType: 'orb',
            catalystType: 'orb',
            handSlot: 'left_only' as const,
            subtitle: 'Левая рука · Магический фокус',
            stats: `Защита духа: +${hero.magicGuard} · ПКМ: каст левой рукой · Урон x1.6`,
            lore: 'Пульсирующий кристаллический шар, заключённый в латунную оправу. Удерживайте ПКМ для сотворения чар левой рукой.',
            magicGuardBonus: hero.magicGuard,
            catalyst: true,
            passiveMishapReduction: 15,
            activeDamageMult: 1.6,
            activeCastTimeMult: 1.0,
          }
        : hero.id === 'archer'
        ? null
        : {
            id: 'start_shield',
            type: 'shield',
            name: 'Окованный щит',
            iconType: 'shield',
            handSlot: 'left_only' as const,
            subtitle: 'Левая рука · Защитный щит',
            stats: 'Блок: 75% урона · Парирование при ПКМ',
            lore: 'Крепкий дубовый щит с железной оковкой. Позволяет парировать атаки.',
            blockStrength: 75,
            weight: 3.5,
            catalyst: false,
          };

    eng.mainHandItem = startMainHand;
    eng.offHandItem = startOffHand;
    setMainHandItem(startMainHand);
    setOffHandItem(startOffHand);
    renderer3dRef.current?.setEquippedItems(startMainHand, startOffHand);
    if (hero.id === 'mage') {
      renderer3dRef.current?.setStaffElementColor('#f97316');
    }

    // Initial Bag: Clean slots, starting gold directly in purse
    eng.gold = Math.max(eng.gold || 0, 35);
    const initialBag: (InventoryItem | null)[] = Array(15).fill(null);
    if (hero.id === 'archer') {
      initialBag[0] = {
        id: 'start_quiver',
        type: 'misc',
        name: 'Колчан стрел следопыта',
        iconType: 'quiver',
        subtitle: 'Колчан со стрелами',
        stats: 'Бесконечный боезапас охотничьих стрел',
        lore: 'Кожаный колчан с оперенными стрелами из ясеня и закаленной стали.',
        weight: 1.5,
      };
      initialBag[1] = {
        id: 'start_dagger',
        type: 'weapon',
        name: 'Охотничий кинжал',
        iconType: 'sword',
        damageType: 'pierce',
        handSlot: 'both' as const,
        subtitle: 'Оружие ближнего боя',
        stats: 'Урон: +8 (Колющий) · Пробитие: 20% · Быстрый взмах',
        lore: 'Костяная рукоять, острая как бритва сталь. Незаменим в рукопашной схватке.',
        damageBonus: 8,
        penetration: 20,
        weight: 1.2,
      };
    }
    eng.bagSlots = initialBag;
    setBagSlots(initialBag);

    setInventoryOpen(false);
    setGrimoireOpen(false);

    setHud({
      hp: eng.hp,
      maxHp: eng.maxHp,
      stamina: eng.stamina,
      maxStamina: eng.maxStamina,
      resonance: eng.resonance,
      magicGuard: eng.magicGuard,
      hasMagic: eng.hasMagic,
      level: 1,
      xp: 0,
      nextXp: 100,
      gold: 0,
      kills: 0,
      potions: 1,
      weaponName: eng.weaponName,
      weaponBonus: 0,
      weaponPenetration: eng.weaponPenetration,
      weaponWeight: eng.weaponWeight,
      shieldBlockStrength: eng.shieldBlockStrength,
      shieldBlockEfficiency: 0,
      shieldWeight: eng.shieldWeight,
      playerArmor: eng.playerArmor,
      armorHead: eng.armorHead,
      armorTorso: eng.armorTorso,
      armorArms: eng.armorArms,
      armorLegs: eng.armorLegs,
      staminaRegenMult: eng.staminaRegenMult,
      isBlocking: false,
      parryBonusReady: false,
      parryCooldown: 0,
      isParrying: false,
      isPowerChargingRH: false,
      powerChargePctRH: 0,
      isPowerChargingLH: false,
      powerChargePctLH: 0,
      playerStagger: 0,
      playerStunTimer: 0,
    });

    setGameState('PLAYING');
  }, []);

  const usePotion = useCallback(() => {
    const eng = engineRef.current;
    if (eng.potions <= 0 || eng.hp >= eng.maxHp) return;
    eng.potions -= 1;
    eng.hp = Math.min(eng.maxHp, eng.hp + 45);
    setHud((prev) => ({ ...prev, hp: eng.hp, potions: eng.potions }));
  }, []);

  const addXp = useCallback((amount: number) => {
    if (amount <= 0) return;
    const eng = engineRef.current;
    eng.xp += amount;
    let leveledUp = false;
    while (eng.xp >= eng.nextXp) {
      leveledUp = true;
      eng.level += 1;
      eng.xp -= eng.nextXp;
      eng.nextXp = Math.floor(eng.nextXp * 1.5);
      eng.maxHp += 20;
      eng.hp = eng.maxHp;
      eng.baseDamage += 4;
    }
    if (leveledUp) {
      setMishapBanner(`УРОВЕНЬ ПОВЫШЕН! Вы достигли ${eng.level} уровня! HP и сила увеличены!`);
      setTimeout(() => setMishapBanner(null), 3500);
    }
  }, []);

  const addXpRef = useRef(addXp);
  useEffect(() => { addXpRef.current = addXp; }, [addXp]);

  const killEnemy = useCallback((enemy: Enemy, source?: string) => {
    if (!enemy.alive) return;
    const eng = engineRef.current;
    enemy.alive = false;
    eng.kills += 1;

    if (enemy.kind === 'warden') {
      eng.wardenDefeated = true;
    }

    addXp(enemy.xp);
  }, [addXp]);

  const killEnemyRef = useRef(killEnemy);
  useEffect(() => { killEnemyRef.current = killEnemy; }, [killEnemy]);
  const handleEnemyKilledRef = killEnemyRef;

  const shootBow = useCallback(() => {
    const eng = engineRef.current;
    if (eng.playerStunTimer > 0 || eng.isBlocking) {
      eng.bow.state = 'idle';
      eng.bow.draw = 0;
      return;
    }

    const draw = Math.min(1.0, Math.max(0, eng.bow.draw));
    const minDraw = 0.2;
    if (draw < minDraw) {
      eng.bow.state = 'idle';
      eng.bow.draw = 0;
      return;
    }

    // Set recover state for 0.35s
    eng.bow.state = 'recover';
    eng.bow.recoverTimer = 0.35;
    eng.bow.draw = 0;

    // Damage formula:
    // (damageBonus экипированного лука + урон стрелы + eng.baseDamage) * (1 + skill/200) * draw^1.5 + sharpness
    const bowBonus = eng.mainHandItem?.damageBonus || eng.weaponBonus || 14;
    const arrowDamage = 12; // base arrow damage
    const skillLevel = 25 + eng.level * 5;
    const skillMult = 1 + skillLevel / 200;
    const sharpness = 0;

    const baseSum = bowBonus + arrowDamage + eng.baseDamage;
    const rawDmg = baseSum * skillMult * Math.pow(draw, 1.5) + sharpness;
    const dmg = Math.max(1, Math.floor(rawDmg));
    const pen = (eng.mainHandItem?.penetration || eng.weaponPenetration || 25) + Math.round(draw * 25);
    const isCrit = draw >= 0.95;

    // Speed = 90 * lerp(0.3, 1, draw)
    const speed = 90.0 * THREE.MathUtils.lerp(0.3, 1.0, draw);
    const gravityScale = 1.0;

    const renderer = renderer3dRef.current;
    if (!renderer) return;

    const camera = renderer.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Aim point: raycast from camera center to first obstacle/enemy, fallback 500m
    const aimPoint = renderer.getAimPoint(eng.enemies, 500.0);

    const muzzle = camera.position.clone().addScaledVector(forward, 0.38);
    muzzle.y -= 0.04;
    const dir = new THREE.Vector3().subVectors(aimPoint, muzzle).normalize();
    const velocity = dir.multiplyScalar(speed);

    renderer.spawnArrow(
      muzzle,
      velocity,
      gravityScale,
      dmg,
      pen,
      isCrit,
      (hitEnemy) => {
        eng.cameraShake = Math.min(0.65, (eng.cameraShake || 0) + 0.3);
        if (hitEnemy.hp <= 0) {
          killEnemyRef.current(hitEnemy, 'arrow');
        }
      }
    );
  }, []);

  const shootBowRef = useRef(shootBow);
  useEffect(() => { shootBowRef.current = shootBow; }, [shootBow]);

  const performAttack = useCallback(() => {
    const eng = engineRef.current;
    if (eng.swingTimer > 0 || eng.powerSwingTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.isBlocking || eng.parryAttemptTimer > 0 || eng.playerStunTimer > 0) return;
    if (eng.stamina < 12) {
      return;
    }

    eng.stamina = Math.max(0, eng.stamina - 15);
    eng.swingTimer = 0.01;
    eng.swingHitChecked = false;
  }, []);

  const performOffHandAttack = useCallback(() => {
    const eng = engineRef.current;
    if (eng.offHandSwingTimer > 0 || eng.powerSwingTimer > 0 || eng.swingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.isBlocking || eng.parryAttemptTimer > 0 || eng.playerStunTimer > 0) return;
    if (eng.stamina < 10) return;
    eng.stamina = Math.max(0, eng.stamina - 12);
    eng.offHandSwingTimer = 0.01;
    eng.offHandSwingHitChecked = false;
  }, []);

  const performOffHandAttackRef = useRef(performOffHandAttack);
  useEffect(() => { performOffHandAttackRef.current = performOffHandAttack; }, [performOffHandAttack]);

  const performParry = useCallback(() => {
    const eng = engineRef.current;
    if (eng.parryCooldownTimer > 0) return;
    if (eng.playerStunTimer > 0) return;
    if (eng.stamina < 20) return;
    if (eng.parryAttemptTimer > 0) return;
    // Cannot parry in the middle of weapon swing or charging
    const isSwinging = eng.swingTimer > 0 || eng.powerSwingTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.powerSwingCharging || eng.offHandPowerSwingCharging;
    if (isSwinging) return;

    eng.stamina = Math.max(0, eng.stamina - 20);
    eng.parryCooldownTimer = 1.2;

    const lh = eng.offHandItem;
    let parryWindow = 0.22;
    if (lh?.iconType === 'shield') {
      parryWindow = 0.40;
    } else if (lh?.type === 'weapon' && !lh?.catalyst) {
      parryWindow = 0.30;
    }
    eng.parryAttemptTimer = parryWindow;
  }, []);

  const performParryRef = useRef(performParry);
  useEffect(() => { performParryRef.current = performParry; }, [performParry]);

  const performPowerAttack = useCallback(() => {
    const eng = engineRef.current;
    if (eng.powerSwingTimer > 0 || eng.swingTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.isBlocking || eng.parryAttemptTimer > 0 || eng.playerStunTimer > 0) return;
    if (eng.stamina < 25) return;

    eng.stamina = Math.max(0, eng.stamina - 25);
    eng.powerSwingTimer = 0.01;
    eng.powerSwingHitChecked = false;
  }, []);

  const performPowerAttackRef = useRef(performPowerAttack);
  useEffect(() => { performPowerAttackRef.current = performPowerAttack; }, [performPowerAttack]);

  const performOffHandPowerAttack = useCallback(() => {
    const eng = engineRef.current;
    if (eng.offHandPowerSwingTimer > 0 || eng.swingTimer > 0 || eng.offHandSwingTimer > 0 || eng.powerSwingTimer > 0 || eng.isBlocking || eng.parryAttemptTimer > 0 || eng.playerStunTimer > 0) return;
    if (eng.stamina < 25) return;

    eng.stamina = Math.max(0, eng.stamina - 25);
    eng.offHandPowerSwingTimer = 0.01;
    eng.offHandPowerSwingHitChecked = false;
  }, []);

  const performOffHandPowerAttackRef = useRef(performOffHandPowerAttack);
  useEffect(() => { performOffHandPowerAttackRef.current = performOffHandPowerAttack; }, [performOffHandPowerAttack]);

  const fireCastSpell = useCallback((spellId: string | null, hand: 'right' | 'left') => {
    if (!spellId) return;
    const eng = engineRef.current;
    if (eng.playerStunTimer > 0) return;

    const catalyst = hand === 'right' ? eng.mainHandItem : eng.offHandItem;
    const isCatalyst = !!(catalyst?.catalyst || (hand === 'right' && eng.weaponName.toLowerCase().includes('посох')));
    if (!isCatalyst && !eng.hasMagic) {
      setMishapBanner(`В ${hand === 'right' ? 'правой' : 'левой'} руке нет магического катализатора!`);
      setTimeout(() => setMishapBanner(null), 2000);
      return;
    }

    if (eng.silenceTimer > 0) {
      setMishapBanner('Вы находитесь под действием немоты!');
      setTimeout(() => setMishapBanner(null), 1800);
      return;
    }

    const spell = ALL_SPELLS.find((s) => s.id === spellId);
    if (!spell) return;

    // Check cooldown
    if (eng.spellCooldowns[spell.id] && eng.spellCooldowns[spell.id] > 0) {
      return;
    }

    // Set cooldown and restart the 60-second inactivity timer!
    eng.spellCooldowns[spell.id] = spell.cooldown;
    eng.timeSinceLastCast = 0;

    // Catalyst buffs
    let damageMult = 1.0;
    if (eng.mainHandItem?.passiveDamageMult) damageMult *= eng.mainHandItem.passiveDamageMult;
    if (eng.offHandItem?.passiveDamageMult) damageMult *= eng.offHandItem.passiveDamageMult;
    if (catalyst?.activeDamageMult) damageMult *= catalyst.activeDamageMult;

    // Mishap passive reductions
    let mishapReduction = 0;
    if (eng.mainHandItem?.passiveMishapReduction) mishapReduction += eng.mainHandItem.passiveMishapReduction;
    if (eng.offHandItem?.passiveMishapReduction) mishapReduction += eng.offHandItem.passiveMishapReduction;

    const mishap = checkMagicMishap(eng.resonance, eng.magicGuard + Math.floor(mishapReduction / 2));

    if (mishap.isMishap) {
      renderer3dRef.current?.triggerMishapExplosion();
      eng.cameraShake = 1.2;
      setMishapBanner(`[d100: ${mishap.roll} <= ${mishap.threshold}%] ${mishap.message}`);
      setTimeout(() => setMishapBanner(null), 3000);

      if (mishap.effect === 'self_damage' && mishap.selfDamage) {
        eng.hp = Math.max(1, eng.hp - mishap.selfDamage);
        eng.hurtFlash = 0.8;
      } else if (mishap.effect === 'silence') {
        eng.silenceTimer = 2.5;
      } else if (mishap.effect === 'stagger') {
        eng.playerStagger = 100;
        eng.playerStunTimer = 1.4;
      } else if (mishap.effect === 'surge') {
        eng.hp = Math.max(1, eng.hp - 20);
        eng.hurtFlash = 1.0;
      }
    } else {
      eng.resonance = Math.min(100, eng.resonance + spell.resonance);
    }

    // Execute spell effect
    if (spell.heal) {
      eng.hp = Math.min(eng.maxHp, eng.hp + spell.heal);
      renderer3dRef.current?.triggerHealFlash();
    } else if (spell.damage && spell.speed > 0) {
      const finalDmg = Math.max(1, Math.floor(spell.damage * damageMult));
      renderer3dRef.current?.spawnMagicProjectile(
        spell.id,
        spell.color,
        spell.size,
        spell.speed,
        finalDmg,
        spell.element,
        (hitEnemy) => {
          killEnemyRef.current(hitEnemy, 'spell');
        }
      );
      if (hand === 'right') {
        renderer3dRef.current?.triggerStaffCastAnimation();
      }
    }
  }, []);

  const fireCastSpellRef = useRef(fireCastSpell);
  useEffect(() => {
    fireCastSpellRef.current = fireCastSpell;
  }, [fireCastSpell]);

  const startHandCast = useCallback((hand: 'right' | 'left') => {
    const eng = engineRef.current;
    if (eng.playerStunTimer > 0 || eng.silenceTimer > 0) return;
    const spellId = hand === 'right' ? eng.rhSpellId : eng.lhSpellId;
    if (!spellId) return;

    const spell = ALL_SPELLS.find((s) => s.id === spellId);
    if (!spell) return;

    if (eng.spellCooldowns[spell.id] && eng.spellCooldowns[spell.id] > 0) {
      return;
    }

    const catalyst = hand === 'right' ? eng.mainHandItem : eng.offHandItem;
    let castTimeMult = 1.0;
    if (eng.mainHandItem?.passiveCastTimeMult) castTimeMult *= eng.mainHandItem.passiveCastTimeMult;
    if (eng.offHandItem?.passiveCastTimeMult) castTimeMult *= eng.offHandItem.passiveCastTimeMult;
    if (catalyst?.activeCastTimeMult) castTimeMult *= catalyst.activeCastTimeMult;

    const totalTime = Math.max(0, spell.castTime * castTimeMult);

    if (hand === 'right') {
      eng.rhCasting = true;
      eng.rhCastElapsed = 0;
      eng.rhCastTotal = totalTime;
      renderer3dRef.current?.setStaffCharging(true);
      renderer3dRef.current?.setStaffElementColor(spell.color);
    } else {
      eng.lhCasting = true;
      eng.lhCastElapsed = 0;
      eng.lhCastTotal = totalTime;
      renderer3dRef.current?.setOrbElementColor(spell.color);
    }

    // If instant cast (castTime 0), fire immediately!
    if (totalTime <= 0) {
      fireCastSpellRef.current(spellId, hand);
      if (hand === 'right') {
        eng.rhCasting = false;
        eng.rhCastElapsed = 0;
        renderer3dRef.current?.setStaffCharging(false);
      } else {
        eng.lhCasting = false;
        eng.lhCastElapsed = 0;
      }
    }
  }, []);

  const startHandCastRef = useRef(startHandCast);
  useEffect(() => {
    startHandCastRef.current = startHandCast;
  }, [startHandCast]);


  const getQuests = useCallback((): VillageQuest[] => {
    const eng = engineRef.current;
    const earsCount = (eng.banditEars || 0) + (eng.bagSlots ? eng.bagSlots.filter((s) => s?.name === 'Ухо разбойника').length : 0);
    const liliesCount = (eng.moonLilies || 0) + (eng.bagSlots ? eng.bagSlots.filter((s) => s?.name === 'Лунная Лилия').length : 0);
    const hasOre = eng.hasStolenOre || (eng.bagSlots ? eng.bagSlots.some((s) => s?.name === 'Мешок со стальной рудой') : false);
    const hasAle = eng.hasDarkAle || (eng.bagSlots ? eng.bagSlots.some((s) => s?.name === 'Кружка тёмного эля') : false);

    return [
      {
        id: 'bandits',
        title: 'Угроза Серому Долу',
        giver: 'Старейшина Марк',
        giverRole: 'Старейшина деревни',
        status: eng.questBandits,
        objective: `Уничтожить бандитов и собрать уши (${Math.min(4, earsCount)}/4)`,
        current: Math.min(4, earsCount),
        target: 4,
        description: 'Шайка лесных разбойников обосновалась в лагере на восточной поляне и грабит окрестные фермы. Марк просит очистить лагерь и принести 4 трофейных уха.',
        rewardText: '+250 золота, +200 опыта, Фамильное кольцо защиты (+15 брони)',
      },
      {
        id: 'crypt',
        title: 'Тайны Склепа Пепла',
        giver: 'Старейшина Марк',
        giverRole: 'Старейшина деревни',
        status: eng.questCrypt,
        objective: eng.wardenDefeated ? 'Смотритель повержен! Доложите Марку' : 'Победить Смотрителя Склепа в северном зале (0/1)',
        current: eng.wardenDefeated ? 1 : 0,
        target: 1,
        description: 'Древний склеп на севере хранит проклятого Смотрителя Склепа и забытый гримуар древних магов. Старейшина просит одолеть чудовище и открыть путь в тайные залы.',
        rewardText: '+300 золота, +350 опыта, Редкий свиток магии',
      },
      {
        id: 'ore',
        title: 'Украденная руда кузнеца',
        giver: 'Кузнец Торин',
        giverRole: 'Оружейный кузнец',
        status: eng.questOre,
        objective: hasOre ? 'Руда найдена! Отнесите её Торину' : 'Найти мешок со стальной рудой в лагере бандитов (0/1)',
        current: hasOre ? 1 : 0,
        target: 1,
        description: 'Бандиты перехватили караван из горных шахт и похитили драгоценную стальную руду Торина. Без неё кузница не может выковать оружие для защиты деревни.',
        rewardText: 'Заточка оружия (+8 к урону текущего клинка) + 120 золота',
      },
      {
        id: 'lilies',
        title: 'Лунные Лилии для исцеления',
        giver: 'Травница Изольда',
        giverRole: 'Знахарка и алхимик',
        status: eng.questLilies,
        objective: `Собрать Лунные Лилии в тайной лесной лощине (${Math.min(3, liliesCount)}/3)`,
        current: Math.min(3, liliesCount),
        target: 3,
        description: 'Редкие Лунные Лилии цветут лишь во мраке тайной поляны к северо-востоку от развилки. Травнице Изольде нужны 3 цветка для приготовления сильнейших лечебных эликсиров.',
        rewardText: '3x Больших Зелья Исцеления (+80 HP) + 150 опыта',
      },
      {
        id: 'ale',
        title: 'Освежающий эль для стража',
        giver: 'Страж Ольгерд',
        giverRole: 'Караульный у ворот',
        status: eng.questAle,
        objective: hasAle ? 'Эль куплен! Отнесите кружку Ольгерду' : 'Купить кружку тёмного эля у трактирщика Брана (0/1)',
        current: hasAle ? 1 : 0,
        target: 1,
        description: 'Страж Ольгерд несёт бессменную службу на северном посту у ворот деревни. Жара и пыль утомили воина, и он просит принести ему кружку крепкого эля из таверны «Пьяный Гоблин».',
        rewardText: 'Старый ключ от тайного склада + 60 золота + боевой совет',
      },
    ];
  }, []);

  const openNpcDialog = useCallback((npcId: string, npcItem?: WorldItem) => {
    document.exitPointerLock?.();
    const eng = engineRef.current;
    const earsCount = (eng.banditEars || 0) + (eng.bagSlots ? eng.bagSlots.filter((s) => s?.name === 'Ухо разбойника').length : 0);
    const liliesCount = (eng.moonLilies || 0) + (eng.bagSlots ? eng.bagSlots.filter((s) => s?.name === 'Лунная Лилия').length : 0);
    const hasOre = eng.hasStolenOre || (eng.bagSlots ? eng.bagSlots.some((s) => s?.name === 'Мешок со стальной рудой') : false);
    const hasAle = eng.hasDarkAle || (eng.bagSlots ? eng.bagSlots.some((s) => s?.name === 'Кружка тёмного эля') : false);

    if (npcId === 'elder_mark') {
      const choices: DialogChoice[] = [];
      // Bandit quest
      if (eng.questBandits === 'available') {
        choices.push({
          text: '📜 [Квест] «Я готов очистить лагерь разбойников на востоке»',
          isQuest: true,
          action: () => {
            eng.questBandits = 'active';
            eng.banditQuestState = 'active';
            setMishapBanner('Принят квест: «Угроза Серому Долу»! Уничтожьте бандитов и принесите 4 уха.');
            openNpcDialog('elder_mark', npcItem);
          },
        });
      } else if (eng.questBandits === 'active') {
        if (earsCount >= 4) {
          choices.push({
            text: `⚔️ [Сдать квест] «Вот 4 уха разбойников, как ты просил!» (${earsCount}/4)`,
            isQuest: true,
            action: () => {
              eng.questBandits = 'completed';
              eng.banditQuestState = 'completed';
              eng.gold += 250;
              addXp(200);
              eng.banditEars = 0;
              setBagSlots((prev) => prev.map((s) => (s?.name === 'Ухо разбойника' ? null : s)));
              // Reward ring
              const ring: InventoryItem = {
                id: 'reward_guard_ring',
                type: 'armor',
                name: 'Кольцо Стойкости Дола',
                iconType: 'armor',
                subtitle: 'Драгоценный оберег · В сумке',
                stats: 'Защита: +15 ко всем сопротивлениям',
                lore: 'Фамильное кольцо старейшины, благословленное хранителями древнего леса.',
                weight: 0.2,
                defenseResists: { slash: 0.15, blunt: 0.15, pierce: 0.15 },
              };
              setBagSlots((prev) => [...prev, ring]);
              setMishapBanner('Квест выполнен: «Угроза Серому Долу»! Получено: +250 золота, +200 опыта, Кольцо Стойкости!');
              openNpcDialog('elder_mark', npcItem);
            },
          });
        } else {
          choices.push({
            text: `«Я всё ещё выслеживаю бандитов (собрано ушей: ${earsCount}/4)»`,
            action: () => {
              setMishapBanner('Марк: «Их лагерь к востоку по лесной тропе. Будь осторожен, их атаман свиреп!»');
            },
          });
        }
      }

      // Crypt quest
      if (eng.questCrypt === 'available') {
        if (eng.wardenDefeated) {
          choices.push({
            text: '💀 [Триумф] «Смотритель Склепа повержен мной, а его ключ у меня!»',
            isQuest: true,
            action: () => {
              eng.questCrypt = 'completed';
              eng.gold += 300;
              addXp(350);
              setMishapBanner('★ ВЕЛИКАЯ ПОБЕДА! Смотритель Склепа повержен! Серый Дол спасен! ★');
              setActiveDialog(null);
              document.exitPointerLock?.();
              setTimeout(() => {
                setGameState('VICTORY');
              }, 1200);
            },
          });
        } else {
          choices.push({
            text: '📜 [Квест] «Что за тайны сокрыты в Склепе Пепла на севере?»',
            isQuest: true,
            action: () => {
              eng.questCrypt = 'active';
              setMishapBanner('Принят квест: «Тайны Склепа Пепла»! Победите Смотрителя Склепа.');
              openNpcDialog('elder_mark', npcItem);
            },
          });
        }
      } else if (eng.questCrypt === 'active') {
        if (eng.wardenDefeated) {
          choices.push({
            text: '💀 [Сдать квест] «Смотритель Склепа повержен, а его ключ у меня!»',
            isQuest: true,
            action: () => {
              eng.questCrypt = 'completed';
              eng.gold += 300;
              addXp(350);
              setMishapBanner('★ ВЕЛИКАЯ ПОБЕДА! Квест «Тайны Склепа Пепла» выполнен! Смотритель повержен! ★');
              setActiveDialog(null);
              document.exitPointerLock?.();
              setTimeout(() => {
                setGameState('VICTORY');
              }, 1200);
            },
          });
        }
      }

      choices.push({
        text: '«Расскажи о деревне Серый Дол и здешних жителях»',
        action: () => {
          setActiveDialog({
            npcId: 'elder_mark',
            npcName: 'Старейшина Марк',
            npcRole: 'Старейшина деревни',
            speech: 'Серый Дол основан сотню лет назад на краю Забытого Леса. У нас есть умелый кузнец Торин, торговец Гус, добрая знахарка Изольда и весёлый трактирщик Бран. Но тьма из склепа и разбойники не дают нам покоя...',
            choices: [
              { text: '«Спасибо за рассказ, старейшина.»', action: () => openNpcDialog('elder_mark', npcItem) },
            ],
          });
        },
      });

      choices.push({
        text: '«До встречи, старейшина.»',
        action: () => setActiveDialog(null),
      });

      setActiveDialog({
        npcId: 'elder_mark',
        npcName: 'Старейшина Марк',
        npcRole: 'Старейшина деревни',
        speech: eng.questBandits === 'completed'
          ? 'Хвала Небесам и твоей доблести, герой! Бандиты больше не смеют тревожить жителей Серого Дола.'
          : 'Приветствую тебя, путник. Наша деревня переживает тёмные времена. Если у тебя есть храбрость и верный клинок — нам очень нужна твоя помощь!',
        choices,
      });
    } else if (npcId === 'merchant_gus') {
      const choices: DialogChoice[] = [
        {
          text: '🧪 Купить Зелье Исцеления (+45 HP) — 40 золотых',
          action: () => {
            if (eng.gold >= 40) {
              eng.gold -= 40;
              eng.potions += 1;
              setMishapBanner('Куплено Зелье Исцеления (+45 HP)! Оставшееся золото: ' + eng.gold);
            } else {
              setMishapBanner('Недостаточно золота! Нужно 40 монет.');
            }
          },
        },
        {
          text: '⚡ Купить Эликсир Выносливости (+100 Stamina) — 30 золотых',
          action: () => {
            if (eng.gold >= 30) {
              eng.gold -= 30;
              eng.stamina = eng.maxStamina;
              setMishapBanner('Выносливость полностью восстановлена! Оставшееся золото: ' + eng.gold);
            } else {
              setMishapBanner('Недостаточно золота! Нужно 30 монет.');
            }
          },
        },
        {
          text: '«Какие слухи доходят до твоей лавки?»',
          action: () => {
            setActiveDialog({
              npcId: 'merchant_gus',
              npcName: 'Торговец Гус',
              npcRole: 'Купец и бакалейщик',
              speech: 'Шепчутся, что на тайной лесной поляне по ночам распускаются лазурные Лунные Лилии. А ещё караван Торина с горной рудой перехватили головорезы... Жаль мастера Торина, без руды его кузница простаивает.',
              choices: [
                { text: '«Интересно, спасибо за наводку!»', action: () => openNpcDialog('merchant_gus', npcItem) },
              ],
            });
          },
        },
        {
          text: '«Я просто осматриваюсь.»',
          action: () => setActiveDialog(null),
        },
      ];

      setActiveDialog({
        npcId: 'merchant_gus',
        npcName: 'Торговец Гус',
        npcRole: 'Купец и бакалейщик',
        speech: 'Заходи, путник! В лавке Гуса лучший товар в этих глухих краях. Золото не держи в кошеле — оно должно работать на твою безопасность!',
        choices,
      });
    } else if (npcId === 'blacksmith_torin') {
      const choices: DialogChoice[] = [];

      // Stolen Ore quest
      if (eng.questOre === 'available') {
        choices.push({
          text: '📜 [Квест] «Нужна ли тебе помощь в кузнице, мастер?»',
          isQuest: true,
          action: () => {
            eng.questOre = 'active';
            setMishapBanner('Принят квест: «Украденная руда кузнеца»! Отыщите руду в лагере бандитов.');
            openNpcDialog('blacksmith_torin', npcItem);
          },
        });
      } else if (eng.questOre === 'active') {
        if (hasOre) {
          choices.push({
            text: '⚒️ [Сдать квест] «Я вернул твой мешок с горной стальной рудой!»',
            isQuest: true,
            action: () => {
              eng.questOre = 'completed';
              eng.hasStolenOre = false;
              eng.gold += 120;
              eng.weaponBonus += 8;
              setBagSlots((prev) => prev.map((s) => (s?.name === 'Мешок со стальной рудой' ? null : s)));
              setMishapBanner('Квест выполнен: «Украденная руда»! Оружие заточено (+8 к урону), получено +120 золота!');
              openNpcDialog('blacksmith_torin', npcItem);
            },
          });
        } else {
          choices.push({
            text: '«Я всё ещё ищу твою руду в лагере разбойников»',
            action: () => {
              setMishapBanner('Торин: «Ищи у них возле костра или в сундуках. Без этой руды кузница как без рук!»');
            },
          });
        }
      }

      choices.push({
        text: '🗡️ Заточить текущее оружие на бруске (+5 урона) — 75 золотых',
        action: () => {
          if (eng.gold >= 75) {
            eng.gold -= 75;
            eng.weaponBonus += 5;
            setMishapBanner('Торин отточил лезвие вашего оружия до бритвенной остроты (+5 урона)!');
          } else {
            setMishapBanner('Недостаточно монет! Заточка стоит 75 золота.');
          }
        },
      });

      choices.push({
        text: '«Какой доспех лучше против бандитов и чудовищ?»',
        action: () => {
          setActiveDialog({
            npcId: 'blacksmith_torin',
            npcName: 'Кузнец Торин',
            npcRole: 'Оружейный кузнец',
            speech: 'Запомни, воин: от тесаков бандитов спасает защита от рубящего урона (Кольчуга и Латный нагрудник). Против скелетов с дубинами нужен тяжёлый шлем от дробящего урона, а от крысиных клыков — кольчужные поножи.',
            choices: [
              { text: '«Спасибо за мудрый совет, кузнец.»', action: () => openNpcDialog('blacksmith_torin', npcItem) },
            ],
          });
        },
      });

      choices.push({
        text: '«Удачи у наковальни, Торин.»',
        action: () => setActiveDialog(null),
      });

      setActiveDialog({
        npcId: 'blacksmith_torin',
        npcName: 'Кузнец Торин',
        npcRole: 'Оружейный кузнец',
        speech: eng.questOre === 'completed'
          ? 'Благодарю за руду, друг! Теперь мой горн полыхает день и ночь. Если клинок затупится — сразу ко мне!'
          : 'Здорово, путник! Пока в лесах бродят разбойники, моё ремесло в цене. Хороший стальной клинок — надёжнее любых молитв.',
        choices,
      });
    } else if (npcId === 'innkeeper_bran') {
      const choices: DialogChoice[] = [
        {
          text: '🍺 Купить кружку крепкого тёмного эля — 15 золотых',
          action: () => {
            if (eng.gold >= 15) {
              eng.gold -= 15;
              eng.hasDarkAle = true;
              const aleItem: InventoryItem = {
                id: 'dark_ale_' + Date.now(),
                type: 'misc',
                name: 'Кружка тёмного эля',
                iconType: 'ale',
                subtitle: 'Пенный напиток · В сумке',
                stats: 'Для стража Ольгерда',
                lore: 'Кружка отборного тёмного эля из погреба таверны «Пьяный Гоблин». Освежает в самый знойный день.',
                weight: 1.0,
              };
              setBagSlots((prev) => [...prev, aleItem]);
              setMishapBanner('Куплена Кружка тёмного эля! Отнесите её стражу Ольгерду у ворот.');
            } else {
              setMishapBanner('Недостаточно монет! Кружка эля стоит 15 золотых.');
            }
          },
        },
        {
          text: '🍲 Сытная гоблинская похлёбка (+50 HP и бодрость) — 20 золотых',
          action: () => {
            if (eng.gold >= 20) {
              eng.gold -= 20;
              eng.hp = Math.min(eng.maxHp, eng.hp + 50);
              eng.stamina = eng.maxStamina;
              setMishapBanner('Вы отведали горячей наваристой похлёбки (+50 HP)! Силы восстановлены.');
            } else {
              setMishapBanner('Недостаточно монет! Похлёбка стоит 20 золотых.');
            }
          },
        },
        {
          text: '«Какие трактирные байки разносят путники?»',
          action: () => {
            setActiveDialog({
              npcId: 'innkeeper_bran',
              npcName: 'Трактирщик Бран',
              npcRole: 'Хозяин таверны «Пьяный Гоблин»',
              speech: 'Один пьяный наёмник божился, что к востоку от склепа между вековыми елями есть тайный проход в сказочную лощину. Говорит, там светятся редчайшие цветы — знахарка Изольда за них душу готова отдать!',
              choices: [
                { text: '«Любопытная история... Спасибо, Бран!»', action: () => openNpcDialog('innkeeper_bran', npcItem) },
              ],
            });
          },
        },
        {
          text: '«Пойду подышу свежим воздухом.»',
          action: () => setActiveDialog(null),
        },
      ];

      setActiveDialog({
        npcId: 'innkeeper_bran',
        npcName: 'Трактирщик Бран',
        npcRole: 'Хозяин таверны «Пьяный Гоблин»',
        speech: 'Добро пожаловать в таверну «Пьяный Гоблин»! Тёплый очаг, добрый эль и задушевная беседа для любого странника!',
        choices,
      });
    } else if (npcId === 'herbalist_isolda') {
      const choices: DialogChoice[] = [];

      // Moon Lilies quest
      if (eng.questLilies === 'available') {
        choices.push({
          text: '📜 [Квест] «Тебе нужны травы для приготовления настоев?»',
          isQuest: true,
          action: () => {
            eng.questLilies = 'active';
            setMishapBanner('Принят квест: «Лунные Лилии для исцеления»! Отыщите 3 цветка в лесной лощине.');
            openNpcDialog('herbalist_isolda', npcItem);
          },
        });
      } else if (eng.questLilies === 'active') {
        if (liliesCount >= 3) {
          choices.push({
            text: `🌸 [Сдать квест] «Я нашёл 3 цветка Лунной Лилии в чаще леса!» (${liliesCount}/3)`,
            isQuest: true,
            action: () => {
              eng.questLilies = 'completed';
              eng.moonLilies = 0;
              addXp(150);
              eng.potions += 3;
              setBagSlots((prev) => prev.map((s) => (s?.name === 'Лунная Лилия' ? null : s)));
              setMishapBanner('Квест выполнен: «Лунные Лилии»! Получено: 3x Зелья Исцеления (+45 HP) и +150 опыта!');
              openNpcDialog('herbalist_isolda', npcItem);
            },
          });
        } else {
          choices.push({
            text: `«Я всё ещё ищу цветы в лесу (собрано: ${liliesCount}/3)»`,
            action: () => {
              setMishapBanner('Изольда: «Ищи тайную поляну к северо-востоку от развилки. Их лазурное сияние видно издалека!»');
            },
          });
        }
      }

      choices.push({
        text: '🧪 Купить Большое Зелье Исцеления (+80 HP) — 65 золотых',
        action: () => {
          if (eng.gold >= 65) {
            eng.gold -= 65;
            eng.hp = Math.min(eng.maxHp, eng.hp + 80);
            setMishapBanner('Вы выпили целебный настой травницы (+80 HP)!');
          } else {
            setMishapBanner('Недостаточно монет! Настой стоит 65 золота.');
          }
        },
      });

      choices.push({
        text: '«Береги свой сад, Изольда.»',
        action: () => setActiveDialog(null),
      });

      setActiveDialog({
        npcId: 'herbalist_isolda',
        npcName: 'Травница Изольда',
        npcRole: 'Знахарка и алхимик',
        speech: eng.questLilies === 'completed'
          ? 'Благословенны твои руки, путник. С этими лепестками Лунных Лилий я сварила снадобья, способные вытащить раненого из объятий смерти.'
          : 'Здравствуй, дитя ветров. Я чувствую аромат лесных трав и горькую гарь склепа. Чем могу помочь твоей душе и телу?',
        choices,
      });
    } else if (npcId === 'hunter_ragnar') {
      const choices: DialogChoice[] = [
        {
          text: '🏹 «Рагнар, научи секретам меткой стрельбы из лука!»',
          action: () => {
            setActiveDialog({
              npcId: 'hunter_ragnar',
              npcName: 'Охотник Рагнар',
              npcRole: 'Следопыт и зверолов',
              speech: 'Стрельба — искусство терпения. Зажми ЛКМ: лук поднимется к глазу, дыхание замрёт, а зум приблизит цель. Полное натяжение пробивает кольчуги и наносит огромный критический урон! А если кончатся силы — помни про охотничий кинжал в сумке.',
              choices: [
                { text: '«Спасибо за науку, мастер!»', action: () => openNpcDialog('hunter_ragnar', npcItem) },
              ],
            });
          },
        },
        {
          text: '🎯 «У тебя найдётся запасной лук для похода?»',
          action: () => {
            setActiveDialog({
              npcId: 'hunter_ragnar',
              npcName: 'Охотник Рагнар',
              npcRole: 'Следопыт и зверолов',
              speech: 'Я оставил запасной тисовый лук на столике у стрелковой мишени прямо за моей избой. Можешь забрать его, если потерял свой!',
              choices: [
                { text: '«Благодарю, Рагнар!»', action: () => openNpcDialog('hunter_ragnar', npcItem) },
              ],
            });
          },
        },
        {
          text: '🏹 «Как выжить в схватке с лесными разбойниками?»',
          action: () => {
            setActiveDialog({
              npcId: 'hunter_ragnar',
              npcName: 'Охотник Рагнар',
              npcRole: 'Следопыт и зверолов',
              speech: 'Бандиты быстры, но нетерпеливы. Подними щит на ПКМ или Shift прямо перед их ударом — идеальный блок оглушит их на пару секунд! Пока бандит шатается, проведи усиленный силовой выпад!',
              choices: [
                { text: '«Ценный урок, спасибо!»', action: () => openNpcDialog('hunter_ragnar', npcItem) },
              ],
            });
          },
        },
        {
          text: '🌲 «Где найти логово главаря шайки?»',
          action: () => {
            setActiveDialog({
              npcId: 'hunter_ragnar',
              npcName: 'Охотник Рагнар',
              npcRole: 'Следопыт и зверолов',
              speech: 'Иди на восток от деревянного указателя на развилке. Дорога петляет меж вековых сосен и выходит на лагерь с большим костром. Там их атаман прячет награбленное в кованом сундуке.',
              choices: [
                { text: '«Я найду их.»', action: () => openNpcDialog('hunter_ragnar', npcItem) },
              ],
            });
          },
        },
        {
          text: '«Удачной охоты, Рагнар.»',
          action: () => setActiveDialog(null),
        },
      ];

      setActiveDialog({
        npcId: 'hunter_ragnar',
        npcName: 'Охотник Рагнар',
        npcRole: 'Следопыт и зверолов',
        speech: 'Тише ступай... Лес слышит дыхание каждого зверя и шорох каждой ветки. Если ищешь бандитов — держи тетиву натянутой.',
        choices,
      });
    } else if (npcId === 'guard_olgerd') {
      const choices: DialogChoice[] = [];

      // Dark Ale quest
      if (eng.questAle === 'available') {
        choices.push({
          text: '📜 [Квест] «Тяжело стоять на бессменном посту?»',
          isQuest: true,
          action: () => {
            eng.questAle = 'active';
            setMishapBanner('Принят квест: «Освежающий эль для стража»! Купите кружку тёмного эля у Брана.');
            openNpcDialog('guard_olgerd', npcItem);
          },
        });
      } else if (eng.questAle === 'active') {
        if (hasAle) {
          choices.push({
            text: '🍺 [Сдать квест] «Вот кружка холодного тёмного эля от Брана!»',
            isQuest: true,
            action: () => {
              eng.questAle = 'completed';
              eng.hasDarkAle = false;
              eng.gold += 60;
              addXp(100);
              setBagSlots((prev) => prev.map((s) => (s?.name === 'Кружка тёмного эля' ? null : s)));
              setMishapBanner('Квест выполнен: «Освежающий эль для стража»! Получено: +60 золота, +100 опыта!');
              openNpcDialog('guard_olgerd', npcItem);
            },
          });
        } else {
          choices.push({
            text: '«Я скоро принесу тебе кружку эля из таверны»',
            action: () => {
              setMishapBanner('Ольгерд: «Буду премного благодарен! Таверна Брана прямо у входа в деревню.»');
            },
          });
        }
      }

      choices.push({
        text: '«Какова обстановка у ворот Серого Дола?»',
        action: () => {
          setActiveDialog({
            npcId: 'guard_olgerd',
            npcName: 'Страж Ольгерд',
            npcRole: 'Караульный у ворот',
            speech: 'Пока я на страже, ни одна тварь из склепа и ни один бандит не проскочит за частокол. Но если выходишь в лес — держи оружие наготове, путник!',
            choices: [
              { text: '«Благодарю за бдительность, страж.»', action: () => openNpcDialog('guard_olgerd', npcItem) },
            ],
          });
        },
      });

      choices.push({
        text: '«Служи верно, Ольгерд.»',
        action: () => setActiveDialog(null),
      });

      setActiveDialog({
        npcId: 'guard_olgerd',
        npcName: 'Страж Ольгерд',
        npcRole: 'Караульный у ворот',
        speech: eng.questAle === 'completed'
          ? 'Ах, какой эль! Спасибо тебе от всего сердца, воин. Теперь я готов стоять на страже хоть до самого утра!'
          : 'Стой, путник! Серый Дол под защитой стражи. Входи с добром или убирайся восвояси!',
        choices,
      });
    }
  }, [setBagSlots]);

  // Input listeners
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      engineRef.current.keys.add(code);

      if (code === 'KeyJ') {
        setJournalOpen((prev) => {
          const next = !prev;
          if (next) document.exitPointerLock?.();
          return next;
        });
      }
      if (code === 'Escape') {
        setActiveDialog(null);
        setJournalOpen(false);
        setNoticeBoardOpen(false);
      }
      if (code === 'KeyP') {
        setPixelFilterEnabled((enabled) => !enabled);
      }
      if (code === 'KeyI') {
        setInventoryOpen((prev) => {
          const next = !prev;
          if (next) document.exitPointerLock?.();
          return next;
        });
      }
      if (code === 'KeyG') {
        if (engineRef.current.hasMagic) {
          setGrimoireOpen((prev) => {
            const next = !prev;
            if (next) document.exitPointerLock?.();
            return next;
          });
        }
      }
      if (code === 'KeyM') {
        engineRef.current.isMapOpen = !engineRef.current.isMapOpen;
      }

      // Quick-assign & cast spell slots 1..5 (Normal = Right hand [LMB], Shift = Left hand [RMB])
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(code)) {
        const slotIdx = parseInt(code.replace('Digit', ''), 10) - 1;
        setSelectedSpellSlot(slotIdx);
        engineRef.current.selectedSpellSlot = slotIdx;
        const spellList = engineRef.current.assignedSpellIds || assignedSpellIds || ['spark', 'frost_glance', 'fireball', 'minor_heal', null];
        const spellId = spellList[slotIdx];
        const spell = ALL_SPELLS.find((s) => s.id === spellId);

        if (e.shiftKey) {
          // Assign to LEFT HAND (RMB)
          setLhSpellId(spellId);
          engineRef.current.lhSpellId = spellId;
          if (spell) {
            renderer3dRef.current?.setOrbElementColor(spell.color);
          }
        } else {
          // Assign to RIGHT HAND (LMB)
          setRhSpellId(spellId);
          engineRef.current.rhSpellId = spellId;
          if (spell) {
            renderer3dRef.current?.setStaffElementColor(spell.color);
          }
        }
      }
      if (code === 'KeyQ') {
        const eng = engineRef.current;
        if (eng.potions > 0 && eng.hp < eng.maxHp) {
          eng.potions -= 1;
          eng.hp = Math.min(eng.maxHp, eng.hp + 45);
          renderer3dRef.current?.triggerHealFlash();
        }
      }
      if (code === 'KeyE') {
        const eng = engineRef.current;
        const target = interactionTargetRef.current;
        const renderer3d = renderer3dRef.current;
        if (target && renderer3d) {
          if (target.type === 'chest' && target.item) {
            target.item.opened = true;
            renderer3d.triggerChestSparks(target.item.x, target.item.y);
          } else if (target.type === 'chest_potion' && target.item) {
            target.item.hasPotion = false;
            eng.potions += 1;
            renderer3d.triggerPotionPickupSparks(target.item.x, target.item.y);
            if (!target.item.hasGold) {
              target.item.collected = true;
            }
          } else if (target.type === 'chest_gold' && target.item) {
            target.item.hasGold = false;
            const amount = target.item.goldAmount || (35 + Math.floor(Math.random() * 40));
            eng.gold += amount;
            renderer3d.triggerChestSparks(target.item.x, target.item.y);
            if (!target.item.hasPotion) {
              target.item.collected = true;
            }
          } else if (target.type === 'ground_item' && target.item) {
            target.item.collected = true;
            renderer3d.triggerHitSparks(target.item.x, target.item.y, true);

            // Put into first free bag slot instead of auto-equipping!
            let newItem: InventoryItem;
            if (target.item.kind === 'key') {
              newItem = {
                id: `ground_key_${target.item.id}`,
                type: 'misc',
                name: target.item.name || 'Ключ Смотрителя',
                iconType: 'key',
                subtitle: 'Сюжетный предмет · В сумке',
                stats: 'Открывает врата склепа в Древний Лес',
                lore: 'Тяжелый кованый ключ с печатью хранителя склепа. Отпирает массивные дубовые врата наружу.',
              };
            } else if (target.item.kind === 'two_handed') {
              newItem = {
                id: `ground_2h_${target.item.id}`,
                type: 'weapon',
                name: target.item.name || 'Цвайхендер Смотрителя',
                iconType: 'two_handed',
                handSlot: 'two_handed' as const,
                twoHanded: true,
                damageType: 'slash',
                subtitle: 'Двуручный меч · Занимает обе руки',
                stats: 'Урон: +28 · Пробитие: 35% · Силовая: смаш обеими руками (x2.5)',
                lore: 'Тяжелый полутораручный цвайхендер с парирующими кольцами. Требует обе руки для хвата.',
                damageBonus: 28,
                penetration: 35,
                weight: 8.5,
                catalyst: false,
              };
            } else if (target.item.kind === 'armor') {
              const slot = target.item.armorSlot || 'torso';
              if (slot === 'head') {
                newItem = {
                  id: `ground_head_${target.item.id}`,
                  type: 'armor',
                  name: target.item.name || 'Стальной шлем',
                  iconType: 'armor',
                  armorSlot: 'head',
                  subtitle: 'Защита головы',
                  stats: 'Защита: 35% руб · 45% дроб · 20% кол',
                  lore: 'Кованый шлем. Защищает голову от сокрушительных ударов сверху.',
                  defenseResists: { slash: 0.35, blunt: 0.45, pierce: 0.20 },
                };
              } else if (slot === 'arms') {
                newItem = {
                  id: `ground_arms_${target.item.id}`,
                  type: 'armor',
                  name: target.item.name || 'Стальные наручи',
                  iconType: 'armor',
                  armorSlot: 'arms',
                  subtitle: 'Защита рук',
                  stats: 'Защита: 30% руб · 20% дроб · 20% кол',
                  lore: 'Наручи для защиты конечностей.',
                  defenseResists: { slash: 0.30, blunt: 0.20, pierce: 0.20 },
                };
              } else if (slot === 'legs') {
                newItem = {
                  id: `ground_legs_${target.item.id}`,
                  type: 'armor',
                  name: target.item.name || 'Стальные поножи',
                  iconType: 'armor',
                  armorSlot: 'legs',
                  subtitle: 'Защита ног',
                  stats: 'Защита: 30% руб · 25% дроб · 20% кол',
                  lore: 'Поножи с наколенниками.',
                  defenseResists: { slash: 0.30, blunt: 0.25, pierce: 0.20 },
                };
              } else {
                newItem = {
                  id: `ground_torso_${target.item.id}`,
                  type: 'armor',
                  name: target.item.name || 'Латная кираса',
                  iconType: 'armor',
                  armorSlot: 'torso',
                  subtitle: 'Защита корпуса (Торс)',
                  stats: 'Защита: 55% руб · 40% дроб · 30% кол',
                  lore: 'Монолитный нагрудник. Анатомические сочленения в шее и подмышках остаются уязвимыми!',
                  defenseResists: { slash: 0.55, blunt: 0.40, pierce: 0.30 },
                };
              }
            } else if (target.item.kind === 'gold') {
              const amount = target.item.goldAmount || 15;
              eng.gold += amount;
              target.item.collected = true;
              renderer3d.triggerChestSparks(target.item.x, target.item.y);
              setMishapBanner(`Подобран кошель с золотом (+${amount} монет)!`);
              setTimeout(() => setMishapBanner(null), 2500);
              return;
            } else if (target.item.kind === 'potion') {
              eng.potions += 1;
              setMishapBanner('Подобрано Зелье Исцеления (+45 HP)!');
              setTimeout(() => setMishapBanner(null), 2500);
              return;
            } else if (target.item.kind === 'flower') {
              eng.moonLilies = (eng.moonLilies || 0) + 1;
              newItem = {
                id: `ground_flower_${target.item.id}`,
                type: 'misc',
                name: 'Лунная Лилия',
                iconType: 'flower',
                subtitle: 'Редкий алхимический цветок',
                stats: 'Для травницы Изольды',
                lore: 'Лазурный светящийся цветок, благоухающий ночной свежестью.',
                weight: 0.1,
              };
            } else if (target.item.kind === 'ore') {
              eng.hasStolenOre = true;
              newItem = {
                id: `ground_ore_${target.item.id}`,
                type: 'misc',
                name: 'Мешок со стальной рудой',
                iconType: 'ore',
                subtitle: 'Украденная руда кузнеца',
                stats: 'Для кузнеца Торина',
                lore: 'Тяжелый мешок высококачественной горной руды, отбитый у разбойников.',
                weight: 4.0,
              };
            } else if (target.item.kind === 'ear') {
              eng.banditEars = (eng.banditEars || 0) + 1;
              newItem = {
                id: `ground_ear_${target.item.id}`,
                type: 'misc',
                name: 'Ухо разбойника',
                iconType: 'ear',
                subtitle: 'Квестовый трофей',
                stats: 'Ухо главаря разбойников (для Старейшины)',
                lore: 'Окровавленное ухо бандита. Доказательство выполнения поручения Старейшины Марка.',
              };
            } else if (target.item.kind === 'sword' || target.item.kind === 'weapon') {
              const isBow = target.item.name?.toLowerCase().includes('лук');
              newItem = isBow ? {
                id: `ground_bow_${target.item.id}`,
                type: 'weapon',
                name: target.item.name || 'Охотничий лук',
                iconType: 'bow',
                handSlot: 'two_handed' as const,
                twoHanded: true,
                damageType: 'pierce',
                subtitle: 'Двуручное стрелковое оружие',
                stats: 'Урон: +16 (Колющий) · Пробитие: 25% · ЛКМ: натяжение и выстрел',
                lore: 'Тугой тисовый лук. Позволяет поражать врагов на дальней дистанции.',
                damageBonus: 16,
                penetration: 25,
                weight: 2.2,
                catalyst: false,
              } : {
                id: `ground_sword_${target.item.id}`,
                type: 'weapon',
                name: target.item.name || 'Стальной клинок',
                iconType: 'steel_sword',
                handSlot: 'both' as const,
                damageType: 'slash',
                subtitle: 'Оружие ближнего боя · В сумке',
                stats: 'Урон: +10 (Рубящий) · Пробитие: 25%',
                lore: 'Закаленный стальной меч с заточенным лезвием. Наносит высокий рубящий урон.',
                damageBonus: 10,
                penetration: 25,
                weight: 5.0,
                catalyst: false,
              };
            } else {
              newItem = {
                id: `ground_staff_${target.item.id}`,
                type: 'weapon',
                name: target.item.name || 'Боевой посох Пепла',
                iconType: 'staff',
                handSlot: 'both' as const,
                damageType: 'blunt',
                subtitle: 'Боевой посох · Катализатор Знаков',
                stats: 'Урон: +8 (Дробящий) · +5 Защита Духа · ЛКМ: удар · Зажатие: каст [1-5]',
                lore: 'Древний полированный посох. При зажатии ЛКМ непрерывно выпускает выбранный Знак (клавиши 1-5).',
                damageBonus: 8,
                magicGuardBonus: 5,
                weight: 3.0,
                catalyst: true,
                boundSpellId: 'spark',
              };
            }

            // Weight limit check (no slot limit!)
            const itemWeight = newItem.weight || (newItem.type === 'armor' ? 6.0 : newItem.twoHanded ? 8.5 : 2.0);
            const maxW = eng.hasMagic ? 45 : 65;
            let currentW = (eng.mainHandItem?.weight || 4.0) + (eng.offHandItem?.weight || 0);
            for (const s of eng.bagSlots) {
              if (s) currentW += s.weight || 1.5;
            }
            if (currentW + itemWeight > maxW) {
              setMishapBanner(`Перегруз! Макс. вес: ${maxW} кг (у вас: ${currentW.toFixed(1)} кг). Невозможно нести больше!`);
              setTimeout(() => setMishapBanner(null), 3500);
              return;
            }

            setBagSlots((prev) => {
              const next = [...prev];
              const emptyIdx = next.findIndex((slot) => slot === null);
              if (emptyIdx !== -1) {
                next[emptyIdx] = newItem;
              } else {
                next.push(newItem); // Unlimited slots! Expands dynamically!
              }
              eng.bagSlots = next;
              return next;
            });
            setMishapBanner(`Подобран: ${newItem.name} [${itemWeight} кг] (помещен в инвентарь [I])`);
            setTimeout(() => setMishapBanner(null), 2500);
          } else if (target.type === 'door') {
            if (!eng.dungeonDoorUnlocked) {
              const hasKey =
                eng.bagSlots.some((s) => s?.iconType === 'key') ||
                eng.mainHandItem?.iconType === 'key' ||
                eng.offHandItem?.iconType === 'key';
              if (hasKey) {
                eng.dungeonDoorUnlocked = true;
                renderer3dRef.current?.openDoor(true);
                setMishapBanner('Вы вставили Ключ Смотрителя в замок. Засов со скрежетом отодвинулся, и массивные дубовые врата распахнулись в Древний Лес!');
                setTimeout(() => setMishapBanner(null), 5000);
              } else {
                setMishapBanner('Врата наглухо заперты! Замок подчиняется лишь Ключу Смотрителя Склепа.');
                setTimeout(() => setMishapBanner(null), 3500);
              }
            } else {
              setMishapBanner('Врата уже распахнуты. Вы можете свободно проходить в Древний Лес!');
              setTimeout(() => setMishapBanner(null), 3000);
            }
          } else if (target.type === 'signpost') {
            setMishapBanner('Указатель: «← На запад: Деревня Серый Дол | На восток: Лагерь разбойников (Опасно!) → | На север: Склеп Пепла»');
            setTimeout(() => setMishapBanner(null), 6000);
          } else if (target.type === 'notice_board') {
            document.exitPointerLock?.();
            setNoticeBoardOpen(true);
          } else if (target.type === 'npc' && target.item) {
            openNpcDialog(target.item.npcId || 'elder_mark', target.item);
          } else if (target.type === 'stuck_mob') {
            setMishapBanner(
              'Замурованный узник хрипит: «...Оно заперто... Смотритель забрал ключ в свое Святилище на дальнем севере склепа...»'
            );
            setTimeout(() => setMishapBanner(null), 4500);
          }
        }
      }
      if (code === 'Space' || code === 'KeyF') {
        e.preventDefault();
        if (e.repeat) return;
        const eng = engineRef.current;
        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );
        if (isBow) {
          // Space/F acts as hold-to-draw: starts drawing on keydown (if not stunned/blocking and recoverTimer <= 0)
          if (eng.playerStunTimer <= 0 && !eng.isBlocking && eng.bow.state !== 'recover' && eng.bow.recoverTimer <= 0) {
            eng.bow.state = 'drawing';
          }
        } else {
          performAttack();
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        const eng = engineRef.current;
        const isSwinging = eng.swingTimer > 0 || eng.powerSwingTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.powerSwingCharging || eng.offHandPowerSwingCharging;
        if (!eng.isBlocking && !isSwinging) {
          eng.isBlocking = true;
          eng.parryWindowTimer = 0; // RMB block only blocks, no auto-parry!
          if (eng.bow.state === 'drawing' || eng.bow.state === 'full') {
            eng.bow.state = 'idle';
            eng.bow.draw = 0;
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      engineRef.current.keys.delete(code);
      if (code === 'Space' || code === 'KeyF') {
        const eng = engineRef.current;
        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );
        if (isBow) {
          // Space/F key release shoots if drawn >= 0.2, else cancels
          if (eng.bow.state === 'drawing' || eng.bow.state === 'full') {
            if (eng.bow.draw >= 0.2) {
              shootBowRef.current();
            } else {
              eng.bow.state = 'idle';
              eng.bow.draw = 0;
            }
          }
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        engineRef.current.isBlocking = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        engineRef.current.playerAngle += e.movementX * 0.0032;
        engineRef.current.playerPitch = Math.max(
          -1.2,
          Math.min(1.2, engineRef.current.playerPitch - e.movementY * 0.0032)
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== canvasRef.current) return;
      if (document.pointerLockElement !== canvasRef.current) {
        try {
          const p = canvasRef.current?.requestPointerLock?.() as Promise<void> | undefined;
          p?.catch?.(() => {});
        } catch {
          // Ignore pointerlock security exceptions
        }
      }
      const eng = engineRef.current;

      if (e.button === 0) {
        // Left Mouse Button (ЛКМ) -> Right Hand
        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );
        const isStaff = !!(
          eng.mainHandItem?.iconType === 'staff' ||
          eng.weaponName.toLowerCase().includes('посох')
        );
        const isRHMelee = !isBow && !!(
          eng.mainHandItem?.type === 'weapon' &&
          !eng.mainHandItem?.catalyst &&
          (eng.mainHandItem?.iconType === 'sword' ||
            eng.mainHandItem?.iconType === 'steel_sword' ||
            eng.mainHandItem?.iconType === 'two_handed')
        );

        lmbHoldRef.current.startTime = performance.now();
        lmbHoldRef.current.isRHMelee = isRHMelee;
        lmbHoldRef.current.isBow = isBow;

        if (isBow) {
          // Bow: hold LMB to draw, state machine handles drawing in game loop!
          if (eng.playerStunTimer <= 0 && !eng.isBlocking && eng.bow.state !== 'recover' && eng.bow.recoverTimer <= 0) {
            eng.bow.state = 'drawing';
          }
        } else if (isStaff) {
          // Посох: быстрый клик (<200мс) = физ. атака посохом, зажатие (>200мс) = каст магии!
          if (lmbHoldRef.current.timerId) {
            window.clearTimeout(lmbHoldRef.current.timerId);
            lmbHoldRef.current.timerId = null;
          }
          lmbHoldRef.current.isHoldCasting = false;

          lmbHoldRef.current.timerId = window.setTimeout(() => {
            lmbHoldRef.current.isHoldCasting = true;
            startHandCastRef.current('right');
          }, 200);
        } else if (isRHMelee) {
          // Оружие ближнего боя: нельзя начинать замах во время блока или парирования!
          if (eng.isBlocking || eng.parryAttemptTimer > 0 || eng.swingTimer > 0 || eng.powerSwingTimer > 0) return;
          eng.powerSwingCharging = true;
          eng.powerSwingChargeElapsed = 0;
        } else {
          const isOtherCatalyst = !!eng.mainHandItem?.catalyst;
          if (isOtherCatalyst) {
            startHandCastRef.current('right');
          } else {
            performAttack();
          }
        }
      } else if (e.button === 1) {
        // Middle Mouse Button (СКМ): Однократное парирование по клику!
        e.preventDefault();
        performParryRef.current();
      } else if (e.button === 2) {
        // Right Mouse Button (ПКМ): Controls Left Hand (or hold-to-draw bow if equipped)
        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );
        if (isBow) {
          // ПКМ с луком работает как тот же hold-to-draw!
          if (eng.playerStunTimer <= 0 && !eng.isBlocking && eng.bow.state !== 'recover' && eng.bow.recoverTimer <= 0) {
            eng.bow.state = 'drawing';
          }
          return;
        }
        const isLHCatalyst = !!(
          eng.offHandItem?.catalyst ||
          eng.offHandItem?.iconType === 'orb'
        );
        const isLHWeapon = !!(
          eng.offHandItem?.type === 'weapon' &&
          !eng.offHandItem?.catalyst &&
          (eng.offHandItem?.iconType === 'sword' ||
            eng.offHandItem?.iconType === 'steel_sword' ||
            eng.offHandItem?.iconType === 'staff')
        );

        rmbHoldRef.current.startTime = performance.now();
        rmbHoldRef.current.isLHWeapon = isLHWeapon;
        rmbHoldRef.current.isLHCatalyst = isLHCatalyst;

        if (isLHCatalyst) {
          startHandCastRef.current('left');
        } else if (isLHWeapon) {
          // Left hand melee weapon: нельзя начинать замах во время блока или парирования!
          if (eng.isBlocking || eng.parryAttemptTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0) return;
          eng.offHandPowerSwingCharging = true;
          eng.offHandPowerSwingChargeElapsed = 0;
        } else {
          // Shield or empty left hand: Block! (No auto-parry on RMB, can block and press MMB to parry)
          const isSwinging = eng.swingTimer > 0 || eng.powerSwingTimer > 0 || eng.offHandSwingTimer > 0 || eng.offHandPowerSwingTimer > 0 || eng.powerSwingCharging || eng.offHandPowerSwingCharging;
          if (!eng.isBlocking && !isSwinging) {
            eng.isBlocking = true;
            eng.parryWindowTimer = 0;
          }
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const eng = engineRef.current;

      // Проверяем: заряжены ли обе руки для одновременного разряда силовой атаки с двух рук (Dual Power Release)
      const isBothCharged =
        eng.powerSwingCharging &&
        eng.offHandPowerSwingCharging &&
        eng.powerSwingChargeElapsed >= 0.25 &&
        eng.offHandPowerSwingChargeElapsed >= 0.25;

      if (isBothCharged && (e.button === 0 || e.button === 2)) {
        // Отпускание ЛКМ или ПКМ при заряженных обеих руках спускает ОДНОВРЕМЕННО обе силовые атаки!
        performPowerAttackRef.current();
        performOffHandPowerAttackRef.current();

        eng.powerSwingCharging = false;
        eng.powerSwingChargeElapsed = 0;
        eng.offHandPowerSwingCharging = false;
        eng.offHandPowerSwingChargeElapsed = 0;
        rmbHoldRef.current.isLHWeapon = false;
        return;
      }

      if (e.button === 0) {
        // Released LMB (Правая рука)
        const heldDuration = performance.now() - lmbHoldRef.current.startTime;

        if (lmbHoldRef.current.timerId) {
          window.clearTimeout(lmbHoldRef.current.timerId);
          lmbHoldRef.current.timerId = null;
        }

        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );

        if (isBow) {
          lmbHoldRef.current.isBow = false;
          // Отпустил: выстрел, если draw >= 0.2, иначе отмена без выстрела
          if (eng.bow.state === 'drawing' || eng.bow.state === 'full') {
            if (eng.bow.draw >= 0.2) {
              shootBowRef.current();
            } else {
              eng.bow.state = 'idle';
              eng.bow.draw = 0;
            }
          }
          return;
        }

        const isStaff = !!(
          eng.mainHandItem?.iconType === 'staff' ||
          eng.weaponName.toLowerCase().includes('посох')
        );

        if (isStaff) {
          if (!lmbHoldRef.current.isHoldCasting) {
            performAttack();
          }
          lmbHoldRef.current.isHoldCasting = false;
          if (eng.rhCasting) {
            eng.rhCasting = false;
            eng.rhCastElapsed = 0;
            renderer3dRef.current?.setStaffCharging(false);
          }
        } else if (lmbHoldRef.current.isRHMelee) {
          if (heldDuration >= 300 && eng.powerSwingChargeElapsed >= 0.28) {
            // Зажатие ЛКМ (≥ 300мс) -> Силовая атака правой руки!
            performPowerAttackRef.current();
          } else {
            // Быстрый клик ЛКМ -> Обычная атака правой руки!
            performAttack();
          }
        }

        eng.powerSwingCharging = false;
        eng.powerSwingChargeElapsed = 0;
      } else if (e.button === 2) {
        // Released RMB (Левая рука / отпускание натяжения лука)
        const isBow = !!(
          eng.mainHandItem?.iconType === 'bow' ||
          eng.weaponName.toLowerCase().includes('лук')
        );
        if (isBow) {
          if (eng.bow.state === 'drawing' || eng.bow.state === 'full') {
            if (eng.bow.draw >= 0.2) {
              shootBowRef.current();
            } else {
              eng.bow.state = 'idle';
              eng.bow.draw = 0;
            }
          }
          return;
        }

        const heldDuration = performance.now() - rmbHoldRef.current.startTime;

        if (rmbHoldRef.current.isLHWeapon) {
          if (heldDuration >= 300 && eng.offHandPowerSwingChargeElapsed >= 0.28) {
            // Зажатие ПКМ (≥ 300мс) -> Силовая атака левой руки!
            performOffHandPowerAttackRef.current();
          } else {
            // Быстрый клик ПКМ -> Обычная атака левой руки!
            performOffHandAttackRef.current();
          }
          rmbHoldRef.current.isLHWeapon = false;
        }

        eng.offHandPowerSwingCharging = false;
        eng.offHandPowerSwingChargeElapsed = 0;

        if (eng.lhCasting) {
          eng.lhCasting = false;
          eng.lhCastElapsed = 0;
        }

        const isLHCatalyst = !!(
          eng.offHandItem?.catalyst ||
          eng.offHandItem?.iconType === 'orb'
        );
        const isLHWeaponMU = !!(
          eng.offHandItem?.type === 'weapon' &&
          !eng.offHandItem?.catalyst
        );
        if (!isLHCatalyst && !isLHWeaponMU) {
          eng.isBlocking = false;
        }
      }
    };

    const onBlur = () => {
      if (lmbHoldRef.current.timerId) {
        window.clearTimeout(lmbHoldRef.current.timerId);
        lmbHoldRef.current.timerId = null;
      }
      lmbHoldRef.current.isHoldCasting = false;

      const eng = engineRef.current;
      eng.bow.state = 'idle';
      eng.bow.draw = 0;
      eng.rhCasting = false;
      eng.rhCastElapsed = 0;
      eng.lhCasting = false;
      eng.lhCastElapsed = 0;
      eng.powerSwingCharging = false;
      eng.powerSwingChargeElapsed = 0;
      eng.offHandPowerSwingCharging = false;
      eng.offHandPowerSwingChargeElapsed = 0;
      renderer3dRef.current?.setStaffCharging(false);
      eng.isBlocking = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('contextmenu', onContextMenu);

    return () => {
      if (lmbHoldRef.current.timerId) {
        window.clearTimeout(lmbHoldRef.current.timerId);
        lmbHoldRef.current.timerId = null;
      }
      lmbHoldRef.current.isHoldCasting = false;

      const eng = engineRef.current;
      eng.rhCasting = false;
      eng.rhCastElapsed = 0;
      eng.lhCasting = false;
      eng.lhCastElapsed = 0;
      renderer3dRef.current?.setStaffCharging(false);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gameState, performAttack]);

  // Main 60fps Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const eng = engineRef.current;
    const activeMap = INITIAL_MAP;
    const renderer3d = new LowPolyDungeonRenderer(canvas, activeMap, eng.enemies, eng.items, false);
    if (eng.dungeonDoorUnlocked) {
      renderer3d.openDoor(false);
    }
    renderer3d.setEquippedItems(eng.mainHandItem, eng.offHandItem);
    renderer3dRef.current = renderer3d;

    let lastTime = performance.now();
    let hudSyncTimer = 0;
    let animId = 0;

    const isWalkable = (x: number, y: number) => {
      const mx = Math.floor(x);
      const my = Math.floor(y);
      if (my < 0 || my >= activeMap.length || mx < 0 || mx >= activeMap[0].length) {
        return false;
      }
      const tile = activeMap[my][mx];
      return !isSolidTile(tile, eng.dungeonDoorUnlocked);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const eng = engineRef.current;
      const keys = eng.keys;

      // Keyboard turning
      const turnSpeed = 2.4;
      if (keys.has('ArrowLeft')) {
        eng.playerAngle -= turnSpeed * dt;
      }
      if (keys.has('ArrowRight')) {
        eng.playerAngle += turnSpeed * dt;
      }

      // Movement
      let moveX = 0;
      let moveY = 0;
      const cos = Math.cos(eng.playerAngle);
      const sin = Math.sin(eng.playerAngle);

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        moveX += cos;
        moveY += sin;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        moveX -= cos;
        moveY -= sin;
      }
      if (keys.has('KeyA')) {
        moveX += sin;
        moveY -= cos;
      }
      if (keys.has('KeyD')) {
        moveX -= sin;
        moveY += cos;
      }

      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      if (len > 0) {
        const spd = (eng.isBlocking ? eng.speed * 0.55 : eng.speed) * dt;
        const nx = eng.playerX + (moveX / len) * spd;
        const ny = eng.playerY + (moveY / len) * spd;
        const margin = 0.22;

        if (isWalkable(nx + Math.sign(moveX) * margin, eng.playerY)) {
          eng.playerX = nx;
        }
        if (isWalkable(eng.playerX, ny + Math.sign(moveY) * margin)) {
          eng.playerY = ny;
        }
      }

      // Automap bounds check
      const px = Math.floor(eng.playerX);
      const py = Math.floor(eng.playerY);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ey = py + dy;
          const ex = px + dx;
          if (ey >= 0 && ey < eng.explored.length && ex >= 0 && ex < eng.explored[0].length) {
            eng.explored[ey][ex] = true;
          }
        }
      }

      // Update enemy aim zone & joint targeting via center crosshair (no floating cheat badges!)
      const aimInfo = renderer3d.getEnemyUnderAim(eng.enemies);
      if (aimInfo) {
        setAimedJoint(aimInfo.isJoint);
      } else {
        setAimedJoint(false);
      }

      // Update interaction target via center-screen raycast
      const isDoorOpen = eng.currentLocation === 'forest' || eng.dungeonDoorUnlocked;
      const target = renderer3d.getInteractionTarget(eng.items, isDoorOpen);
      interactionTargetRef.current = target;
      const nextPrompt = target?.label || null;
      if (nextPrompt !== lastPromptRef.current) {
        lastPromptRef.current = nextPrompt;
        setInteractionPrompt(nextPrompt);
      }

      // Skyrim-style 4-state Enemy AI (idle -> windup -> attack, or block)
      for (const enemy of eng.enemies) {
        if (!enemy.alive) {
          if (!((enemy as any).lootDropped)) {
            (enemy as any).lootDropped = true;
            dropLootForEnemy(enemy, eng, renderer3d, setMishapBanner);
            if (enemy.kind === 'warden' && !eng.bossKeyDropped) {
              eng.bossKeyDropped = true;
              eng.wardenDefeated = true;
              const bossKey: WorldItem = {
                id: getNextItemId(eng),
                kind: 'key',
                name: 'Ключ Смотрителя',
                x: enemy.x,
                y: enemy.y,
                collected: false,
              };
              eng.items.push(bossKey);
              renderer3d.spawnWorldItem(bossKey);
            }
          }
          continue;
        }
        if (enemy.bleedTimer && enemy.bleedTimer > 0) {
          enemy.bleedTimer = Math.max(0, enemy.bleedTimer - dt);
          const bleedTick = (enemy.bleedDps || 4) * dt;
          enemy.hp -= bleedTick;
          if (Math.random() < 0.25) {
            renderer3d.triggerHitSparks(enemy.x, enemy.y, false);
          }
          if (enemy.hp <= 0) {
            killEnemyRef.current(enemy, 'bleed');
          }
        }
        if (enemy.slowTimer !== undefined && enemy.slowTimer > 0) {
          enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
          if (enemy.slowTimer <= 0 && enemy.baseSpeed !== undefined) {
            enemy.speed = enemy.baseSpeed;
          }
        }
        if (enemy.hurtTimer > 0) enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
        if (enemy.attackCooldown > 0) enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        if (enemy.stunTimer > 0) {
          enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
          continue;
        }
        if (enemy.parryStaggerTimer > 0) {
          enemy.parryStaggerTimer = Math.max(0, enemy.parryStaggerTimer - dt);
          continue;
        }
        if (enemy.stagger > 0) {
          enemy.stagger = Math.max(0, enemy.stagger - dt * 6);
        }

        const dx = eng.playerX - enemy.x;
        const dy = eng.playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (enemy.aiState === 'windup') {
          enemy.stateTimer -= dt;
          if (dist > 0.85) {
            const step = enemy.speed * 0.55 * dt;
            const r = 0.38;
            const nx = enemy.x + (dx / dist) * step;
            const ny = enemy.y + (dy / dist) * step;
            if (
              isWalkable(nx - r, enemy.y - r) &&
              isWalkable(nx + r, enemy.y - r) &&
              isWalkable(nx - r, enemy.y + r) &&
              isWalkable(nx + r, enemy.y + r)
            ) {
              enemy.x = nx;
            }
            if (
              isWalkable(enemy.x - r, ny - r) &&
              isWalkable(enemy.x + r, ny - r) &&
              isWalkable(enemy.x - r, ny + r) &&
              isWalkable(enemy.x + r, ny + r)
            ) {
              enemy.y = ny;
            }
          }
          if (enemy.stateTimer <= 0) {
            enemy.aiState = 'attack';
            enemy.stateTimer = 0.28;
            enemy.attackHitChecked = false;
          }
        } else if (enemy.aiState === 'attack') {
          enemy.stateTimer -= dt;

          // Connect strike mid-swing (halfway through the 0.28s forward slash)
          if (enemy.stateTimer <= 0.14 && !enemy.attackHitChecked) {
            enemy.attackHitChecked = true;

            if (dist <= 1.35) {
              if (eng.parryAttemptTimer > 0) {
                // Active Middle Click Parry!
                renderer3d.triggerParrySparks();
                eng.parryAttemptTimer = 0;
                eng.parryBonusTimer = 1.8;
                eng.parryCooldownTimer = 0.5; // rewarded with fast cooldown
                // Успешное парирование возвращает потраченную стамину (не расходует стамину)!
                eng.stamina = Math.min(eng.maxStamina, eng.stamina + 20);
                enemy.comboRemaining = 0;
                enemy.aiState = 'idle';
                enemy.hurtTimer = 0.6;
                enemy.parryStaggerTimer = 0.8;
                enemy.attackCooldown = 2.6;
                enemy.stagger = Math.min(100, enemy.stagger + 55);
                if (enemy.stagger >= 100) {
                  enemy.stunTimer = 2.5;
                  enemy.stagger = 0;
                }
                const pkb = 0.38;
                const pkx = enemy.x - (dx / dist) * pkb;
                const pky = enemy.y - (dy / dist) * pkb;
                const r = 0.38;
                if (isWalkable(pkx - r, enemy.y - r) && isWalkable(pkx + r, enemy.y - r) && isWalkable(pkx - r, enemy.y + r) && isWalkable(pkx + r, enemy.y + r)) enemy.x = pkx;
                if (isWalkable(enemy.x - r, pky - r) && isWalkable(enemy.x + r, pky - r) && isWalkable(enemy.x - r, pky + r) && isWalkable(enemy.x + r, pky + r)) enemy.y = pky;

              } else if (eng.isBlocking) {
                const absorbed = enemy.damage * (eng.shieldBlockStrength / 100);
                const staminaCost = absorbed * (1 - eng.shieldBlockEfficiency / 100);
                eng.stamina = Math.max(0, eng.stamina - staminaCost);
                const remaining = enemy.damage - absorbed;
                const enemyDmgType = enemy.kind === 'rat' ? 'pierce' : enemy.kind === 'skeleton' ? 'slash' : 'blunt';
                // Enemies attack player torso by default when blocked
                const calc = calculatePerSlotDamage(remaining, enemyDmgType, 0, 'torso', {
                  head: eng.armorHead,
                  torso: eng.armorTorso,
                  arms: eng.armorArms,
                  legs: eng.armorLegs,
                });
                eng.hp = Math.max(0, eng.hp - calc.finalDamage);
                eng.playerStagger = Math.min(100, eng.playerStagger + 8);
              } else {
                const enemyDmgType = enemy.kind === 'rat' ? 'pierce' : enemy.kind === 'skeleton' ? 'slash' : 'blunt';
                // Enemies randomly hit torso (60%), head (15%), arms (15%), or legs (10%)
                const hitRoll = Math.random();
                const playerHitZone = hitRoll < 0.60 ? 'torso' : hitRoll < 0.75 ? 'head' : hitRoll < 0.90 ? 'arms' : 'legs';
                const calc = calculatePerSlotDamage(enemy.damage, enemyDmgType, 0, playerHitZone, {
                  head: eng.armorHead,
                  torso: eng.armorTorso,
                  arms: eng.armorArms,
                  legs: eng.armorLegs,
                });
                eng.hp = Math.max(0, eng.hp - calc.finalDamage);
                eng.hurtFlash = 1.0;
                eng.playerStagger = Math.min(100, eng.playerStagger + 18);
              }

              if (eng.playerStagger >= 100) {
                eng.playerStunTimer = 1.4;
                eng.playerStagger = 0;
                eng.isBlocking = false;
              }

              if (eng.hp <= 0) {
                document.exitPointerLock?.();
                setGameState('GAME_OVER');
                return;
              }
            }
          }

          if (enemy.stateTimer <= 0) {
            if (enemy.comboRemaining > 0 && dist <= 1.45) {
              enemy.comboRemaining -= 1;
              enemy.aiState = 'windup';
              enemy.stateTimer = 0.45;
              enemy.attackHitChecked = false;
            } else {
              enemy.comboRemaining = 0;
              enemy.aiState = 'idle';
              enemy.attackCooldown = 2.2;
            }
          }
        } else if (enemy.aiState === 'block') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.aiState = 'idle';
          }
        } else {
          // Reactive block if player is swinging nearby
          if (
            eng.swingTimer > 0.05 &&
            eng.swingTimer < 0.3 &&
            dist <= 1.45 &&
            enemy.kind !== 'rat' &&
            Math.random() < 0.08
          ) {
            enemy.aiState = 'block';
            enemy.stateTimer = 0.9;
          } else if (dist < 8.5 && dist > 0.9) {
            // Check Line of Sight so enemies don't detect player through solid walls
            let los = true;
            const steps = Math.ceil(dist / 0.25);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              const cx = Math.floor(enemy.x + dx * t);
              const cy = Math.floor(enemy.y + dy * t);
              const tile = activeMap[cy]?.[cx];
              if (isSolidTile(tile, eng.dungeonDoorUnlocked)) {
                los = false;
                break;
              }
            }
            if (!los) continue;

            let targetX = eng.playerX;
            let targetY = eng.playerY;
            const sx = Math.floor(enemy.x);
            const sy = Math.floor(enemy.y);
            const gx = Math.floor(eng.playerX);
            const gy = Math.floor(eng.playerY);

            if ((sx !== gx || sy !== gy) && dist >= 1.6) {
              const rows = activeMap.length;
              const cols = activeMap[0].length;
              const visited = new Uint8Array(rows * cols);
              const parentX = new Int8Array(rows * cols).fill(-1);
              const parentY = new Int8Array(rows * cols).fill(-1);
              const qx: number[] = [sx];
              const qy: number[] = [sy];
              visited[sy * cols + sx] = 1;
              let found = false;
              let head = 0;

              while (head < qx.length && head < 120) {
                const cx = qx[head];
                const cy = qy[head];
                head++;
                if (cx === gx && cy === gy) {
                  found = true;
                  break;
                }
                const dirs = [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                ];
                for (const [ox, oy] of dirs) {
                  const nx = cx + ox;
                  const ny = cy + oy;
                  if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    const idx = ny * cols + nx;
                    const tile = activeMap[ny][nx];
                    if (!visited[idx] && !isSolidTile(tile, eng.dungeonDoorUnlocked)) {
                      visited[idx] = 1;
                      parentX[idx] = cx;
                      parentY[idx] = cy;
                      qx.push(nx);
                      qy.push(ny);
                    }
                  }
                }
              }

              if (found) {
                let curX = gx;
                let curY = gy;
                while (true) {
                  const pIdx = curY * cols + curX;
                  const px = parentX[pIdx];
                  const py = parentY[pIdx];
                  if (px === sx && py === sy) {
                    targetX = curX + 0.5;
                    targetY = curY + 0.5;
                    break;
                  }
                  if (px === -1) break;
                  curX = px;
                  curY = py;
                }
              }
            }

            const tdx = targetX - enemy.x;
            const tdy = targetY - enemy.y;
            const tDist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
            const step = enemy.speed * dt;
            const r = 0.38;
            const nx = enemy.x + (tdx / tDist) * step;
            const ny = enemy.y + (tdy / tDist) * step;
            const canX =
              isWalkable(nx - r, enemy.y - r) &&
              isWalkable(nx + r, enemy.y - r) &&
              isWalkable(nx - r, enemy.y + r) &&
              isWalkable(nx + r, enemy.y + r);
            if (canX) enemy.x = nx;

            const canY =
              isWalkable(enemy.x - r, ny - r) &&
              isWalkable(enemy.x + r, ny - r) &&
              isWalkable(enemy.x - r, ny + r) &&
              isWalkable(enemy.x + r, ny + r);
            if (canY) enemy.y = ny;
          } else if (dist <= 1.05 && enemy.attackCooldown <= 0) {
            enemy.aiState = 'windup';
            enemy.stateTimer = 0.70;
            enemy.attackHitChecked = false;
            // Roll 2-4 hit fast combo
            enemy.comboRemaining =
              enemy.kind === 'warden'
                ? 3
                : enemy.kind === 'rat'
                ? Math.random() < 0.6
                  ? 1
                  : 0
                : Math.random() < 0.75
                ? 2
                : 1;
          }
        }
      }

      // Timers & Stamina regen
      if (eng.hitStopTimer > 0) {
        eng.hitStopTimer = Math.max(0, eng.hitStopTimer - dt);
      }
      if (eng.cameraShake > 0) {
        eng.cameraShake = Math.max(0, eng.cameraShake - dt * 5.5);
      }
      if (eng.swingTimer > 0 && eng.hitStopTimer <= 0) {
        const swingSpeed = Math.max(1.05, 1.65 - eng.weaponWeight * 0.06);
        eng.swingTimer += dt * swingSpeed;

        // Deal damage when sword reaches the center of the arc (0.36)
        if (eng.swingTimer >= 0.36 && !eng.swingHitChecked) {
          eng.swingHitChecked = true;
          const dirX = Math.cos(eng.playerAngle);
          const dirY = Math.sin(eng.playerAngle);
          let hitAny = false;

          for (const enemy of eng.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - eng.playerX;
            const dy = enemy.y - eng.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1.35) continue;

            const dot = (dx / dist) * dirX + (dy / dist) * dirY;
            if (dot > 0.55) {
              hitAny = true;

              // Enemy Parry check (0 damage + sparks + counter-attack)
              const parryChance =
                enemy.kind === 'warden' ? 0.28 : enemy.kind === 'cultist' ? 0.2 : enemy.kind === 'skeleton' ? 0.14 : 0;
              if (enemy.stunTimer <= 0 && enemy.aiState === 'idle' && Math.random() < parryChance) {
                renderer3d.triggerParrySparks();
                eng.cameraShake = 0.75;
                eng.hitStopTimer = 0.065;
                eng.playerStagger = Math.min(100, eng.playerStagger + 35);
                if (eng.playerStagger >= 100) {
                  eng.playerStunTimer = 1.4;
                  eng.playerStagger = 0;
                  eng.isBlocking = false;
                }
                enemy.aiState = 'windup';
                enemy.stateTimer = 0.42;
                enemy.attackHitChecked = false;
                continue;
              }

              const base = eng.baseDamage + eng.weaponBonus + Math.floor(Math.random() * 5);
              let rawDmg = base;

              if (eng.parryBonusTimer > 0) {
                rawDmg = Math.floor(base * 1.75);
                eng.parryBonusTimer = 0;
                enemy.aiState = 'idle';
                enemy.stateTimer = 0;
              } else if (enemy.aiState === 'block') {
                rawDmg = Math.max(1, Math.floor(base * 0.25));
              } else {
                const isCrit = Math.random() < 0.18;
                rawDmg = isCrit ? Math.floor(base * 1.5) : base;
                if (enemy.stunTimer <= 0 && enemy.hp - rawDmg > 0 && enemy.aiState === 'idle' && Math.random() < 0.3) {
                  enemy.aiState = 'block';
                  enemy.stateTimer = 1.3;
                }
              }

              if (enemy.stunTimer > 0) {
                rawDmg = Math.floor(rawDmg * 1.5);
              }

              const aimInfo = renderer3d.getEnemyUnderAim([enemy]);
              const hitZone = aimInfo ? aimInfo.zone : (eng.playerPitch < -0.15 ? 'head' : eng.playerPitch > 0.18 ? 'legs' : 'torso');
              const isJoint = aimInfo ? aimInfo.isJoint : false;

              let zoneMult = 1.0;
              if (hitZone === 'head') zoneMult = 1.5;
              else if (hitZone === 'legs') zoneMult = 0.85;
              else if (hitZone === 'arms') zoneMult = 0.75;

              const wepDmgType: any = eng.mainHandItem?.damageType || 'slash';
              const calc = calculatePerSlotDamage(
                rawDmg * zoneMult,
                wepDmgType,
                eng.weaponPenetration,
                hitZone,
                enemy.armorSlots || {}
              );
              const finalDmg = calc.finalDamage;
              if (calc.bypassedArmor) {
                setMishapBanner('★ СОЧЛЕНЕНИЕ! Удар в стык доспеха пробил защиту! ★');
                setTimeout(() => setMishapBanner(null), 1800);
              }

              // Status effects on hit: Slash -> Bleed, Blunt -> Stun
              if (wepDmgType === 'slash' && (Math.random() < 0.25 || isJoint)) {
                enemy.bleedTimer = 5.0;
                enemy.bleedDps = 4.0;
              } else if (wepDmgType === 'blunt' && Math.random() < 0.30) {
                enemy.stunTimer = Math.max(enemy.stunTimer, 1.2);
              }

              enemy.hp -= finalDmg;
              enemy.hurtTimer = 0.25;

              const wasBlocked = enemy.aiState === 'block';
              enemy.stagger = Math.min(100, enemy.stagger + (wasBlocked ? 10 : 22));
              if (enemy.stagger >= 100) {
                enemy.stunTimer = 2.2;
                enemy.stagger = 0;
                enemy.aiState = 'idle';
                enemy.comboRemaining = 0;
              }
              eng.cameraShake = wasBlocked ? 0.6 : 0.9;
              eng.hitStopTimer = 0.065;
              renderer3d.triggerHitSparks(enemy.x, enemy.y, wasBlocked);

              const kb = wasBlocked ? 0.16 : 0.3;
              const kx = enemy.x + (dx / dist) * kb;
              const ky = enemy.y + (dy / dist) * kb;
              const r = 0.38;
              if (
                isWalkable(kx - r, enemy.y - r) &&
                isWalkable(kx + r, enemy.y - r) &&
                isWalkable(kx - r, enemy.y + r) &&
                isWalkable(kx + r, enemy.y + r)
              ) {
                enemy.x = kx;
              }
              if (
                isWalkable(enemy.x - r, ky - r) &&
                isWalkable(enemy.x + r, ky - r) &&
                isWalkable(enemy.x - r, ky + r) &&
                isWalkable(enemy.x + r, ky + r)
              ) {
                enemy.y = ky;
              }

              if (enemy.hp <= 0) {
                killEnemyRef.current(enemy, 'melee');
              }
            }
          }

          // Sword recoil/bounce on impact
          if (hitAny) {
            eng.swingTimer = 0.52;
          }
        }

        if (eng.swingTimer >= 1) eng.swingTimer = 0;
      }

      // Off-hand melee swing (dual wield)
      if (eng.offHandSwingTimer > 0 && eng.hitStopTimer <= 0) {
        const offSwingSpeed = Math.max(1.1, 1.8 - (eng.offHandItem?.weight || 4) * 0.06);
        eng.offHandSwingTimer += dt * offSwingSpeed;
        if (eng.offHandSwingTimer >= 0.36 && !eng.offHandSwingHitChecked) {
          eng.offHandSwingHitChecked = true;
          const offWeapon = eng.offHandItem;
          const offBonus = offWeapon?.damageBonus || 0;
          const offPen = offWeapon?.penetration || 0;
          const dirX = Math.cos(eng.playerAngle);
          const dirY = Math.sin(eng.playerAngle);
          let offHitAny = false;
          for (const enemy of eng.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - eng.playerX;
            const dy = enemy.y - eng.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1.35) continue;
            const dot = (dx / dist) * dirX + (dy / dist) * dirY;
            if (dot > 0.55) {
              offHitAny = true;
              const base = eng.baseDamage + offBonus + Math.floor(Math.random() * 5);
              const aimInfo = renderer3d.getEnemyUnderAim([enemy]);
              const hitZone = aimInfo ? aimInfo.zone : (eng.playerPitch < -0.15 ? 'head' : eng.playerPitch > 0.18 ? 'legs' : 'torso');
              const isJoint = aimInfo ? aimInfo.isJoint : false;
              const offDmgType: any = eng.offHandItem?.damageType || 'slash';
              const calc = calculatePerSlotDamage(
                base,
                offDmgType,
                offPen,
                hitZone,
                enemy.armorSlots || {}
              );
              const finalDmg = calc.finalDamage;
              if (calc.bypassedArmor) {
                setMishapBanner('★ СОЧЛЕНЕНИЕ! Удар в стык доспеха пробил защиту! ★');
                setTimeout(() => setMishapBanner(null), 1800);
              }
              if (offDmgType === 'slash' && (Math.random() < 0.25 || isJoint)) {
                enemy.bleedTimer = 5.0;
                enemy.bleedDps = 4.0;
              }
              enemy.hp -= finalDmg;
              enemy.hurtTimer = 0.25;
              enemy.stagger = Math.min(100, enemy.stagger + 20);
              if (enemy.stagger >= 100) { enemy.stunTimer = 2.0; enemy.stagger = 0; }
              eng.cameraShake = 0.8;
              eng.hitStopTimer = 0.055;
              renderer3d.triggerHitSparks(enemy.x, enemy.y, false);
              if (enemy.hp <= 0) {
                killEnemyRef.current(enemy, 'offhand');
              }
            }
          }
          if (offHitAny) eng.offHandSwingTimer = 0.52;
        }
        if (eng.offHandSwingTimer >= 1) eng.offHandSwingTimer = 0;
      }

      // Right Hand Power Swing Charge: drain stamina continuously while holding melee power attack!
      if (eng.powerSwingCharging && eng.powerSwingTimer === 0) {
        eng.powerSwingChargeElapsed += dt;
        eng.stamina = Math.max(0, eng.stamina - 22 * dt);
        if (eng.stamina <= 0) {
          // Out of stamina: auto-release or cancel charging
          eng.powerSwingCharging = false;
          if (eng.powerSwingChargeElapsed >= 0.28) {
            performPowerAttackRef.current();
          }
          eng.powerSwingChargeElapsed = 0;
        }
      }

      if (eng.powerSwingTimer > 0 && eng.hitStopTimer <= 0) {
        const powerSpeed = Math.max(0.75, 1.15 - (eng.weaponWeight || 4) * 0.04);
        eng.powerSwingTimer += dt * powerSpeed;

        if (eng.powerSwingTimer >= 0.44 && !eng.powerSwingHitChecked) {
          eng.powerSwingHitChecked = true;
          const base = eng.baseDamage + eng.weaponBonus + Math.floor(Math.random() * 8);
          const extraPen = 20;
          const dirX = Math.cos(eng.playerAngle);
          const dirY = Math.sin(eng.playerAngle);
          let powerHitAny = false;

          for (const enemy of eng.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - eng.playerX;
            const dy = enemy.y - eng.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1.5) continue;
            const dot = (dx / dist) * dirX + (dy / dist) * dirY;
            if (dot > 0.45) {
              powerHitAny = true;
              const is2H = eng.mainHandItem?.twoHanded || eng.mainHandItem?.handSlot === 'two_handed';
              const powerDmg = Math.floor(base * (is2H ? 2.5 : 2.0));
              const aimInfo = renderer3d.getEnemyUnderAim([enemy]);
              const hitZone = aimInfo ? aimInfo.zone : (eng.playerPitch < -0.15 ? 'head' : eng.playerPitch > 0.18 ? 'legs' : 'torso');
              const isJoint = aimInfo ? aimInfo.isJoint : false;
              const wepDmgType: any = eng.mainHandItem?.damageType || 'slash';
              const calc = calculatePerSlotDamage(
                powerDmg,
                wepDmgType,
                eng.weaponPenetration + extraPen,
                hitZone,
                enemy.armorSlots || {}
              );
              const finalDmg = calc.finalDamage;
              if (calc.bypassedArmor) {
                setMishapBanner('★ СОЧЛЕНЕНИЕ! Сокрушительный удар в стык доспеха! ★');
                setTimeout(() => setMishapBanner(null), 2000);
              }
              if (wepDmgType === 'blunt' || is2H) {
                enemy.stunTimer = Math.max(enemy.stunTimer, 2.0);
              } else if (wepDmgType === 'slash') {
                enemy.bleedTimer = 6.0;
                enemy.bleedDps = 6.0;
              }
              enemy.hp -= finalDmg;
              enemy.hurtTimer = 0.35;
              enemy.stagger = Math.min(100, enemy.stagger + 50);
              if (enemy.stagger >= 100) { enemy.stunTimer = 2.8; enemy.stagger = 0; }
              eng.cameraShake = 1.35;
              eng.hitStopTimer = 0.085;
              renderer3d.triggerPowerHitSparks(enemy.x, enemy.y);
              if (enemy.hp <= 0) {
                killEnemyRef.current(enemy, 'power_attack');
              }
            }
          }
          if (powerHitAny) eng.powerSwingTimer = 0.54;
        }

        if (eng.powerSwingTimer >= 1) eng.powerSwingTimer = 0;
      }

      // Left Hand Power Swing Charge: drain stamina continuously while holding!
      if (eng.offHandPowerSwingCharging && eng.offHandPowerSwingTimer === 0) {
        eng.offHandPowerSwingChargeElapsed += dt;
        eng.stamina = Math.max(0, eng.stamina - 22 * dt);
        if (eng.stamina <= 0) {
          // Out of stamina: auto-release or cancel charging
          eng.offHandPowerSwingCharging = false;
          if (eng.offHandPowerSwingChargeElapsed >= 0.28) {
            performOffHandPowerAttackRef.current();
          }
          eng.offHandPowerSwingChargeElapsed = 0;
        }
      }

      if (eng.offHandPowerSwingTimer > 0 && eng.hitStopTimer <= 0) {
        const offWeapon = eng.offHandItem;
        const offBonus = offWeapon?.damageBonus || 0;
        const offPen = offWeapon?.penetration || 0;
        const powerSpeed = Math.max(0.75, 1.2 - (offWeapon?.weight || 4) * 0.04);
        eng.offHandPowerSwingTimer += dt * powerSpeed;

        if (eng.offHandPowerSwingTimer >= 0.44 && !eng.offHandPowerSwingHitChecked) {
          eng.offHandPowerSwingHitChecked = true;
          const base = eng.baseDamage + offBonus + Math.floor(Math.random() * 8);
          const extraPen = 20;
          const dirX = Math.cos(eng.playerAngle);
          const dirY = Math.sin(eng.playerAngle);
          let powerHitAny = false;

          for (const enemy of eng.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - eng.playerX;
            const dy = enemy.y - eng.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1.5) continue;
            const dot = (dx / dist) * dirX + (dy / dist) * dirY;
            if (dot > 0.45) {
              powerHitAny = true;
              const powerDmg = Math.floor(base * 2.0);
              const aimInfo = renderer3d.getEnemyUnderAim([enemy]);
              const hitZone = aimInfo ? aimInfo.zone : (eng.playerPitch < -0.15 ? 'head' : eng.playerPitch > 0.18 ? 'legs' : 'torso');
              const isJoint = aimInfo ? aimInfo.isJoint : false;
              const offDmgType: any = eng.offHandItem?.damageType || 'slash';
              const calc = calculatePerSlotDamage(
                powerDmg,
                offDmgType,
                offPen + extraPen,
                hitZone,
                enemy.armorSlots || {}
              );
              const finalDmg = calc.finalDamage;
              if (offDmgType === 'slash') {
                enemy.bleedTimer = 6.0;
                enemy.bleedDps = 5.0;
              }
              enemy.hp -= finalDmg;
              enemy.hurtTimer = 0.35;
              enemy.stagger = Math.min(100, enemy.stagger + 50);
              if (enemy.stagger >= 100) { enemy.stunTimer = 2.8; enemy.stagger = 0; }
              eng.cameraShake = 1.35;
              eng.hitStopTimer = 0.085;
              renderer3d.triggerPowerHitSparks(enemy.x, enemy.y);
              if (enemy.hp <= 0) {
                killEnemyRef.current(enemy, 'offhand_power_attack');
              }
            }
          }
          if (powerHitAny) eng.offHandPowerSwingTimer = 0.54;
        }

        if (eng.offHandPowerSwingTimer >= 1) eng.offHandPowerSwingTimer = 0;
      }

      if (eng.parryAttemptTimer > 0) {
        eng.parryAttemptTimer = Math.max(0, eng.parryAttemptTimer - dt);
      }
      if (eng.parryCooldownTimer > 0) {
        eng.parryCooldownTimer = Math.max(0, eng.parryCooldownTimer - dt);
      }
      if (eng.parryWindowTimer > 0) {
        eng.parryWindowTimer = Math.max(0, eng.parryWindowTimer - dt);
      }
      if (eng.parryBonusTimer > 0) {
        eng.parryBonusTimer = Math.max(0, eng.parryBonusTimer - dt);
      }
      if (eng.hurtFlash > 0) {
        eng.hurtFlash = Math.max(0, eng.hurtFlash - dt * 3.5);
      }
      if (eng.playerStunTimer > 0) {
        eng.playerStunTimer = Math.max(0, eng.playerStunTimer - dt);
        eng.isBlocking = false;
      } else if (eng.playerStagger > 0) {
        eng.playerStagger = Math.max(0, eng.playerStagger - dt * 8);
      }
      // Do not regenerate stamina while actively holding a heavy weapon power charge or blocking
      if (!eng.isBlocking && !eng.powerSwingCharging && !eng.offHandPowerSwingCharging) {
        eng.stamina = Math.min(eng.maxStamina, eng.stamina + 16 * (eng.staminaRegenMult || 1.0) * dt);
      }

      // Spell cooldowns tick for all heroes holding staves or catalysts
      for (const spellKey in eng.spellCooldowns) {
        if (eng.spellCooldowns[spellKey] > 0) {
          eng.spellCooldowns[spellKey] = Math.max(0, eng.spellCooldowns[spellKey] - dt);
        }
      }

      // Tick cast progress for Right Hand
      if (eng.rhCasting && eng.rhCastTotal > 0) {
        eng.rhCastElapsed += dt;
        if (eng.rhCastElapsed >= eng.rhCastTotal) {
          fireCastSpellRef.current(eng.rhSpellId, 'right');
          eng.rhCasting = false;
          eng.rhCastElapsed = 0;
          renderer3dRef.current?.setStaffCharging(false);
        }
      }

      // Tick cast progress for Left Hand
      if (eng.lhCasting && eng.lhCastTotal > 0) {
        eng.lhCastElapsed += dt;
        if (eng.lhCastElapsed >= eng.lhCastTotal) {
          fireCastSpellRef.current(eng.lhSpellId, 'left');
          eng.lhCasting = false;
          eng.lhCastElapsed = 0;
        }
      }

      // Magic Passive Management (Passive Resonance Decay & Cooldowns)
      if (eng.hasMagic) {
        // Silence timer
        if (eng.silenceTimer > 0) {
          eng.silenceTimer = Math.max(0, eng.silenceTimer - dt);
        }

        // Track time since last cast -> Reset resonance only after 60 seconds of inactivity!
        eng.timeSinceLastCast += dt;
        if (eng.timeSinceLastCast >= 60.0 && eng.resonance > 0) {
          eng.resonance = 0;
          setMishapBanner('Эфир успокоился: шкала нагнетания сброшена до 0');
          setTimeout(() => setMishapBanner(null), 2500);
        }
      }

      if (eng.isMapOpen) {
        renderer3d.updateMapTexture(
          INITIAL_MAP,
          eng.explored,
          eng.playerX,
          eng.playerY,
          eng.playerAngle
        );
      }

      // Bow update loop: draw advances at rate 1 / drawTime (drawTime = 0.8s)
      if (eng.bow.recoverTimer > 0) {
        eng.bow.recoverTimer = Math.max(0, eng.bow.recoverTimer - dt);
        if (eng.bow.recoverTimer === 0 && eng.bow.state === 'recover') {
          eng.bow.state = 'idle';
        }
      }

      // Check if modal window or stun or blocking cancels drawing
      const isAnyModalOpen = inventoryOpen || journalOpen || grimoireOpen || noticeBoardOpen || !!activeDialog;
      if (eng.playerStunTimer > 0 || eng.isBlocking || isAnyModalOpen) {
        if (eng.bow.state === 'drawing' || eng.bow.state === 'full') {
          eng.bow.state = 'idle';
          eng.bow.draw = 0;
        }
      }

      if (eng.bow.state === 'drawing') {
        const drawTime = 0.8;
        eng.bow.draw = Math.min(1.0, eng.bow.draw + dt / drawTime);
        if (eng.bow.draw >= 1.0) {
          eng.bow.state = 'full';
          eng.bow.draw = 1.0;
        }
      } else if (eng.bow.state === 'full') {
        eng.bow.draw = 1.0;
      } else if (eng.bow.state === 'idle') {
        if (eng.bow.draw > 0) {
          eng.bow.draw = Math.max(0, eng.bow.draw - dt * 4.0);
        }
      }

      // Render Low-Poly 3D Scene
      renderer3d.render(
        eng.playerX,
        eng.playerY,
        eng.playerAngle,
        eng.playerPitch,
        eng.enemies,
        eng.items,
        eng.swingTimer,
        eng.isBlocking,
        now / 1000,
        eng.cameraShake,
        eng.isMapOpen,
        eng.offHandSwingTimer,
        eng.powerSwingTimer,
        eng.parryAttemptTimer,
        eng.offHandPowerSwingTimer,
        eng.powerSwingCharging && eng.powerSwingChargeElapsed >= 0.22,
        eng.offHandPowerSwingCharging && eng.offHandPowerSwingChargeElapsed >= 0.22,
        eng.bow.draw
      );

      // Sync React HUD
      hudSyncTimer += dt;
      if (hudSyncTimer >= 0.065) {
        hudSyncTimer = 0;
        setHud({
          hp: eng.hp,
          maxHp: eng.maxHp,
          stamina: Math.floor(eng.stamina),
          maxStamina: eng.maxStamina,
          resonance: Math.floor(eng.resonance),
          magicGuard: eng.magicGuard,
          hasMagic: eng.hasMagic,
          level: eng.level,
          xp: eng.xp,
          nextXp: eng.nextXp,
          gold: eng.gold,
          kills: eng.kills,
          potions: eng.potions,
          weaponName: eng.weaponName,
          weaponBonus: eng.weaponBonus,
          weaponPenetration: eng.weaponPenetration,
          weaponWeight: eng.weaponWeight,
          shieldBlockStrength: eng.shieldBlockStrength,
          shieldBlockEfficiency: eng.shieldBlockEfficiency,
          shieldWeight: eng.shieldWeight,
          playerArmor: eng.playerArmor,
          armorHead: eng.armorHead,
          armorTorso: eng.armorTorso,
          armorArms: eng.armorArms,
          armorLegs: eng.armorLegs,
          staminaRegenMult: eng.staminaRegenMult,
          isBlocking: eng.isBlocking,
          parryBonusReady: eng.parryBonusTimer > 0,
          parryCooldown: Number(eng.parryCooldownTimer.toFixed(1)),
          isParrying: eng.parryAttemptTimer > 0,
          isPowerChargingRH: eng.powerSwingCharging,
          powerChargePctRH: Math.min(1, eng.powerSwingChargeElapsed / 0.30),
          isPowerChargingLH: eng.offHandPowerSwingCharging,
          powerChargePctLH: Math.min(1, eng.offHandPowerSwingChargeElapsed / 0.30),
          playerStagger: eng.playerStagger,
          playerStunTimer: eng.playerStunTimer,
          rhSpellId: eng.rhSpellId,
          lhSpellId: eng.lhSpellId,
          rhCasting: eng.rhCasting,
          lhCasting: eng.lhCasting,
          rhCastElapsed: eng.rhCastElapsed,
          rhCastTotal: eng.rhCastTotal,
          lhCastElapsed: eng.lhCastElapsed,
          lhCastTotal: eng.lhCastTotal,
          bowState: eng.bow.state,
          bowDraw: eng.bow.draw,
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      renderer3d.dispose();
    };
  }, [gameState, currentLocation]);

  return (
    <div className="w-screen h-screen bg-[#09080a] text-[#e6dcc8] relative overflow-hidden font-mono">
      {/* Full-Screen 3D Viewport */}
      <canvas
        ref={canvasRef}
        width={LOWPOLY_W}
        height={LOWPOLY_H}
        className={`w-full h-full object-contain cursor-crosshair block ${pixelFilterEnabled ? 'pixelated' : ''}`}
      />

      {/* Center Reticle Crosshair & Precision Aim Zone Indicator */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative flex flex-col items-center">
            {/* Precision 4-line Reticle Crosshair with Dynamic Joint/Hit Feedback */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              {/* Horizontal line */}
              <div
                className={`absolute h-[1.5px] transition-all duration-100 ${
                  aimedJoint
                    ? 'w-7 bg-[#f97316] shadow-[0_0_8px_#f97316]'
                    : interactionPrompt
                    ? 'w-6 bg-[#facc15] shadow-[0_0_6px_#facc15]'
                    : hud.isBlocking
                    ? 'w-5 bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]'
                    : 'w-4 bg-white/75 shadow-[0_0_3px_rgba(0,0,0,0.9)]'
                }`}
              />
              {/* Vertical line */}
              <div
                className={`absolute w-[1.5px] transition-all duration-100 ${
                  aimedJoint
                    ? 'h-7 bg-[#f97316] shadow-[0_0_8px_#f97316]'
                    : interactionPrompt
                    ? 'h-6 bg-[#facc15] shadow-[0_0_6px_#facc15]'
                    : hud.isBlocking
                    ? 'h-5 bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]'
                    : 'h-4 bg-white/75 shadow-[0_0_3px_rgba(0,0,0,0.9)]'
                }`}
              />
              {/* Center pip */}
              <div
                className={`w-1 h-1 rounded-full transition-all duration-100 ${
                  aimedJoint
                    ? 'bg-[#fbbf24] scale-150'
                    : interactionPrompt
                    ? 'bg-[#facc15]'
                    : 'bg-white'
                }`}
              />
            </div>



            {/* Interaction prompt badge */}
            {interactionPrompt && (
              <div className="absolute top-5 flex items-center gap-1.5 px-3 py-1 bg-[#14100c]/95 border border-[#ca8a04] shadow-[0_4px_16px_rgba(0,0,0,0.9)] text-xs whitespace-nowrap">
                <span className="font-bold text-[#facc15] bg-[#3a280e] px-1.5 py-0.5 border border-[#ca8a04]/60 rounded-xs">
                  E
                </span>
                <span className="text-[#fef08a] font-semibold tracking-wide">
                  {interactionPrompt}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dark-Fantasy Top-Left HP (Crimson) & Stamina (Angled Golden-Amber) Bars */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-4 left-4 w-72 space-y-2 pointer-events-none">
          {/* Crimson HP Bar */}
          <div className="w-full h-4 bg-[#140707]/95 border-2 border-[#3b0d0d] shadow-[0_2px_6px_rgba(0,0,0,0.9)] p-[1px]">
            <div
              className="h-full bg-gradient-to-b from-[#ef4444] via-[#b91c1c] to-[#7f1d1d] transition-all duration-100"
              style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
            />
          </div>

          {/* Angled Golden-Amber Stamina Bar */}
          <div
            className="w-64 h-3.5 bg-[#171005]/95 border-2 border-[#452b08] shadow-[0_2px_6px_rgba(0,0,0,0.9)] p-[1px]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 14px 100%)' }}
          >
            <div
              className="h-full bg-gradient-to-b from-[#fcd34d] via-[#d97706] to-[#92400e] transition-all duration-100"
              style={{ width: `${Math.max(0, (hud.stamina / hud.maxStamina) * 100)}%` }}
            />
          </div>

          {/* Purple/Red Magic Resonance & Mishap Danger Meter */}
          {hud.hasMagic && hud.resonance > 0 && (
            <div className="w-56 space-y-0.5">
              <div className="flex justify-between text-[9px] font-bold text-[#e6dcc8] leading-none drop-shadow-[1px_1px_0px_#000]">
                <span>НАГНЕТАНИЕ: {hud.resonance}%</span>
                <span
                  className={
                    Math.max(0, hud.resonance - hud.magicGuard * 2) > 0
                      ? 'text-[#ef4444]'
                      : 'text-[#4ade80]'
                  }
                >
                  Риск срыва: {Math.max(0, hud.resonance - hud.magicGuard * 2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#12071a]/95 border border-[#6b21a8] p-[1px]">
                <div
                  className={`h-full transition-all duration-150 ${
                    hud.resonance > 40
                      ? 'bg-gradient-to-r from-[#f59e0b] to-[#dc2626] animate-pulse'
                      : 'bg-gradient-to-r from-[#c084fc] to-[#7e22ce]'
                  }`}
                  style={{ width: `${Math.min(100, hud.resonance)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stagger / Stun Bar */}
          {(hud.playerStagger > 0 || hud.playerStunTimer > 0) && (
            <div className="w-52 h-2.5 bg-[#1a0d05]/95 border border-[#7c2d12] shadow-[0_2px_6px_rgba(0,0,0,0.9)] p-[1px]">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.playerStunTimer > 0
                    ? 'bg-gradient-to-r from-[#fef08a] via-[#f97316] to-[#ef4444] animate-pulse'
                    : 'bg-gradient-to-b from-[#fb923c] to-[#c2410c]'
                }`}
                style={{
                  width: `${hud.playerStunTimer > 0 ? 100 : Math.min(100, hud.playerStagger)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}



      {/* Bottom-Left Backpack ("I"), Grimoire ("G") & Healing Potion ("Q") */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
          <button
            onClick={() => {
              setInventoryOpen((prev) => {
                const next = !prev;
                if (next) document.exitPointerLock?.();
                return next;
              });
            }}
            className="relative w-12 h-12 bg-[#0f0d0c]/90 hover:bg-[#1c1816] border-2 border-[#574c41] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.9)] cursor-pointer"
            title="Инвентарь (I)"
          >
            <Backpack className="w-6 h-6 text-[#d4af37]" />
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-[#e6dcc8] leading-none">
              I
            </span>
          </button>

          {/* Quests Journal Button ("J") */}
          <button
            onClick={() => {
              setJournalOpen((prev) => {
                const next = !prev;
                if (next) document.exitPointerLock?.();
                return next;
              });
            }}
            className="relative w-12 h-12 bg-[#0f0d0c]/90 hover:bg-[#1c1816] border-2 border-[#574c41] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.9)] cursor-pointer"
            title="Журнал заданий (J)"
          >
            <span className="text-xl">📜</span>
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-[#e6dcc8] leading-none">
              J
            </span>
          </button>

          {/* Grimoire Button (For Mages) */}
          {hud.hasMagic && (
            <button
              onClick={() => {
                setGrimoireOpen((prev) => {
                  const next = !prev;
                  if (next) document.exitPointerLock?.();
                  return next;
                });
              }}
              className="relative w-12 h-12 bg-[#12081f]/90 hover:bg-[#1e1033] border-2 border-[#8b5cf6] flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(139,92,246,0.3)] cursor-pointer"
              title="Гримуар Знаков (G)"
            >
              <div className="w-5 h-6 bg-[#6d28d9] border border-[#c4b5fd] rounded-xs flex items-center justify-center shadow-inner">
                <div className="w-2 h-2 rounded-full bg-[#facc15]" />
              </div>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-[#e6dcc8] leading-none">
                G
              </span>
            </button>
          )}

          <button
            onClick={() => {
              const eng = engineRef.current;
              if (eng.potions > 0 && eng.hp < eng.maxHp) {
                eng.potions -= 1;
                eng.hp = Math.min(eng.maxHp, eng.hp + 45);
                renderer3dRef.current?.triggerHealFlash();
              }
            }}
            className={`relative w-12 h-12 bg-[#0f0d0c]/90 hover:bg-[#1c1816] border-2 border-[#574c41] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.9)] cursor-pointer ${
              hud.potions === 0 ? 'opacity-50' : ''
            }`}
            title="Выпить зелье лечения (Q)"
          >
            <PotionFlaskIcon className="w-7 h-7 drop-shadow-[0_2px_6px_rgba(239,68,68,0.7)]" />
            <span className="absolute top-0.5 left-1 text-[11px] font-bold text-[#ef4444] leading-none drop-shadow-[1px_1px_0px_#000]">
              {hud.potions}
            </span>
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-[#e6dcc8] leading-none">
              Q
            </span>
          </button>
        </div>
      )}



      {/* Cast Bar - Center above Hotbar */}
      {gameState === 'PLAYING' && hud.hasMagic && (hud.rhCasting || hud.lhCasting) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center z-30 pointer-events-none select-none">
          {hud.rhCasting && hud.rhSpellId && (() => {
            const spell = ALL_SPELLS.find((s) => s.id === hud.rhSpellId);
            const total = hud.rhCastTotal ?? 0;
            const elapsed = hud.rhCastElapsed ?? 0;
            const pct = total > 0 ? Math.min(1, elapsed / total) : 1;
            const rem = Math.max(0, total - elapsed).toFixed(1);
            return (
              <div className="flex items-center gap-2 bg-[#0c0907]/95 border-2 border-[#5c3e24] px-3 py-1.5 w-72 shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: spell?.color, boxShadow: `0 0 8px ${spell?.color}` }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#e6dcc8] mb-0.5">
                    <span>{spell?.name || 'Заклинание'} · [ЛКМ Правая]</span>
                    <span className="text-[#facc15] font-mono">{rem}с</span>
                  </div>
                  <div className="w-full h-2 bg-[#1b120c] border border-[#3d2716] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-none"
                      style={{
                        width: `${pct * 100}%`,
                        backgroundColor: spell?.color || '#f97316',
                        boxShadow: `0 0 10px ${spell?.color || '#f97316'}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {hud.lhCasting && hud.lhSpellId && (() => {
            const spell = ALL_SPELLS.find((s) => s.id === hud.lhSpellId);
            const total = hud.lhCastTotal ?? 0;
            const elapsed = hud.lhCastElapsed ?? 0;
            const pct = total > 0 ? Math.min(1, elapsed / total) : 1;
            const rem = Math.max(0, total - elapsed).toFixed(1);
            return (
              <div className="flex items-center gap-2 bg-[#0c0907]/95 border-2 border-[#5c3e24] px-3 py-1.5 w-72 shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: spell?.color, boxShadow: `0 0 8px ${spell?.color}` }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#e6dcc8] mb-0.5">
                    <span>{spell?.name || 'Заклинание'} · [ПКМ Левая]</span>
                    <span className="text-[#38bdf8] font-mono">{rem}с</span>
                  </div>
                  <div className="w-full h-2 bg-[#1b120c] border border-[#3d2716] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-none"
                      style={{
                        width: `${pct * 100}%`,
                        backgroundColor: spell?.color || '#38bdf8',
                        boxShadow: `0 0 10px ${spell?.color || '#38bdf8'}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Dual Hand Spell Slots HUD Cards */}
      {gameState === 'PLAYING' && hud.hasMagic && (
        <>
          {/* Left Hand (ПКМ) Card */}
          <div className="absolute bottom-20 left-4 z-20 flex flex-col items-start gap-1 select-none">
            {(() => {
              const spell = ALL_SPELLS.find((s) => s.id === (hud.lhSpellId ?? lhSpellId));
              return (
                <div
                  className="bg-[#120c08]/90 border border-[#523821] hover:border-[#38bdf8] px-2.5 py-1.5 flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                  title="Левая рука (Сфера): удерживайте ПКМ для каста. Назначить: Shift + [1-5]"
                  onClick={() => {
                    setGrimoireOpen(true);
                  }}
                >
                  <span className="text-[9px] font-bold text-[#38bdf8] border border-[#38bdf8]/40 px-1 py-0.2 bg-[#38bdf8]/10 rounded-xs">
                    ПКМ
                  </span>
                  {spell ? (
                    <>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: spell.color, boxShadow: `0 0 6px ${spell.color}` }}
                      />
                      <span className="text-[10px] font-bold text-[#fef08a]">{spell.name}</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-[#6b5a47]">Пусто</span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right Hand (ЛКМ) Card */}
          <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-1 select-none">
            {(() => {
              const spell = ALL_SPELLS.find((s) => s.id === (hud.rhSpellId ?? rhSpellId));
              return (
                <div
                  className="bg-[#120c08]/90 border border-[#523821] hover:border-[#f97316] px-2.5 py-1.5 flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                  title="Правая рука (Посох): удерживайте ЛКМ для каста. Назначить: клавиши [1-5]"
                  onClick={() => {
                    setGrimoireOpen(true);
                  }}
                >
                  {spell ? (
                    <>
                      <span className="text-[10px] font-bold text-[#fef08a]">{spell.name}</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: spell.color, boxShadow: `0 0 6px ${spell.color}` }}
                      />
                    </>
                  ) : (
                    <span className="text-[10px] text-[#6b5a47]">Пусто</span>
                  )}
                  <span className="text-[9px] font-bold text-[#f97316] border border-[#f97316]/40 px-1 py-0.2 bg-[#f97316]/10 rounded-xs">
                    ЛКМ
                  </span>
                </div>
              );
            })()}
          </div>
        </>
      )}

            {/* Bow Action Card */}
      {gameState === 'PLAYING' && (mainHandItem?.iconType === 'bow' || mainHandItem?.name?.toLowerCase().includes('лук')) && (
        <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-1 select-none pointer-events-none">
          <div className="bg-[#120c08]/90 border border-[#b45309] px-3 py-1.5 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
            <BowIcon className="w-5 h-5 text-[#f59e0b]" />
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-[#fef08a]">{mainHandItem.name}</span>
              <span className="text-[9px] text-[#a89f91]">
                {hud.bowState === 'recover'
                  ? 'Восстановление...'
                  : (hud.bowDraw || 0) >= 1.0
                  ? 'Полное натяжение (макс. урон)'
                  : (hud.bowDraw || 0) >= 0.2
                  ? `Натяжение: ${Math.round((hud.bowDraw || 0) * 100)}% (готов к выстрелу)`
                  : (hud.bowDraw || 0) > 0
                  ? 'Натяжение тетивы...'
                  : 'Зажмите ЛКМ/Space/ПКМ для натяжения'}
              </span>
            </div>
            <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-xs transition-colors ${
              (hud.bowDraw || 0) >= 0.2
                ? 'text-[#fef08a] bg-[#ea580c] border-[#fde047]'
                : hud.bowState === 'recover'
                ? 'text-[#9ca3af] bg-[#374151]/30 border-[#4b5563]'
                : 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/40'
            }`}>
              {(hud.bowDraw || 0) >= 0.2 ? 'ВЫСТРЕЛ' : 'ЛКМ'}
            </span>
          </div>
          {(hud.bowDraw || 0) > 0 && (
            <div className="w-full h-1.5 bg-[#171005]/95 border border-[#452b08] p-[1px] shadow-md">
              <div
                className={`h-full transition-all duration-75 ${
                  (hud.bowDraw || 0) >= 1.0
                    ? 'bg-gradient-to-r from-[#eab308] to-[#facc15]'
                    : 'bg-gradient-to-r from-[#d97706] to-[#f59e0b]'
                }`}
                style={{ width: `${Math.round((hud.bowDraw || 0) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Center 1..5 Staff Spell Hotbar */}
      {gameState === 'PLAYING' && hud.hasMagic && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0f0c0a]/90 border border-[#44382c] px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.9)] z-20">
          {[0, 1, 2, 3, 4].map((slotIdx) => {
            const spellId = assignedSpellIds[slotIdx];
            const spell = ALL_SPELLS.find((s) => s.id === spellId);
            const isRight = (hud.rhSpellId ?? rhSpellId) === spellId;
            const isLeft = (hud.lhSpellId ?? lhSpellId) === spellId;

            return (
              <button
                key={slotIdx}
                onClick={(e) => {
                  setSelectedSpellSlot(slotIdx);
                  engineRef.current.selectedSpellSlot = slotIdx;
                  if (e.shiftKey) {
                    setLhSpellId(spellId);
                    engineRef.current.lhSpellId = spellId;
                    if (spell) {
                      renderer3dRef.current?.setOrbElementColor(spell.color);
                    }
                  } else {
                    setRhSpellId(spellId);
                    engineRef.current.rhSpellId = spellId;
                    if (spell) {
                      renderer3dRef.current?.setStaffElementColor(spell.color);
                    }
                  }
                }}
                className={`relative w-12 h-12 border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isRight
                    ? 'bg-[#362716] border-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.7)] scale-[1.08] z-10'
                    : isLeft
                    ? 'bg-[#122238] border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.7)] scale-[1.08] z-10'
                    : spell
                    ? 'bg-[#1a1512] hover:bg-[#28211b] border-[#d4af37]'
                    : 'bg-[#120f0e] border-[#2b241e] border-dashed hover:border-[#5a483a]'
                }`}
                title={
                  spell
                    ? `${spell.name} (Заготовка: ${spell.castTime}с) [Клик: в правую руку, Shift+Клик: в левую]`
                    : `Пустой слот ${slotIdx + 1} (Настройте в Гримуаре [G])`
                }
              >
                <span className={`absolute top-0.5 left-1 text-[9px] font-bold ${isRight ? 'text-[#f97316]' : isLeft ? 'text-[#38bdf8]' : 'text-[#8c8273]'}`}>
                  {slotIdx + 1}
                </span>
                {isRight && (
                  <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-[#f97316] shadow-[0_0_4px_#f97316]" title="Правая рука" />
                )}
                {isLeft && (
                  <span className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_4px_#38bdf8]" title="Левая рука" />
                )}
                {spell ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 rounded-full mb-0.5"
                      style={{ backgroundColor: spell.color, boxShadow: `0 0 6px ${spell.color}` }}
                    />
                    <span className="text-[8px] font-bold text-[#fef08a] truncate max-w-[42px] leading-tight">
                      {spell.name}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-[#3d362e]">·</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Mishap / Spell Alert Toast Banner */}
      {mishapBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#450a0a]/95 border-2 border-[#ef4444] px-4 py-2 shadow-[0_4px_24px_rgba(239,68,68,0.6)] text-center z-50 animate-bounce">
          <span className="text-xs font-bold text-[#fecaca] tracking-wide drop-shadow-[1px_1px_0px_#000]">
            ⚡ {mishapBanner}
          </span>
        </div>
      )}

      {/* Grimoire Modal with Drag-and-Drop */}
      <GrimoireModal
        isOpen={grimoireOpen}
        onClose={() => setGrimoireOpen(false)}
        assignedSpellIds={assignedSpellIds}
        onAssignSpell={(slotIdx, spellId) => {
          setAssignedSpellIds((prev) => {
            const next = [...prev];
            next[slotIdx] = spellId;
            engineRef.current.assignedSpellIds = next;
            return next;
          });
        }}
        resonance={hud.resonance}
        magicGuard={hud.magicGuard}
      />

      {/* WoW/Diablo-Style Character Paperdoll & Bag Panel */}
      {gameState === 'PLAYING' && inventoryOpen && (
        <div className="absolute bottom-20 left-4 flex items-start gap-2.5 z-20 select-none">
          <div className="w-[480px] bg-[#1a1715]/95 border-2 border-[#8c7a5b] p-3.5 space-y-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.95)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#3d3935] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-[#d4af37] drop-shadow-[1px_1px_0px_#000]">
                {selectedClass.name.toUpperCase()} · УРОВЕНЬ {hud.level}
              </span>
              <span className="text-[10px] text-[#a89f91] bg-[#12100f] px-1.5 py-0.5 border border-[#3d3935]">
                {hud.locationName || 'Склеп Пепла'}
              </span>
            </div>
            <button
              onClick={() => setInventoryOpen(false)}
              className="px-2 py-0.5 bg-[#12100f] hover:bg-[#2e2924] border border-[#57524c] text-xs text-[#a89f91] hover:text-[#fffbeb] cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Paperdoll: Left Slots | Center Character Art | Right Slots */}
          <div className="grid grid-cols-[100px_1fr_100px] gap-2 items-center bg-[#110f0e] border border-[#3d3935] p-2">
            {/* Left Equipment Column: 4 Слота Брони по Зонам Тела + Амулет */}
            <div className="space-y-1.5">
              {[
                {
                  id: 'slot_head',
                  label: 'Голова (Шлем)',
                  name: equippedHelmet ? equippedHelmet.name : 'Пусто (Без шлема)',
                  itemRef: equippedHelmet,
                  icon: <HelmetIcon className="w-4 h-4 text-[#cbd5e1] flex-shrink-0" />,
                  stats: equippedHelmet ? equippedHelmet.stats : 'Нет защиты головы',
                  lore: equippedHelmet ? equippedHelmet.lore : 'Шлем защищает от смертоносных ударов сверху.',
                  onUnEquip: () => {
                    if (equippedHelmet) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = equippedHelmet;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setEquippedHelmet(null);
                        engineRef.current.equippedHelmet = null;
                        engineRef.current.armorHead = { slash: 0, blunt: 0, pierce: 0 };
                      }
                    }
                  },
                },
                {
                  id: 'slot_torso',
                  label: 'Корпус (Нагрудник)',
                  name: equippedTorso ? equippedTorso.name : 'Пусто (Без брони)',
                  itemRef: equippedTorso,
                  icon: <ArmorIcon className="w-4 h-4 text-[#e2e8f0] flex-shrink-0" />,
                  stats: equippedTorso ? equippedTorso.stats : 'Нет защиты корпуса',
                  lore: equippedTorso ? equippedTorso.lore : 'Нагрудник принимает на себя основные удары по торсу и спине.',
                  onUnEquip: () => {
                    if (equippedTorso) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = equippedTorso;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setEquippedTorso(null);
                        engineRef.current.equippedTorso = null;
                        engineRef.current.armorTorso = { slash: 0, blunt: 0, pierce: 0 };
                      }
                    }
                  },
                },
                {
                  id: 'slot_arms',
                  label: 'Руки (Наручи)',
                  name: equippedArms ? equippedArms.name : 'Пусто (Без наручей)',
                  itemRef: equippedArms,
                  icon: <GlovesIcon className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />,
                  stats: equippedArms ? equippedArms.stats : 'Нет защиты рук',
                  lore: equippedArms ? equippedArms.lore : 'Наручи и перчатки смягчают попадания по рукам и плечам.',
                  onUnEquip: () => {
                    if (equippedArms) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = equippedArms;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setEquippedArms(null);
                        engineRef.current.equippedArms = null;
                        engineRef.current.armorArms = { slash: 0, blunt: 0, pierce: 0 };
                      }
                    }
                  },
                },
                {
                  id: 'slot_legs',
                  label: 'Ноги (Поножи)',
                  name: equippedLegs ? equippedLegs.name : 'Пусто (Без поножей)',
                  itemRef: equippedLegs,
                  icon: <LegsIcon className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />,
                  stats: equippedLegs ? equippedLegs.stats : 'Нет защиты ног',
                  lore: equippedLegs ? equippedLegs.lore : 'Поножи защищают бедра и голени при нижних рубящих атаках.',
                  onUnEquip: () => {
                    if (equippedLegs) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = equippedLegs;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setEquippedLegs(null);
                        engineRef.current.equippedLegs = null;
                        engineRef.current.armorLegs = { slash: 0, blunt: 0, pierce: 0 };
                      }
                    }
                  },
                },
                {
                  id: 'amulet',
                  label: 'Амулет',
                  name: 'Оберег Пепла',
                  icon: <AmuletIcon className="w-4 h-4 text-[#facc15] flex-shrink-0" />,
                  stats: '+15% к восстановлению сил',
                  lore: 'Древний рубиновый амулет с тлеющим огоньком.',
                },
              ].map((slot) => (
                <div
                  key={slot.id}
                  onClick={slot.onUnEquip}
                  onMouseEnter={() => {
                    if (slot.itemRef) setSelectedWeaponForInspection(slot.itemRef);
                    setHoveredSlot({
                      title: slot.name,
                      subtitle: slot.label,
                      stats: slot.stats,
                      lore: slot.lore,
                    });
                  }}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className="h-10 px-1.5 bg-[#171513] hover:bg-[#25211e] border border-[#484139] hover:border-[#d4af37] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {slot.icon}
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-[8px] text-[#8c8273] uppercase truncate">{slot.label}</span>
                    <span className="text-[10px] text-[#e6dcc8] font-bold truncate mt-0.5">
                      {slot.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Center: Full Class Art Drawing + Main & Off Hand */}
            <div className="flex flex-col items-center justify-between h-full py-0.5">
              <div className="relative flex items-center justify-center p-1 bg-[#0d0c0b] border border-[#2b2622] w-full">
                <CharacterPaperdollArt heroClass={selectedClass.id} />
                <span className="absolute bottom-1 right-2 text-[9px] text-[#78716a] tracking-wide">
                  {selectedClass.name}
                </span>
              </div>

              {/* Main Hand & Off Hand Slots with Full Drag-and-Drop */}
              <div className="grid grid-cols-2 gap-1.5 w-full mt-1.5">
                <div
                  draggable={!!mainHandItem}
                  onDragStart={(e) => {
                    if (mainHandItem) {
                      e.dataTransfer.setData('text/plain', 'mainHand');
                      setDragSource('mainHand');
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget('mainHand');
                  }}
                  onDragLeave={() => {
                    if (dragOverTarget === 'mainHand') setDragOverTarget(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const src = e.dataTransfer.getData('text/plain') || dragSource;
                    setDragOverTarget(null);
                    setDragSource(null);
                    if (!src || src === 'mainHand') return;

                    if (src === 'offHand') {
                      const draggedItem = offHandItem;
                      if (draggedItem && draggedItem.type === 'weapon' && draggedItem.handSlot !== 'left_only') {
                        const oldMain = mainHandItem;
                        const oldCanGoLeft = !oldMain || oldMain.handSlot === 'both' || oldMain.handSlot === 'left_only' || oldMain.type === 'shield' || oldMain.type === 'focus';
                        if (oldCanGoLeft) {
                          setMainHandItem(draggedItem);
                          engineRef.current.mainHandItem = draggedItem;
                          engineRef.current.weaponName = draggedItem.name;
                          engineRef.current.weaponBonus = draggedItem.damageBonus || 0;
                          engineRef.current.weaponPenetration = draggedItem.penetration || 0;
                          engineRef.current.weaponWeight = draggedItem.weight || 4.0;
                          setOffHandItem(oldMain);
                          engineRef.current.offHandItem = oldMain;
                          if (oldMain?.blockStrength !== undefined) engineRef.current.shieldBlockStrength = oldMain.blockStrength;
                          renderer3dRef.current?.setEquippedItems(draggedItem, oldMain);
                        }
                      }
                    } else if (src.startsWith('bag_')) {
                      const bagIdx = parseInt(src.replace('bag_', ''), 10);
                      const draggedItem = bagSlots[bagIdx];
                      if (draggedItem && draggedItem.type === 'weapon' && draggedItem.handSlot !== 'left_only') {
                        const is2H = draggedItem.twoHanded || draggedItem.handSlot === 'two_handed';
                        const oldWeapon = mainHandItem;
                        const nextBag = [...bagSlots];

                        if (is2H && offHandItem) {
                          // Two-handed weapon unequips offHand item into bag!
                          const freeBagIdx = nextBag.findIndex((s, i) => i !== bagIdx && s === null);
                          if (freeBagIdx !== -1) {
                            nextBag[freeBagIdx] = offHandItem;
                            setOffHandItem(null);
                            engineRef.current.offHandItem = null;
                          } else {
                            // If bag full, cannot equip 2H weapon while holding offHand
                            setMishapBanner('Сумка полна! Освободите место для снятия предмета из левой руки.');
                            setTimeout(() => setMishapBanner(null), 2500);
                            return;
                          }
                        }

                        nextBag[bagIdx] = oldWeapon;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;

                        setMainHandItem(draggedItem);
                        engineRef.current.mainHandItem = draggedItem;
                        engineRef.current.weaponName = draggedItem.name;
                        engineRef.current.weaponBonus = draggedItem.damageBonus || 0;
                        engineRef.current.weaponPenetration = draggedItem.penetration || 0;
                        engineRef.current.weaponWeight = draggedItem.weight || 4.0;
                        renderer3dRef.current?.setEquippedItems(draggedItem, is2H ? null : offHandItem);
                      }
                    }
                  }}
                  onDragEnd={() => {
                    setDragSource(null);
                    setDragOverTarget(null);
                  }}
                  onClick={() => {
                    // Click on Main Hand un-equips weapon to bag if free slot exists
                    if (mainHandItem) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = mainHandItem;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setMainHandItem(null);
                        engineRef.current.mainHandItem = null;
                        engineRef.current.weaponName = 'Кулаки';
                        engineRef.current.weaponBonus = 0;
                        engineRef.current.weaponPenetration = 0;
                        renderer3dRef.current?.setEquippedItems(null, offHandItem);
                      }
                    }
                  }}
                  onMouseEnter={() => {
                    if (mainHandItem) setSelectedWeaponForInspection(mainHandItem);
                    setHoveredSlot(
                      mainHandItem
                        ? {
                            title: mainHandItem.name,
                            subtitle: mainHandItem.subtitle,
                            stats: mainHandItem.stats,
                            lore: mainHandItem.lore,
                          }
                        : {
                            title: 'Пустая правая рука',
                            subtitle: 'Оружие ближнего боя / Посох',
                            stats: 'Урон: базовый кулачный',
                            lore: 'Перетащите сюда оружие из сумки (или кликните по нему).',
                          }
                    );
                  }}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className={`h-11 px-1.5 border flex items-center gap-1.5 transition-all select-none ${
                    dragOverTarget === 'mainHand'
                      ? 'bg-[#3b2a1a] border-[#eab308] scale-[1.04] shadow-[0_0_12px_rgba(234,179,8,0.6)]'
                      : dragSource === 'mainHand'
                      ? 'bg-[#251f19] border-[#8c7a5b] opacity-40 cursor-grabbing'
                      : 'bg-[#171513] hover:bg-[#25211e] border-[#8c7a5b] hover:border-[#d4af37] cursor-pointer'
                  }`}
                >
                  {mainHandItem ? (
                    mainHandItem.iconType === 'staff' ? (
                      <StaffWeaponIcon className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <SwordWeaponIcon
                        isSteel={mainHandItem.iconType === 'steel_sword'}
                        className="w-5 h-5 flex-shrink-0"
                      />
                    )
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center text-[#5c5449] text-xs">∅</div>
                  )}
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-[8px] text-[#d4af37] uppercase">Правая рука</span>
                    <span className="text-[10px] text-[#fef08a] font-bold truncate mt-0.5">
                      {mainHandItem ? mainHandItem.name : 'Кулаки'}
                    </span>
                  </div>
                </div>

                <div
                  draggable={!!offHandItem}
                  onDragStart={(e) => {
                    if (offHandItem) {
                      e.dataTransfer.setData('text/plain', 'offHand');
                      setDragSource('offHand');
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget('offHand');
                  }}
                  onDragLeave={() => {
                    if (dragOverTarget === 'offHand') setDragOverTarget(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const src = e.dataTransfer.getData('text/plain') || dragSource;
                    setDragOverTarget(null);
                    setDragSource(null);
                    if (!src || src === 'offHand') return;

                    if (src === 'mainHand') {
                      // Swap: main-hand → off-hand
                      const draggedItem = mainHandItem;
                      if (draggedItem) {
                        const canGoLeft = draggedItem.handSlot !== 'right_only' && (draggedItem.type === 'weapon' || draggedItem.type === 'shield' || draggedItem.type === 'focus');
                        if (canGoLeft) {
                          const oldOff = offHandItem;
                          const oldCanGoRight = !oldOff || oldOff.type === 'weapon' && oldOff.handSlot !== 'left_only';
                          if (oldCanGoRight || !oldOff) {
                            setOffHandItem(draggedItem);
                            engineRef.current.offHandItem = draggedItem;
                            if (draggedItem.blockStrength !== undefined) engineRef.current.shieldBlockStrength = draggedItem.blockStrength;
                            if (oldOff && oldOff.type === 'weapon') {
                              setMainHandItem(oldOff);
                              engineRef.current.mainHandItem = oldOff;
                              engineRef.current.weaponName = oldOff.name;
                              engineRef.current.weaponBonus = oldOff.damageBonus || 0;
                              engineRef.current.weaponPenetration = oldOff.penetration || 0;
                              engineRef.current.weaponWeight = oldOff.weight || 4.0;
                            } else {
                              setMainHandItem(null);
                              engineRef.current.mainHandItem = null;
                              engineRef.current.weaponName = 'Кулаки';
                              engineRef.current.weaponBonus = 0;
                              engineRef.current.weaponPenetration = 0;
                            }
                            renderer3dRef.current?.setEquippedItems(engineRef.current.mainHandItem, draggedItem);
                          }
                        }
                      }
                    } else if (src.startsWith('bag_')) {
                      const bagIdx = parseInt(src.replace('bag_', ''), 10);
                      const draggedItem = bagSlots[bagIdx];
                      if (mainHandItem && (mainHandItem.twoHanded || mainHandItem.handSlot === 'two_handed')) {
                        setMishapBanner('Нельзя экипировать предмет в левую руку: в руках Двуручное оружие!');
                        setTimeout(() => setMishapBanner(null), 2500);
                        return;
                      }
                      const canGoLeft =
                        draggedItem &&
                        draggedItem.handSlot !== 'right_only' &&
                        draggedItem.handSlot !== 'two_handed' &&
                        (draggedItem.type === 'shield' ||
                          draggedItem.type === 'focus' ||
                          draggedItem.handSlot === 'left_only' ||
                          draggedItem.handSlot === 'both');
                      if (canGoLeft) {
                        const oldOffHand = offHandItem;
                        const nextBag = [...bagSlots];
                        nextBag[bagIdx] = oldOffHand;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;

                        setOffHandItem(draggedItem);
                        engineRef.current.offHandItem = draggedItem;
                        if (draggedItem.blockStrength !== undefined) {
                          engineRef.current.shieldBlockStrength = draggedItem.blockStrength;
                        }
                        if (draggedItem.magicGuardBonus !== undefined) {
                          engineRef.current.magicGuard += draggedItem.magicGuardBonus;
                        }
                        renderer3dRef.current?.setEquippedItems(mainHandItem, draggedItem);
                      }
                    }
                  }}
                  onDragEnd={() => {
                    setDragSource(null);
                    setDragOverTarget(null);
                  }}
                  onClick={() => {
                    // Click on Off Hand un-equips to bag if free slot exists
                    if (offHandItem) {
                      const freeIdx = bagSlots.findIndex((s) => s === null);
                      if (freeIdx !== -1) {
                        const nextBag = [...bagSlots];
                        nextBag[freeIdx] = offHandItem;
                        setBagSlots(nextBag);
                        engineRef.current.bagSlots = nextBag;
                        setOffHandItem(null);
                        engineRef.current.offHandItem = null;
                        renderer3dRef.current?.setEquippedItems(mainHandItem, null);
                      }
                    }
                  }}
                  onMouseEnter={() => {
                    if (offHandItem) setSelectedWeaponForInspection(offHandItem);
                    setHoveredSlot(
                      offHandItem
                        ? {
                            title: offHandItem.name,
                            subtitle: offHandItem.subtitle,
                            stats: offHandItem.stats,
                            lore: offHandItem.lore,
                          }
                        : {
                            title: 'Пустая левая рука',
                            subtitle: 'Щит / Сфера / Оружие (двойной хват)',
                            stats: 'Защита: нет',
                            lore: 'Щит для блока, Сфера для левой руки заклинаний, или второе оружие для двойного хвата.',
                          }
                    );
                  }}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className={`h-11 px-1.5 border flex items-center gap-1.5 transition-all select-none ${
                    dragOverTarget === 'offHand'
                      ? 'bg-[#3b2a1a] border-[#eab308] scale-[1.04] shadow-[0_0_12px_rgba(234,179,8,0.6)]'
                      : dragSource === 'offHand'
                      ? 'bg-[#251f19] border-[#8c7a5b] opacity-40 cursor-grabbing'
                      : 'bg-[#171513] hover:bg-[#25211e] border-[#8c7a5b] hover:border-[#d4af37] cursor-pointer'
                  }`}
                >
                  {offHandItem ? (
                    offHandItem.iconType === 'orb' ? (
                      <MagicOrbIcon className="w-5 h-5 flex-shrink-0" />
                    ) : offHandItem.iconType === 'staff' ? (
                      <StaffWeaponIcon className="w-5 h-5 flex-shrink-0" />
                    ) : offHandItem.iconType === 'sword' || offHandItem.iconType === 'steel_sword' ? (
                      <SwordWeaponIcon isSteel={offHandItem.iconType === 'steel_sword'} className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <ShieldItemIcon className="w-5 h-5 flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center text-[#5c5449] text-xs">∅</div>
                  )}
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-[8px] text-[#d4af37] uppercase">Левая рука</span>
                    <span className="text-[10px] text-[#e6dcc8] font-bold truncate mt-0.5">
                      {offHandItem ? offHandItem.name : 'Пусто'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Equipment Column: Сапоги, Кольца + Combat Stats */}
            <div className="space-y-1.5">
              {[
                {
                  id: 'boots',
                  label: 'Обувь',
                  name: 'Сапоги',
                  icon: <BootsIcon className="w-4 h-4 text-[#78716c] flex-shrink-0" />,
                  stats: '+10% к скорости шага',
                  lore: 'Подбитые сталью кожаные сапоги искателя приключений.',
                },
                {
                  id: 'ring1',
                  label: 'Кольцо I',
                  name: 'Перстень рубина',
                  icon: <RingIcon className="w-4 h-4 text-[#ef4444] flex-shrink-0" />,
                  stats: '+15 к макс. здоровью',
                  lore: 'Серебряный перстень с алым самоцветом.',
                },
                {
                  id: 'ring2',
                  label: 'Кольцо II',
                  name: 'Кольцо титана',
                  icon: <RingIcon className="w-4 h-4 text-[#eab308] flex-shrink-0" />,
                  stats: '-20% расхода выносливости',
                  lore: 'Массивное золотое кольцо с защитными рунами.',
                },
              ].map((slot) => (
                <div
                  key={slot.id}
                  onMouseEnter={() =>
                    setHoveredSlot({
                      title: slot.name,
                      subtitle: slot.label,
                      stats: slot.stats,
                      lore: slot.lore,
                    })
                  }
                  onMouseLeave={() => setHoveredSlot(null)}
                  className="h-10 px-1.5 bg-[#171513] hover:bg-[#25211e] border border-[#484139] hover:border-[#d4af37] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {slot.icon}
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-[8px] text-[#8c8273] uppercase">{slot.label}</span>
                    <span className="text-[10px] text-[#e6dcc8] font-bold truncate mt-0.5">
                      {slot.name}
                    </span>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Dedicated Combat Stats & Body Resistances Bar (Full Width, Zero Overlap!) */}
          <div className="grid grid-cols-2 gap-2 bg-[#12100f] border border-[#3d3935] p-2 text-[10px] tabular-nums">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[#a89f91]">
                <span>Урон оружия:</span>
                <span className="text-[#facc15] font-bold">
                  {selectedClass.baseDamage + hud.weaponBonus} ({mainHandItem?.damageType === 'pierce' ? 'Колющий' : mainHandItem?.damageType === 'blunt' ? 'Дробящий' : 'Рубящий'})
                </span>
              </div>
              <div className="flex justify-between items-center text-[#a89f91]">
                <span>Бронепробитие:</span>
                <span className="text-[#e6dcc8] font-bold">{hud.weaponPenetration}%</span>
              </div>
              <div className="flex justify-between items-center text-[#a89f91]">
                <span>Загрузка веса:</span>
                <span className="text-[#38bdf8] font-bold">
                  {(
                    (mainHandItem?.weight || 4) +
                    (offHandItem?.weight || 0) +
                    bagSlots.reduce((acc, it) => acc + (it?.weight || 1.5), 0)
                  ).toFixed(1)} / {selectedClass.id === 'mage' ? 45 : selectedClass.id === 'archer' ? 55 : 65} кг
                </span>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-[#26221e] pl-2 text-[9px]">
              <div className="flex justify-between items-center text-[#94a3b8]">
                <span>Голова (Шлем):</span>
                <span className="text-[#cbd5e1] font-semibold">{Math.round((hud.armorHead?.slash || 0) * 100)}% руб · {Math.round((hud.armorHead?.blunt || 0) * 100)}% дрб</span>
              </div>
              <div className="flex justify-between items-center text-[#94a3b8]">
                <span>Торс (Нагрудник):</span>
                <span className="text-[#e2e8f0] font-semibold">{Math.round((hud.armorTorso?.slash || 0) * 100)}% руб · {Math.round((hud.armorTorso?.blunt || 0) * 100)}% дрб</span>
              </div>
              <div className="flex justify-between items-center text-[#94a3b8]">
                <span>Конечности:</span>
                <span className="text-[#94a3b8] font-semibold">{Math.round((hud.armorArms?.slash || 0) * 100)}% руки · {Math.round((hud.armorLegs?.slash || 0) * 100)}% ноги</span>
              </div>
            </div>
          </div>

          {/* Bag Grid: Unlimited Slots (Restricted Only by Weight) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#8c8273] uppercase font-bold tracking-wider px-0.5">
              <div className="flex items-center gap-2">
                <span>Сумка приключенца</span>
                <span className="text-[#38bdf8] font-mono text-[9px] bg-[#101923] border border-[#0284c7]/40 px-1.5 py-0.2 rounded-xs">
                  ВЕС: {(
                    (mainHandItem?.weight || 4) +
                    (offHandItem?.weight || 0) +
                    bagSlots.reduce((acc, it) => acc + (it?.weight || 1.5), 0)
                  ).toFixed(1)} / {selectedClass.id === 'mage' ? 45 : selectedClass.id === 'archer' ? 55 : 65} КГ
                </span>
              </div>
              <span className="text-[#d4af37] font-normal normal-case">Клик по зелью — выпить · Ограничение только по весу</span>
            </div>

            {/* Bag items definitions: dynamic scrollable grid without slot limits */}
            <div className="grid grid-cols-4 gap-1.5 max-h-[165px] overflow-y-auto pr-1">
              {/* Slot 0: Healing Potion (locked, non-draggable) */}
              <button
                disabled={hud.potions <= 0}
                onClick={usePotion}
                onMouseEnter={() =>
                  setHoveredSlot({
                    title: 'Эликсир исцеления',
                    subtitle: 'Алхимическое зелье · Расходник',
                    stats: '+45 HP мгновенно (Клик / Клавиша Q)',
                    lore: 'Густое рубиновое зелье в граненом флаконе, пахнущее горными травами.',
                  })
                }
                onMouseLeave={() => setHoveredSlot(null)}
                className={`relative h-13 p-1 border-2 flex flex-col items-center justify-center transition-all ${
                  hud.potions > 0
                    ? 'bg-[#1e1412] hover:bg-[#2c1c18] border-[#dc2626] cursor-pointer shadow-[0_0_8px_rgba(220,38,38,0.3)]'
                    : 'bg-[#12100f] border-[#2e2a27] opacity-45 cursor-default'
                }`}
              >
                {hud.potions > 0 ? (
                  <>
                    <PotionFlaskIcon className="w-6 h-6" />
                    <span className="text-[9px] font-bold text-[#fca5a5] mt-0.5 leading-none">
                      Зелье (+45)
                    </span>
                    <span className="absolute top-1 right-1 text-[10px] font-bold text-[#facc15] bg-[#000000]/80 px-1 rounded-sm leading-tight tabular-nums">
                      ×{hud.potions}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-[#57524c]">Пусто</span>
                )}
              </button>

              {/* Slots 0-10: Dynamic items in bag */}
              {bagSlots.map((item, idx) => {
                const isDragOver = dragOverTarget === `bag_${idx}`;
                const isDragging = dragSource === `bag_${idx}`;

                const renderItemIcon = (type: InventoryItem['iconType']) => {
                  switch (type) {
                    case 'staff':
                      return <StaffWeaponIcon className="w-5 h-5 flex-shrink-0" />;
                    case 'two_handed':
                      return <TwoHandedSwordIcon className="w-5 h-5 text-[#e2e8f0] flex-shrink-0" />;
                    case 'armor':
                      return <ArmorIcon className="w-5 h-5 text-[#94a3b8] flex-shrink-0" />;
                    case 'sword':
                      return <SwordWeaponIcon className="w-5 h-5 flex-shrink-0" />;
                    case 'steel_sword':
                      return <SwordWeaponIcon isSteel className="w-5 h-5 flex-shrink-0" />;
                    case 'shield':
                      return <ShieldItemIcon className="w-5 h-5 flex-shrink-0" />;
                    case 'orb':
                      return <MagicOrbIcon className="w-5 h-5 flex-shrink-0" />;
                    case 'gold':
                      return <GoldPouchIcon className="w-5 h-5 text-[#facc15] flex-shrink-0" />;
                    case 'key':
                      return <DungeonKeyIcon className="w-5 h-5 text-[#facc15] flex-shrink-0" />;
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={idx}
                    draggable={!!item}
                    onDragStart={(e) => {
                      if (item) {
                        e.dataTransfer.setData('text/plain', `bag_${idx}`);
                        setDragSource(`bag_${idx}`);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTarget(`bag_${idx}`);
                    }}
                    onDragLeave={() => {
                      if (dragOverTarget === `bag_${idx}`) setDragOverTarget(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const src = e.dataTransfer.getData('text/plain') || dragSource;
                      setDragOverTarget(null);
                      setDragSource(null);
                      if (!src) return;

                      if (src.startsWith('bag_')) {
                        const fromIdx = parseInt(src.replace('bag_', ''), 10);
                        if (fromIdx !== idx) {
                          setBagSlots((prev) => {
                            const next = [...prev];
                            const tmp = next[fromIdx];
                            next[fromIdx] = next[idx];
                            next[idx] = tmp;
                            engineRef.current.bagSlots = next;
                            return next;
                          });
                        }
                      } else if (src === 'mainHand') {
                        // Dragged from mainHand into bag slot!
                        const draggedWeapon = mainHandItem;
                        if (draggedWeapon) {
                          const existingInSlot = bagSlots[idx];
                          // If dropping onto another weapon, swap it into mainHand
                          if (existingInSlot && existingInSlot.type === 'weapon') {
                            setMainHandItem(existingInSlot);
                            engineRef.current.mainHandItem = existingInSlot;
                            engineRef.current.weaponName = existingInSlot.name;
                            engineRef.current.weaponBonus = existingInSlot.damageBonus || 0;
                            engineRef.current.weaponPenetration = existingInSlot.penetration || 0;
                            engineRef.current.weaponWeight = existingInSlot.weight || 4.0;
                            renderer3dRef.current?.setEquippedItems(existingInSlot, offHandItem);

                            const nextBag = [...bagSlots];
                            nextBag[idx] = draggedWeapon;
                            setBagSlots(nextBag);
                            engineRef.current.bagSlots = nextBag;
                          } else if (!existingInSlot) {
                            // Slot was empty -> place weapon in slot, hand becomes fists
                            const nextBag = [...bagSlots];
                            nextBag[idx] = draggedWeapon;
                            setBagSlots(nextBag);
                            engineRef.current.bagSlots = nextBag;

                            setMainHandItem(null);
                            engineRef.current.mainHandItem = null;
                            engineRef.current.weaponName = 'Кулаки';
                            engineRef.current.weaponBonus = 0;
                            engineRef.current.weaponPenetration = 0;
                            renderer3dRef.current?.setEquippedItems(null, offHandItem);
                          }
                        }
                      } else if (src === 'offHand') {
                        // Dragged from offHand into bag slot!
                        const draggedOffHand = offHandItem;
                        if (draggedOffHand) {
                          const existingInSlot = bagSlots[idx];
                          if (existingInSlot && (existingInSlot.type === 'shield' || existingInSlot.type === 'focus' || existingInSlot.type === 'weapon')) {
                            setOffHandItem(existingInSlot);
                            engineRef.current.offHandItem = existingInSlot;
                            renderer3dRef.current?.setEquippedItems(mainHandItem, existingInSlot);

                            const nextBag = [...bagSlots];
                            nextBag[idx] = draggedOffHand;
                            setBagSlots(nextBag);
                            engineRef.current.bagSlots = nextBag;
                          } else if (!existingInSlot) {
                            const nextBag = [...bagSlots];
                            nextBag[idx] = draggedOffHand;
                            setBagSlots(nextBag);
                            engineRef.current.bagSlots = nextBag;

                            setOffHandItem(null);
                            engineRef.current.offHandItem = null;
                            renderer3dRef.current?.setEquippedItems(mainHandItem, null);
                          }
                        }
                      }
                    }}
                    onDragEnd={() => {
                      setDragSource(null);
                      setDragOverTarget(null);
                    }}
                    onClick={() => {
                      // Click to equip weapon, armor, or shield/focus from bag!
                      if (item) {
                        if (item.type === 'armor') {
                          const slot = item.armorSlot || 'torso';
                          const nextBag = [...bagSlots];
                          let oldArmor: InventoryItem | null = null;
                          const r = item.defenseResists || { slash: 0.3, blunt: 0.2, pierce: 0.2 };

                          if (slot === 'head') {
                            oldArmor = equippedHelmet;
                            setEquippedHelmet(item);
                            engineRef.current.equippedHelmet = item;
                            engineRef.current.armorHead = r;
                          } else if (slot === 'arms') {
                            oldArmor = equippedArms;
                            setEquippedArms(item);
                            engineRef.current.equippedArms = item;
                            engineRef.current.armorArms = r;
                          } else if (slot === 'legs') {
                            oldArmor = equippedLegs;
                            setEquippedLegs(item);
                            engineRef.current.equippedLegs = item;
                            engineRef.current.armorLegs = r;
                          } else {
                            oldArmor = equippedTorso;
                            setEquippedTorso(item);
                            engineRef.current.equippedTorso = item;
                            engineRef.current.armorTorso = r;
                          }

                          nextBag[idx] = oldArmor;
                          setBagSlots(nextBag);
                          engineRef.current.bagSlots = nextBag;
                          setMishapBanner(`Экипирована броня: ${item.name} (${item.subtitle})`);
                          setTimeout(() => setMishapBanner(null), 2500);
                        } else if (item.type === 'weapon' && item.handSlot !== 'left_only') {
                          const is2H = item.twoHanded || item.handSlot === 'two_handed';
                          const oldWeapon = mainHandItem;
                          const nextBag = [...bagSlots];

                          if (is2H && offHandItem) {
                            const freeIdx = nextBag.findIndex((s, i) => i !== idx && s === null);
                            if (freeIdx !== -1) {
                              nextBag[freeIdx] = offHandItem;
                              setOffHandItem(null);
                              engineRef.current.offHandItem = null;
                            } else {
                              setMishapBanner('Сумка полна! Освободите место для снятия щита/оружия из левой руки.');
                              setTimeout(() => setMishapBanner(null), 2500);
                              return;
                            }
                          }

                          nextBag[idx] = oldWeapon;
                          setBagSlots(nextBag);
                          engineRef.current.bagSlots = nextBag;

                          setMainHandItem(item);
                          engineRef.current.mainHandItem = item;
                          engineRef.current.weaponName = item.name;
                          engineRef.current.weaponBonus = item.damageBonus || 0;
                          engineRef.current.weaponPenetration = item.penetration || 0;
                          engineRef.current.weaponWeight = item.weight || 4.0;
                          renderer3dRef.current?.setEquippedItems(item, is2H ? null : offHandItem);
                        } else if (item.type === 'shield' || item.type === 'focus' || item.handSlot === 'left_only' || (item.type === 'weapon' && item.handSlot === 'both' && !mainHandItem)) {
                          if (mainHandItem && (mainHandItem.twoHanded || mainHandItem.handSlot === 'two_handed')) {
                            setMishapBanner('Нельзя взять предмет в левую руку: в руках Двуручное оружие!');
                            setTimeout(() => setMishapBanner(null), 2500);
                            return;
                          }
                          const goToLeft = item.type === 'shield' || item.type === 'focus' || item.handSlot === 'left_only' || !mainHandItem;
                          if (goToLeft) {
                            const oldOffHand = offHandItem;
                            const nextBag = [...bagSlots];
                            nextBag[idx] = oldOffHand;
                            setBagSlots(nextBag);
                            engineRef.current.bagSlots = nextBag;

                            setOffHandItem(item);
                            engineRef.current.offHandItem = item;
                            if (item.blockStrength !== undefined) {
                              engineRef.current.shieldBlockStrength = item.blockStrength;
                            }
                            if (item.magicGuardBonus !== undefined) {
                              engineRef.current.magicGuard += item.magicGuardBonus;
                            }
                            renderer3dRef.current?.setEquippedItems(mainHandItem, item);
                          }
                        }
                      }
                    }}
                    onMouseEnter={() => {
                      if (item) {
                        setSelectedWeaponForInspection(item);
                        setHoveredSlot({
                          title: item.name,
                          subtitle: item.subtitle,
                          stats: item.stats,
                          lore: item.lore,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={`relative h-13 p-1 border flex flex-col items-center justify-center transition-all select-none ${
                      item
                        ? isDragging
                          ? 'bg-[#2a1f14] border-[#d4af37] opacity-40 cursor-grabbing'
                          : isDragOver
                          ? 'bg-[#312414] border-[#d4af37] scale-[1.04] shadow-[0_0_10px_rgba(212,175,55,0.5)] cursor-copy'
                          : 'bg-[#171513] hover:bg-[#24201c] border-[#574c41] hover:border-[#d4af37] cursor-grab'
                        : isDragOver
                        ? 'bg-[#1e1a15] border-[#d4af37] border-dashed scale-[1.03]'
                        : 'bg-[#12100f] border-[#2b2724] border-dashed cursor-default'
                    }`}
                  >
                    {item ? (
                      <>
                        {renderItemIcon(item.iconType)}
                        <span className="text-[9px] font-bold mt-0.5 leading-none truncate max-w-full text-center text-[#e6dcc8]">
                          {item.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] text-[#3d3834]">· · ·</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Item Lore / Tooltip Box */}
          <div className="h-13 px-2.5 py-1.5 bg-[#12100f] border border-[#3d3935] flex flex-col justify-center text-left">
            {hoveredSlot ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#facc15] leading-none">
                    {hoveredSlot.title}
                  </span>
                  <span className="text-[9px] text-[#8c8273]">{hoveredSlot.subtitle}</span>
                </div>
                {hoveredSlot.stats && (
                  <span className="text-[10px] text-[#4ade80] font-semibold leading-tight mt-0.5">
                    {hoveredSlot.stats}
                  </span>
                )}
                <span className="text-[9px] text-[#a89f91] italic leading-tight truncate mt-0.5">
                  "{hoveredSlot.lore}"
                </span>
              </>
            ) : (
              <span className="text-[10px] text-[#6b6459] italic text-center">
                Наведите курсор на экипировку или предмет в сумке для просмотра свойств
              </span>
            )}
          </div>

          {/* Footer: Gold, Kills & Hotkeys */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3d3935] tabular-nums">
            <span className="text-[#facc15] font-bold flex items-center gap-1">
              <span>Золото:</span>
              <span>{hud.gold}</span>
            </span>
            <span className="text-[#ef4444] font-bold">
              Врагов повержено: {hud.kills}
            </span>
            <span className="text-[10px] text-[#78716a]">
              [I] Закрыть
            </span>
          </div>
        </div>

        {/* Side Panel: Information About Selected / Inspected Weapon */}
        {(() => {
          const inspectedItem: InventoryItem | null =
            selectedWeaponForInspection ||
            mainHandItem ||
            offHandItem ||
            (bagSlots.find((it) => it && (it.type === 'weapon' || it.type === 'shield' || it.type === 'focus')) as InventoryItem | null) ||
            null;

          return (
            <div className="w-[240px] bg-[#1a1715]/95 border-2 border-[#8c7a5b] p-3 space-y-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.95)] text-left flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#3d3935] pb-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#d4af37] uppercase drop-shadow-[1px_1px_0px_#000]">
                    Оружие / Снаряжение
                  </span>
                  <span className="text-[9px] text-[#9ca3af] bg-[#12100f] px-1 py-0.5 border border-[#3d3935]">
                    Инфо
                  </span>
                </div>

                {inspectedItem ? (
                  <div className="space-y-2">
                    <ItemPreview3D item={inspectedItem} gameRenderer={renderer3dRef.current} />
                    <div className="flex items-center gap-2 bg-[#12100f] p-1.5 border border-[#3d3935]">
                      <div className="w-8 h-8 flex items-center justify-center bg-[#1e1a16] border border-[#5c5449] flex-shrink-0">
                        {renderGlobalItemIcon(inspectedItem.iconType)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[#fef08a] truncate leading-tight">
                          {inspectedItem.name}
                        </div>
                        <div className="text-[9px] text-[#a89f91] truncate leading-tight">
                          {inspectedItem.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Slot Compatibility Tag */}
                    <div className="flex items-center justify-between px-1.5 py-1 bg-[#151311] border border-[#2d2824] text-[9px]">
                      <span className="text-[#a89f91]">Тип / Слот:</span>
                      <span className="font-bold text-[#facc15]">
                        {inspectedItem.type === 'armor'
                          ? (inspectedItem.armorSlot === 'head'
                              ? 'Броня головы (Шлем)'
                              : inspectedItem.armorSlot === 'arms'
                              ? 'Броня рук (Наручи)'
                              : inspectedItem.armorSlot === 'legs'
                              ? 'Броня ног (Поножи)'
                              : 'Броня корпуса (Торс)')
                          : inspectedItem.handSlot === 'both'
                          ? 'Обе руки (Правая / Левая)'
                          : inspectedItem.handSlot === 'left_only'
                          ? 'Только левая рука'
                          : inspectedItem.handSlot === 'right_only'
                          ? 'Только правая рука'
                          : inspectedItem.type === 'shield' || inspectedItem.type === 'focus'
                          ? 'Левая рука (Щит/Фокус)'
                          : 'Слот снаряжения'}
                      </span>
                    </div>

                    {/* Core Combat Stats */}
                    <div className="p-2 bg-[#12100f] border border-[#3d3935] space-y-1 text-[10px] tabular-nums">
                      {inspectedItem.defenseResists && (
                        <>
                          <div className="flex justify-between items-center text-[#a89f91]">
                            <span>Защита (Рубящий):</span>
                            <span className="text-[#38bdf8] font-bold">{Math.round((inspectedItem.defenseResists.slash || 0) * 100)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[#a89f91]">
                            <span>Защита (Дробящий):</span>
                            <span className="text-[#facc15] font-bold">{Math.round((inspectedItem.defenseResists.blunt || 0) * 100)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[#a89f91]">
                            <span>Защита (Колющий):</span>
                            <span className="text-[#4ade80] font-bold">{Math.round((inspectedItem.defenseResists.pierce || 0) * 100)}%</span>
                          </div>
                        </>
                      )}
                      {inspectedItem.damageBonus !== undefined && (
                        <div className="flex justify-between items-center text-[#a89f91]">
                          <span>Бонус к урону:</span>
                          <span className="text-[#facc15] font-bold">+{inspectedItem.damageBonus}</span>
                        </div>
                      )}
                      {inspectedItem.penetration !== undefined && (
                        <div className="flex justify-between items-center text-[#a89f91]">
                          <span>Пробитие брони:</span>
                          <span className="text-[#e6dcc8] font-bold">{inspectedItem.penetration}%</span>
                        </div>
                      )}
                      {inspectedItem.weight !== undefined && (
                        <div className="flex justify-between items-center text-[#a89f91]">
                          <span>Вес:</span>
                          <span className="text-[#94a3b8] font-bold">{inspectedItem.weight} кг</span>
                        </div>
                      )}
                      {inspectedItem.blockStrength !== undefined && (
                        <div className="flex justify-between items-center text-[#a89f91]">
                          <span>Сила блока:</span>
                          <span className="text-[#4ade80] font-bold">{inspectedItem.blockStrength}%</span>
                        </div>
                      )}
                      {inspectedItem.magicGuardBonus !== undefined && (
                        <div className="flex justify-between items-center text-[#a89f91]">
                          <span>Защита духа:</span>
                          <span className="text-[#38bdf8] font-bold">+{inspectedItem.magicGuardBonus}</span>
                        </div>
                      )}
                      {inspectedItem.catalyst && (
                        <div className="mt-1 pt-1 border-t border-[#26221e] flex flex-col gap-0.5 text-[9px]">
                          <span className="text-[#c084fc] font-bold">Магический катализатор</span>
                          {inspectedItem.activeDamageMult && (
                            <span className="text-[#e9d5ff]">Множитель урона: x{inspectedItem.activeDamageMult}</span>
                          )}
                          {inspectedItem.passiveMishapReduction && (
                            <span className="text-[#a7f3d0]">Срыв заклинания: -{inspectedItem.passiveMishapReduction}%</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description & Lore */}
                    <div className="p-2 bg-[#13110f] border border-[#2b2723] space-y-1">
                      <div className="text-[9px] text-[#fbbf24] leading-snug">
                        {inspectedItem.stats}
                      </div>
                      <div className="text-[8.5px] text-[#8c8273] italic leading-tight pt-1 border-t border-[#221f1c]">
                        "{inspectedItem.lore}"
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#12100f] border border-[#3d3935] text-center text-[#6b6459] text-[10px] italic">
                    Нет выбранного оружия для осмотра
                  </div>
                )}
              </div>

              {/* Hand Selector Shortcut Tabs */}
              <div className="pt-2 border-t border-[#3d3935] space-y-1">
                <span className="text-[8.5px] text-[#78716a] block">Быстрый выбор:</span>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <button
                    onClick={() => mainHandItem && setSelectedWeaponForInspection(mainHandItem)}
                    className="px-1.5 py-1 bg-[#141210] hover:bg-[#25201c] border border-[#3d3935] text-[#d4af37] truncate cursor-pointer"
                  >
                    Прав. рука
                  </button>
                  <button
                    onClick={() => offHandItem && setSelectedWeaponForInspection(offHandItem)}
                    className="px-1.5 py-1 bg-[#141210] hover:bg-[#25201c] border border-[#3d3935] text-[#38bdf8] truncate cursor-pointer"
                  >
                    Лев. рука
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    )}

      
      {/* Top-Right HUD Quest Tracker */}
      {gameState === 'PLAYING' && !journalOpen && !activeDialog && !noticeBoardOpen && (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-auto">
          <div className="bg-[#141210]/90 border-2 border-[#5c4a35] p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.9)] text-xs text-[#e6dcc8] w-72 backdrop-blur-xs select-none">
            <div className="flex items-center justify-between border-b border-[#3d3224] pb-1.5 mb-1.5">
              <span className="font-bold text-[#d4af37] flex items-center gap-1.5 text-[11px] tracking-wide">
                <span>📜</span> ЗАДАНИЯ СЕРОГО ДОЛА
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    document.exitPointerLock?.();
                    setJournalOpen(true);
                  }}
                  className="px-1.5 py-0.5 bg-[#262019] hover:bg-[#3d3326] border border-[#5c4a35] text-[10px] text-[#facc15] cursor-pointer"
                  title="Открыть журнал (J)"
                >
                  Журнал [J]
                </button>
                <button
                  onClick={() => setQuestTrackerCollapsed((prev) => !prev)}
                  className="px-1 text-[11px] text-[#a89f91] hover:text-white cursor-pointer"
                >
                  {questTrackerCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {!questTrackerCollapsed && (
              <div className="space-y-2">
                {getQuests().filter((q) => q.status === 'active').length === 0 ? (
                  <p className="text-[11px] text-[#8c8273] italic">
                    Нет активных заданий. Поговорите с жителями деревни или осмотрите доску объявлений.
                  </p>
                ) : (
                  getQuests()
                    .filter((q) => q.status === 'active')
                    .map((q) => (
                      <div key={q.id} className="border-l-2 border-[#ca8a04] pl-2 text-[11px]">
                        <div className="font-semibold text-[#fef08a]">{q.title}</div>
                        <div className="text-[#a89f91] text-[10px] mt-0.5">{q.objective}</div>
                        {q.target > 1 && (
                          <div className="w-full h-1.5 bg-[#261f18] mt-1 rounded-full overflow-hidden border border-[#453625]">
                            <div
                              className="h-full bg-gradient-to-r from-[#d97706] to-[#facc15]"
                              style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medieval RPG Interactive NPC Dialogue Modal */}
      {gameState === 'PLAYING' && activeDialog && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-xl bg-[#1c1916] border-2 border-[#8c744b] shadow-[0_12px_36px_rgba(0,0,0,0.95)] p-5 text-[#e6dcc8] space-y-4">
            {/* Header: NPC Name & Role Badge */}
            <div className="flex items-center justify-between border-b-2 border-[#54432c] pb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-[#2b241d] border border-[#a18253] flex items-center justify-center text-xl shadow-inner">
                  {activeDialog.npcId === 'elder_mark' ? '🧙‍♂️' : activeDialog.npcId === 'merchant_gus' ? '🪙' : activeDialog.npcId === 'blacksmith_torin' ? '⚒️' : activeDialog.npcId === 'innkeeper_bran' ? '🍺' : activeDialog.npcId === 'herbalist_isolda' ? '🌸' : activeDialog.npcId === 'hunter_ragnar' ? '🏹' : '🛡️'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#fef08a] leading-none drop-shadow-[1px_1px_0px_#000]">
                    {activeDialog.npcName}
                  </h2>
                  <span className="text-[11px] text-[#ca8a04] font-medium tracking-wide">
                    {activeDialog.npcRole}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveDialog(null)}
                className="w-7 h-7 flex items-center justify-center bg-[#29221b] hover:bg-[#40352a] border border-[#6b5638] text-sm text-[#e6dcc8] cursor-pointer"
                title="Закрыть (Esc)"
              >
                ✕
              </button>
            </div>

            {/* NPC Speech Box */}
            <div className="bg-[#12100d] border border-[#4a3a25] p-3.5 text-xs text-[#dcd2be] leading-relaxed italic rounded-xs shadow-inner">
              «{activeDialog.speech}»
            </div>

            {/* Interactive Choices */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-[#8c8273] uppercase tracking-wider font-bold mb-1">
                Ваш ответ:
              </div>
              {activeDialog.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={choice.action}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors border cursor-pointer flex items-center justify-between ${
                    choice.isQuest
                      ? 'bg-[#2b2011] hover:bg-[#3d2f19] border-[#d97706] text-[#fef08a] font-semibold'
                      : 'bg-[#181512] hover:bg-[#26211c] border-[#4a3c2a] text-[#ded6c5]'
                  }`}
                >
                  <span>{choice.text}</span>
                  <span className="text-[10px] text-[#ca8a04] opacity-75">▶</span>
                </button>
              ))}
            </div>

            {/* Hotkey hint */}
            <div className="text-[10px] text-[#786c5c] text-center pt-1 border-t border-[#382d1e]">
              Нажмите [Esc] или кнопку [✕] для возврата к игре
            </div>
          </div>
        </div>
      )}

      {/* Medieval Quest Journal Modal [J] */}
      {gameState === 'PLAYING' && journalOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-3xl h-[520px] bg-[#1a1714] border-2 border-[#8c744b] shadow-[0_12px_36px_rgba(0,0,0,0.95)] flex flex-col text-[#e6dcc8]">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#241f1a] border-b-2 border-[#54432c] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h2 className="text-sm font-bold text-[#d4af37] tracking-wider uppercase">
                  Журнал Заданий Серого Дола
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#141210] border border-[#4a3c2a] p-0.5 text-xs">
                  {(['all', 'active', 'completed'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedQuestTab(tab)}
                      className={`px-3 py-1 cursor-pointer transition-colors ${
                        selectedQuestTab === tab
                          ? 'bg-[#3b3022] text-[#fef08a] font-bold border border-[#a18253]'
                          : 'text-[#9c9180] hover:text-[#e6dcc8]'
                      }`}
                    >
                      {tab === 'all' ? 'Все' : tab === 'active' ? 'В процессе' : 'Выполненные'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setJournalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center bg-[#29221b] hover:bg-[#40352a] border border-[#6b5638] text-sm text-[#e6dcc8] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Content: Left List / Right Details */}
            <div className="grid grid-cols-[280px_1fr] flex-1 min-h-0">
              {/* Left Column: Quest Cards */}
              <div className="border-r border-[#3d3224] bg-[#14120f] overflow-y-auto p-2.5 space-y-1.5">
                {getQuests()
                  .filter((q) => (selectedQuestTab === 'all' ? true : q.status === selectedQuestTab))
                  .map((q) => {
                    const isSel = selectedQuestId === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuestId(q.id)}
                        className={`w-full text-left p-2.5 border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2216] border-[#ca8a04] text-[#fef08a]'
                            : 'bg-[#1a1714] border-[#382d1e] text-[#cfc5b4] hover:bg-[#211d19]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="truncate">{q.title}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 border rounded-xs font-normal ${
                              q.status === 'completed'
                                ? 'bg-[#14532d]/40 text-[#4ade80] border-[#16a34a]'
                                : q.status === 'active'
                                ? 'bg-[#78350f]/40 text-[#fde047] border-[#ca8a04]'
                                : 'bg-[#262626]/40 text-[#a3a3a3] border-[#525252]'
                            }`}
                          >
                            {q.status === 'completed' ? 'Завершён' : q.status === 'active' ? 'Активен' : 'Доступен'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8c8273] mt-1">{q.giver}</div>
                      </button>
                    );
                  })}
              </div>

              {/* Right Column: Detailed View */}
              {(() => {
                const quest = getQuests().find((q) => q.id === selectedQuestId) || getQuests()[0];
                if (!quest) return <div className="p-6 text-xs text-[#8c8273]">Задание не найдено</div>;

                return (
                  <div className="p-5 overflow-y-auto space-y-4 bg-[#171411]">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#fef08a]">{quest.title}</h3>
                        <span className="text-xs text-[#ca8a04]">{quest.giver} ({quest.giverRole})</span>
                      </div>
                      <p className="text-xs text-[#b8afa0] leading-relaxed mt-2.5 bg-[#12100d] p-3 border border-[#382d1e]">
                        {quest.description}
                      </p>
                    </div>

                    {/* Progress Bar & Objective */}
                    <div className="bg-[#1f1b16] border border-[#4a3b27] p-3 space-y-2">
                      <div className="text-[11px] font-bold text-[#d4af37] uppercase tracking-wide">
                        Текущая цель:
                      </div>
                      <div className="text-xs text-[#e6dcc8] font-semibold">{quest.objective}</div>
                      <div className="w-full h-2.5 bg-[#12100d] border border-[#382d1e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#d97706] to-[#facc15] transition-all duration-300"
                          style={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[#8c8273] text-right tabular-nums">
                        Прогресс: {quest.current} из {quest.target}
                      </div>
                    </div>

                    {/* Rewards Box */}
                    <div className="bg-[#1c1712] border border-[#5c4a35] p-3 space-y-1 text-xs">
                      <div className="text-[11px] font-bold text-[#facc15] uppercase tracking-wide">
                        Награда за выполнение:
                      </div>
                      <div className="text-[#a8e6cf] font-medium">{quest.rewardText}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Medieval Village Notice Board Modal */}
      {gameState === 'PLAYING' && noticeBoardOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-2xl bg-[#1e1a16] border-4 border-[#594228] shadow-[0_12px_36px_rgba(0,0,0,0.95)] p-5 text-[#e6dcc8] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#54432c] pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📌</span>
                <div>
                  <h2 className="text-sm font-bold text-[#fef08a] uppercase tracking-wider">
                    Доска Объявлений Деревни Серый Дол
                  </h2>
                  <span className="text-[10px] text-[#b8935c]">
                    Указы старейшины и поручения сельских мастеров
                  </span>
                </div>
              </div>
              <button
                onClick={() => setNoticeBoardOpen(false)}
                className="w-7 h-7 flex items-center justify-center bg-[#29221b] hover:bg-[#40352a] border border-[#6b5638] text-sm text-[#e6dcc8] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-1">
              {getQuests().map((q) => (
                <div
                  key={q.id}
                  className="bg-[#241f1a] border border-[#6b5536] p-3 flex flex-col justify-between shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#fef08a]">{q.title}</h4>
                      <span className="text-[9px] text-[#ca8a04] px-1 py-0.2 bg-[#12100d] border border-[#4a3c2a]">
                        {q.status === 'completed' ? 'Завершено' : q.status === 'active' ? 'В процессе' : 'Требуется'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#b8afa0] leading-snug line-clamp-3">
                      {q.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#3d3224] mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-[#8c8273]">Заказчик: {q.giver}</span>
                    {q.status === 'available' ? (
                      <button
                        onClick={() => {
                          if (q.id === 'bandits') {
                            engineRef.current.questBandits = 'active';
                            engineRef.current.banditQuestState = 'active';
                          } else if (q.id === 'crypt') {
                            engineRef.current.questCrypt = 'active';
                          } else if (q.id === 'ore') {
                            engineRef.current.questOre = 'active';
                          } else if (q.id === 'lilies') {
                            engineRef.current.questLilies = 'active';
                          } else if (q.id === 'ale') {
                            engineRef.current.questAle = 'active';
                          }
                          setMishapBanner(`Задание «${q.title}» принято!`);
                        }}
                        className="px-2 py-0.5 bg-[#8c6d23] hover:bg-[#a6822b] text-white font-bold cursor-pointer border border-[#e5c158]"
                      >
                        Принять
                      </button>
                    ) : (
                      <span className="text-[#a18253] font-semibold">
                        {q.status === 'completed' ? '✓ Сдано' : '● В работе'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-[#8c8273] text-center pt-1 border-t border-[#3d3224]">
              Нажмите [Esc] или кнопку [✕] для возврата к игре
            </div>
          </div>
        </div>
      )}

      {/* Title Menu Overlay */}
      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 bg-[#0f0e0d]/92 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#292624] border-t-2 border-l-2 border-t-[#78716a] border-l-[#78716a] border-b-2 border-r-2 border-b-[#0f0e0d] border-r-[#0f0e0d] p-6 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-wide text-[#d4af37] drop-shadow-[2px_2px_0px_#000]">
                СКЛЕП ПЕПЛА
              </h1>
              <p className="text-xs text-[#b8afa0] leading-relaxed">
                Олдскульное 3D-подземелье 1996 года. Выберите класс героя и найдите синий портал выхода.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-[#b8afa0]">Выберите класс:</div>
              <div className="grid grid-cols-3 gap-2">
                {HERO_CLASSES.map((cls) => {
                  const active = selectedClass.id === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className={`p-3 text-left border-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#38332e] border-[#d4af37] text-[#fef08a]'
                          : 'bg-[#1c1a18] border-t-[#57524c] border-l-[#57524c] border-b-[#0f0e0d] border-r-[#0f0e0d] text-[#c7beb0] hover:bg-[#24211f]'
                      }`}
                    >
                      <div className="text-sm font-bold flex items-center justify-between">
                        <span>{cls.name}</span>
                        {cls.hasMagic && (
                          <span className="text-[10px] text-[#38bdf8] bg-[#0c4a6e]/50 px-1 py-0.2 border border-[#0284c7]">
                            Магия
                          </span>
                        )}
                        {cls.id === 'archer' && (
                          <span className="text-[10px] text-[#f59e0b] bg-[#78350f]/50 px-1 py-0.2 border border-[#b45309]">
                            Лук
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#a89f91] mt-1 tabular-nums">
                        HP {cls.maxHp} · {cls.hasMagic ? `Дух ${cls.magicGuard}` : cls.id === 'archer' ? `Сил ${cls.maxStamina}` : `Урон ${cls.baseDamage}`}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#b8afa0] pt-1">{selectedClass.subtitle}</p>
            </div>

            <div className="bg-[#171514] border-t border-l border-t-[#0f0e0d] border-l-[#0f0e0d] border-b border-r border-b-[#57524c] border-r-[#57524c] p-3 text-xs text-[#b8afa0] space-y-1">
              <div>WASD / Стрелки — движение · Мышь — обзор</div>
              <div>E — взаимодействие · Q — зелье лечения · M — карта · I — инвентарь</div>
              <div>G — Гримуар Знаков (перетаскивание заклинаний в слоты)</div>
              <div>Воин: ЛКМ — меч, ПКМ — блок · Маг: 1-5, ЛКМ/ПКМ — каст чар</div>
              <div>Лучник: ЛКМ — натяжение и прицельный выстрел из лука · ПКМ — быстрый выстрел</div>
            </div>

            <button
              onClick={() => startGame(selectedClass)}
              className="w-full py-3 bg-[#8c6d23] hover:bg-[#a6822b] border-t-2 border-l-2 border-t-[#e5c158] border-l-[#e5c158] border-b-2 border-r-2 border-b-[#3d2e0c] border-r-[#3d2e0c] text-[#fffbeb] font-bold text-sm tracking-wide transition-colors cursor-pointer drop-shadow-[1px_1px_0px_#000]"
            >
              Начать игру
            </button>
          </div>
        </div>
      )}

      {/* Game Over / Victory Modal */}
      {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
        <div className="absolute inset-0 bg-[#0f0e0d]/90 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#292624] border-t-2 border-l-2 border-t-[#78716a] border-l-[#78716a] border-b-2 border-r-2 border-b-[#0f0e0d] border-r-[#0f0e0d] p-6 text-center space-y-5">
            <h2
              className={`text-2xl font-bold drop-shadow-[2px_2px_0px_#000] ${
                gameState === 'VICTORY' ? 'text-[#38bdf8]' : 'text-[#dc2626]'
              }`}
            >
              {gameState === 'VICTORY' ? 'ВЫ ВЫБРАЛИСЬ ИЗ СКЛЕПА!' : 'ВЫ ПАЛИ В ПОДЗЕМЕЛЬЕ'}
            </h2>
            <p className="text-xs text-[#b8afa0]">
              {gameState === 'VICTORY'
                ? 'Портал перенёс вас на поверхность. Слава победителю!'
                : 'Тьма поглотила ещё одного искателя приключений.'}
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#171514] border-t border-l border-t-[#0f0e0d] border-l-[#0f0e0d] border-b border-r border-b-[#57524c] border-r-[#57524c] p-3 text-xs tabular-nums">
              <div>
                <div className="text-[#a89f91]">Уровень</div>
                <div className="text-base font-bold mt-0.5">{hud.level}</div>
              </div>
              <div>
                <div className="text-[#a89f91]">Врагов</div>
                <div className="text-base font-bold text-[#dc2626] mt-0.5">{hud.kills}</div>
              </div>
              <div>
                <div className="text-[#a89f91]">Золото</div>
                <div className="text-base font-bold text-[#d4af37] mt-0.5">{hud.gold}</div>
              </div>
            </div>

            <button
              onClick={() => startGame(selectedClass)}
              className="w-full py-3 bg-[#8c6d23] hover:bg-[#a6822b] border-t-2 border-l-2 border-t-[#e5c158] border-l-[#e5c158] border-b-2 border-r-2 border-b-[#3d2e0c] border-r-[#3d2e0c] text-[#fffbeb] font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Играть снова
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
