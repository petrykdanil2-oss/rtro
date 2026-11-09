export type SpellCircle = 'minor' | 'major';
export type SpellCastAnim = 'instant' | 'channel' | 'charge' | 'ritual';

export interface Spell {
  id: string;
  name: string;
  circle: SpellCircle;
  description: string;
  resonance: number; // Нагнетание при успешном касте
  cooldown: number; // В секундах
  damage?: number;
  heal?: number;
  color: string; // Основной цвет в Three.js (hex)
  element: 'fire' | 'frost' | 'dark' | 'holy' | 'lightning';
  castTime: number; // Время заготовки каста (в секундах, 0 = мгновенно)
  castAnim: SpellCastAnim; // Стиль анимации каста
  range: number;
  speed: number; // Скорость 3D-снаряда
  size: number;
}

export const ALL_SPELLS: Spell[] = [
  // --- Круг I: Малые Знаки ---
  {
    id: 'spark',
    name: 'Искра',
    circle: 'minor',
    description: 'Мгновенный сгусток огненной магии. Наносит малый урон огнем.',
    resonance: 1,
    cooldown: 0.45,
    castTime: 0,
    castAnim: 'instant',
    damage: 16,
    color: '#f97316',
    element: 'fire',
    range: 12,
    speed: 15,
    size: 0.12,
  },
  {
    id: 'frost_glance',
    name: 'Студёный взор',
    circle: 'minor',
    description: 'Ледяной осколок, замедляющий противника при попадании.',
    resonance: 1,
    cooldown: 0.6,
    castTime: 0.2,
    castAnim: 'channel',
    damage: 13,
    color: '#38bdf8',
    element: 'frost',
    range: 12,
    speed: 14,
    size: 0.11,
  },
  {
    id: 'shadow_lash',
    name: 'Щупальце Тьмы',
    circle: 'minor',
    description: 'Тёмный сгусток бездны, отталкивающий и ошеломляющий врага.',
    resonance: 1,
    cooldown: 0.7,
    castTime: 0.35,
    castAnim: 'channel',
    damage: 15,
    color: '#a855f7',
    element: 'dark',
    range: 10,
    speed: 12,
    size: 0.13,
  },
  {
    id: 'minor_heal',
    name: 'Малое Исцеление',
    circle: 'minor',
    description: 'Всплеск живительной энергии. Восстанавливает здоровье, но быстро нагнетает нестабильность эфира.',
    resonance: 8,
    cooldown: 2.5,
    castTime: 0.6,
    castAnim: 'ritual',
    heal: 24,
    color: '#4ade80',
    element: 'holy',
    range: 0,
    speed: 0,
    size: 0.2,
  },

  // --- Круг II: Большие Знаки ---
  {
    id: 'fireball',
    name: 'Огненный Плевок',
    circle: 'major',
    description: 'Массивная ревущая сфера пламени, сжигающая всё на пути.',
    resonance: 5,
    cooldown: 1.4,
    castTime: 0.75,
    castAnim: 'charge',
    damage: 50,
    color: '#ef4444',
    element: 'fire',
    range: 15,
    speed: 11,
    size: 0.28,
  },
  {
    id: 'frost_tomb',
    name: 'Оковы Мороза',
    circle: 'major',
    description: 'Тяжёлое ледяное копье. Наносит высокий урон холодом и станит цель.',
    resonance: 4,
    cooldown: 1.8,
    castTime: 0.55,
    castAnim: 'channel',
    damage: 42,
    color: '#0284c7',
    element: 'frost',
    range: 14,
    speed: 13,
    size: 0.24,
  },
  {
    id: 'lightning_spear',
    name: 'Молниевая Стрела',
    circle: 'major',
    description: 'Стремительный разряд молнии, пробивающий броню противника.',
    resonance: 6,
    cooldown: 1.6,
    castTime: 0.1,
    castAnim: 'instant',
    damage: 58,
    color: '#facc15',
    element: 'lightning',
    range: 18,
    speed: 24,
    size: 0.18,
  },
  {
    id: 'abyssal_burst',
    name: 'Тёмный Взрыв',
    circle: 'major',
    description: 'Концентрированная сфера первозданной энтропии колоссальной мощи.',
    resonance: 7,
    cooldown: 2.2,
    castTime: 1.1,
    castAnim: 'charge',
    damage: 70,
    color: '#7e22ce',
    element: 'dark',
    range: 14,
    speed: 10,
    size: 0.32,
  },
];

export interface MishapResult {
  isMishap: boolean;
  roll: number;
  threshold: number;
  effect?: 'self_damage' | 'silence' | 'stagger' | 'surge';
  message?: string;
  selfDamage?: number;
}

/**
 * Проверка на магический срыв (d100)
 * d100 бросок от 1 до 100
 * Порог = resonance - (magicGuard * 2)
 * Если d100 <= Порога -> СРЫВ!
 */
export function checkMagicMishap(resonance: number, magicGuard: number): MishapResult {
  const threshold = Math.max(0, resonance - magicGuard * 2);
  const roll = Math.floor(Math.random() * 100) + 1; // 1..100

  if (threshold <= 0 || roll > threshold) {
    return { isMishap: false, roll, threshold };
  }

  // Срыв произошел! Бросаем d4 для эффекта
  const effectRoll = Math.floor(Math.random() * 4) + 1;
  let effect: MishapResult['effect'] = 'self_damage';
  let message = 'Магический срыв: отдача энергии!';
  let selfDamage = 18;

  switch (effectRoll) {
    case 1:
      effect = 'self_damage';
      selfDamage = 18;
      message = 'Эхо-взрыв! Заклятие обожгло заклинателя!';
      break;
    case 2:
      effect = 'silence';
      message = 'Немота! Голос магии временно замолк!';
      break;
    case 3:
      effect = 'stagger';
      message = 'Дрожь склепа! Вас ошеломило отдачей!';
      break;
    case 4:
      effect = 'surge';
      selfDamage = 25;
      message = 'Хаотический взрыв пламени вокруг!';
      break;
  }

  return {
    isMishap: true,
    roll,
    threshold,
    effect,
    message,
    selfDamage,
  };
}
