import React from 'react';
import { HeroClassId } from './world';

// --- Dedicated RPG SVG Artwork & Item Icons ---

export const PotionFlaskIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="flaskGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="rubyLiquid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="40%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
      <radialGradient id="liquidGlow" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#fecaca" />
        <stop offset="60%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </radialGradient>
      <filter id="flaskGlow">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#ef4444" floodOpacity="0.6" />
      </filter>
    </defs>
    {/* Wooden Cork */}
    <rect x="13" y="3" width="6" height="4" rx="1" fill="#92400e" stroke="#451a03" strokeWidth="1" />
    <line x1="14" y1="5" x2="18" y2="5" stroke="#b45309" strokeWidth="1" />
    {/* Brass Neck Ring */}
    <rect x="12" y="7" width="8" height="2" rx="0.5" fill="#eab308" stroke="#713f12" strokeWidth="0.8" />
    {/* Flask Body */}
    <path
      d="M13 9 H19 V13 L25 22 C26.5 24.5 25 28 22 28 H10 C7 28 5.5 24.5 7 22 L13 13 V9 Z"
      fill="#1e1b18"
      stroke="#38bdf8"
      strokeWidth="1.2"
      strokeLinejoin="round"
      filter="url(#flaskGlow)"
    />
    {/* Liquid inside */}
    <path
      d="M11 16 Q16 14 21 16 L23.5 22 C24.5 24 23.5 26.5 21 26.5 H11 C8.5 26.5 7.5 24 8.5 22 Z"
      fill="url(#liquidGlow)"
    />
    {/* Bubbles */}
    <circle cx="13" cy="22" r="1.2" fill="#fecaca" opacity="0.85" />
    <circle cx="18" cy="19" r="0.9" fill="#fecaca" opacity="0.9" />
    <circle cx="15" cy="24" r="0.7" fill="#fecaca" opacity="0.7" />
    {/* Glass Curvature Highlights */}
    <path
      d="M9.5 21 C8.8 23 9.5 25 11 25.5"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path d="M14 10 V13" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
  </svg>
);

export const HelmetIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2 C6 2 4 7 4 13 C4 18 6 21 12 21 C18 21 20 18 20 13 C20 7 18 2 12 2 Z"
      fill="#475569"
      stroke="#94a3b8"
      strokeWidth="1.5"
    />
    {/* Crown Crest */}
    <path d="M12 2 V9" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 2 L9 5 M12 2 L15 5" stroke="#cbd5e1" strokeWidth="1.2" />
    {/* Visor Slit (T-slit / Barbute) */}
    <path d="M7 11 H17 V13 H13 V18 H11 V13 H7 V11 Z" fill="#0f172a" stroke="#d4af37" strokeWidth="0.8" />
    {/* Glowing Eye Visor */}
    <rect x="8.5" y="11.5" width="2.5" height="1" fill="#38bdf8" />
    <rect x="13" y="11.5" width="2.5" height="1" fill="#38bdf8" />
    {/* Brass Rivets */}
    <circle cx="6.5" cy="15" r="0.7" fill="#d4af37" />
    <circle cx="17.5" cy="15" r="0.7" fill="#d4af37" />
  </svg>
);

export const AmuletIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Chain */}
    <path d="M6 3 C6 8 8 13 12 15 C16 13 18 8 18 3" stroke="#ca8a04" strokeWidth="1.2" strokeDasharray="1.5 1" />
    {/* Medallion Mount */}
    <polygon points="12,13 16,17 12,21 8,17" fill="#854d0e" stroke="#eab308" strokeWidth="1.2" />
    {/* Radiant Ruby Gem */}
    <polygon points="12,14.5 14.5,17 12,19.5 9.5,17" fill="#ef4444" stroke="#fca5a5" strokeWidth="0.6" />
    <circle cx="12" cy="17" r="0.9" fill="#ffffff" opacity="0.9" />
  </svg>
);

export const ArmorIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Steel Plate Cuirass */}
    <path
      d="M7 4 L12 2 L17 4 L19 9 L17 14 L18 20 L12 21 L6 20 L7 14 L5 9 L7 4 Z"
      fill="#334155"
      stroke="#64748b"
      strokeWidth="1.5"
    />
    {/* Neckline & Gorget */}
    <path d="M9 4 Q12 7 15 4" stroke="#94a3b8" strokeWidth="1.2" />
    {/* Chest Pectoral Ridge */}
    <line x1="12" y1="6" x2="12" y2="17" stroke="#94a3b8" strokeWidth="1.2" />
    <path d="M8 10 Q12 12 16 10" stroke="#94a3b8" strokeWidth="1" />
    <path d="M8.5 14 Q12 15.5 15.5 14" stroke="#94a3b8" strokeWidth="1" />
    {/* Gold Filigree Center Boss */}
    <circle cx="12" cy="10" r="1.2" fill="#eab308" />
  </svg>
);

export const GlovesIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Plated Gauntlet */}
    <path
      d="M6 7 L9 4 L15 4 L18 7 L17 13 L16 19 L8 19 L7 13 Z"
      fill="#475569"
      stroke="#94a3b8"
      strokeWidth="1.4"
    />
    {/* Articulated Finger Plates */}
    <line x1="9" y1="6" x2="15" y2="6" stroke="#cbd5e1" strokeWidth="1" />
    <line x1="8" y1="9" x2="16" y2="9" stroke="#cbd5e1" strokeWidth="1" />
    <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="#cbd5e1" strokeWidth="1" />
    {/* Leather Wrist Cuff */}
    <rect x="8" y="15" width="8" height="4" fill="#78350f" stroke="#92400e" strokeWidth="0.8" />
    <circle cx="12" cy="17" r="0.7" fill="#d4af37" />
  </svg>
);

export const LegsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Plate Greaves */}
    <path d="M6 4 H18 L16 10 L17 20 H13 L12 12 L11 20 H7 L8 10 Z" fill="#334155" stroke="#64748b" strokeWidth="1.4" />
    {/* Knee Poleyns */}
    <circle cx="9.5" cy="10" r="2.2" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" />
    <circle cx="14.5" cy="10" r="2.2" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" />
    <line x1="9.5" y1="13" x2="9.5" y2="18" stroke="#94a3b8" strokeWidth="1" />
    <line x1="14.5" y1="13" x2="14.5" y2="18" stroke="#94a3b8" strokeWidth="1" />
  </svg>
);

export const BootsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Armored Sabatons */}
    <path
      d="M7 4 H13 V12 L19 16 C20 17 19.5 19 18 19 H6 C5 19 4.5 17 5 15 L7 4 Z"
      fill="#292524"
      stroke="#78716c"
      strokeWidth="1.4"
    />
    {/* Plate Shin Flange */}
    <rect x="7" y="5" width="6" height="5" fill="#57534e" stroke="#a8a29e" strokeWidth="0.8" />
    {/* Steel Toe Cap */}
    <path d="M14 16 L18 16 C18.8 16.5 18.5 18 17 18 H13 Z" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.8" />
  </svg>
);

export const RingIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Gold Band */}
    <ellipse cx="12" cy="14" rx="7" ry="5" fill="#1c1917" stroke="#eab308" strokeWidth="2.2" />
    {/* Gem Mount */}
    <polygon points="12,5 15,8 12,11 9,8" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
    <circle cx="11.5" cy="7.5" r="0.7" fill="#ffffff" />
  </svg>
);

export const SwordWeaponIcon: React.FC<{ isSteel?: boolean; className?: string }> = ({
  isSteel = false,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Diagonal Blade */}
    <path
      d="M19 3 L21 5 L11 15 L9 15 L9 13 Z"
      fill={isSteel ? '#f1f5f9' : '#b45309'}
      stroke={isSteel ? '#94a3b8' : '#78350f'}
      strokeWidth="1"
    />
    {/* Fuller Line */}
    <line x1="17" y1="6" x2="12" y2="11" stroke={isSteel ? '#cbd5e1' : '#d97706'} strokeWidth="0.8" />
    {/* Crossguard */}
    <path d="M7 11 L13 17" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
    {/* Grip */}
    <line x1="8" y1="14" x2="5" y2="17" stroke="#78350f" strokeWidth="2" />
    {/* Pommel */}
    <circle cx="4" cy="18" r="1.5" fill="#eab308" stroke="#713f12" strokeWidth="0.8" />
  </svg>
);

export const ShieldItemIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Medieval Heater Shield */}
    <path
      d="M12 2 L20 5 C20 13 16 18 12 22 C8 18 4 13 4 5 L12 2 Z"
      fill="#451a03"
      stroke="#92400e"
      strokeWidth="1.4"
    />
    {/* Iron Reinforced Rim */}
    <path
      d="M12 4 L18 6.5 C18 12.5 15 16.5 12 19.5 C9 16.5 6 12.5 6 6.5 L12 4 Z"
      stroke="#64748b"
      strokeWidth="1"
    />
    {/* Heraldic Gold Cross & Center Boss */}
    <line x1="12" y1="6" x2="12" y2="18" stroke="#eab308" strokeWidth="1.2" />
    <line x1="7" y1="10" x2="17" y2="10" stroke="#eab308" strokeWidth="1.2" />
    <circle cx="12" cy="10" r="1.8" fill="#facc15" stroke="#713f12" strokeWidth="0.8" />
  </svg>
);

export const MagicOrbIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="orbGradient" cx="38%" cy="35%" r="58%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.85" />
      </radialGradient>
      <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Outer glow halo */}
    <circle cx="12" cy="10" r="8" fill="url(#orbGlow)" />
    {/* Brass cradle prongs */}
    <line x1="8" y1="14" x2="6" y2="18" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="12" y1="15" x2="12" y2="19" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16" y1="14" x2="18" y2="18" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
    {/* Cradle base ring */}
    <path d="M6 18 Q12 20 18 18" stroke="#d4af37" strokeWidth="1.2" fill="none" />
    {/* Orb body — faceted icosahedron feel */}
    <polygon points="12,3 18,8 16,15 8,15 6,8" fill="url(#orbGradient)" stroke="#818cf8" strokeWidth="0.8" />
    {/* Inner facet lines */}
    <line x1="12" y1="3" x2="12" y2="15" stroke="#bae6fd" strokeWidth="0.5" opacity="0.7" />
    <line x1="6" y1="8" x2="18" y2="8" stroke="#bae6fd" strokeWidth="0.5" opacity="0.7" />
    <line x1="8" y1="15" x2="12" y2="3" stroke="#818cf8" strokeWidth="0.4" opacity="0.6" />
    <line x1="16" y1="15" x2="12" y2="3" stroke="#818cf8" strokeWidth="0.4" opacity="0.6" />
    {/* Bright specular highlight */}
    <ellipse cx="10" cy="7" rx="2" ry="1.2" fill="white" opacity="0.55" />
    {/* Inner glowing core dot */}
    <circle cx="12" cy="9" r="1.5" fill="#e0f2fe" opacity="0.9" />
  </svg>
);

export const DungeonKeyIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ornate Key */}
    <circle cx="8" cy="8" r="4.5" fill="#1c1917" stroke="#eab308" strokeWidth="1.6" />
    <circle cx="8" cy="8" r="2" fill="#ca8a04" />
    <path d="M12 9 L20 17 L18 19 L15 16 L14 17 L12 15" stroke="#eab308" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="18" y1="15" x2="21" y2="18" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AncientScrollIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Rolled Parchment with wax seal */}
    <rect x="5" y="6" width="14" height="12" rx="2" fill="#d6c7a1" stroke="#8c7a5b" strokeWidth="1.2" />
    <path d="M4 6 Q5 4 7 4 H17 Q19 4 20 6" stroke="#a28e6a" strokeWidth="1.2" />
    <path d="M4 18 Q5 20 7 20 H17 Q19 20 20 18" stroke="#a28e6a" strokeWidth="1.2" />
    <line x1="7" y1="9" x2="15" y2="9" stroke="#786c54" strokeWidth="1" strokeDasharray="1 1" />
    <line x1="7" y1="12" x2="13" y2="12" stroke="#786c54" strokeWidth="1" strokeDasharray="1 1" />
    {/* Red Wax Seal */}
    <circle cx="16" cy="14" r="2.2" fill="#b91c1c" stroke="#ef4444" strokeWidth="0.8" />
  </svg>
);

export const WhetstoneIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sharpening Stone Block */}
    <polygon points="4,14 12,8 20,11 12,17" fill="#475569" stroke="#94a3b8" strokeWidth="1.2" />
    <polygon points="4,14 12,17 12,20 4,17" fill="#334155" stroke="#64748b" strokeWidth="1" />
    <polygon points="12,17 20,11 20,14 12,20" fill="#1e293b" stroke="#475569" strokeWidth="1" />
    {/* Sparkles */}
    <path d="M16 6 L17 4 L18 6 L20 7 L18 8 L17 10 L16 8 L14 7 Z" fill="#facc15" />
  </svg>
);

export const GoldPouchIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Leather Drawstring Pouch */}
    <path
      d="M7 9 C7 6 9 5 12 5 C15 5 17 6 17 9 L19 16 C20 19 17 21 12 21 C7 21 4 19 5 16 Z"
      fill="#78350f"
      stroke="#92400e"
      strokeWidth="1.4"
    />
    {/* Tied cord & coins */}
    <ellipse cx="12" cy="9" rx="4" ry="1.5" fill="#451a03" stroke="#ca8a04" strokeWidth="1.2" />
    <circle cx="12" cy="15" r="2.5" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
    <circle cx="15" cy="16" r="2" fill="#eab308" opacity="0.9" />
  </svg>
);

export const StaffWeaponIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wooden Staff Shaft */}
    <line x1="6" y1="21" x2="17" y2="5" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="7" y1="20" x2="16" y2="6" stroke="#92400e" strokeWidth="1" />
    {/* Brass Binding Rings */}
    <circle cx="10" cy="15" r="1.5" fill="#ca8a04" />
    <circle cx="13" cy="10" r="1.5" fill="#ca8a04" />
    {/* Glowing Magic Crystal Head */}
    <polygon points="18,2 22,6 18,10 14,6" fill="#38bdf8" stroke="#bae6fd" strokeWidth="0.8" />
    <circle cx="18" cy="6" r="1.2" fill="#ffffff" />
    {/* Energy Sparks */}
    <circle cx="21" cy="3" r="0.6" fill="#7dd3fc" />
    <circle cx="15" cy="8" r="0.6" fill="#7dd3fc" />
  </svg>
);

// --- Atmospheric Hand-Crafted Character Paperdoll Illustrations ---

export const TwoHandedSwordIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="twoHandBlade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Massive blade */}
    <path d="M27 5 L28 8 L16 20 L13 17 Z" fill="url(#twoHandBlade)" stroke="#e2e8f0" strokeWidth="0.8" />
    {/* Fuller */}
    <line x1="26" y1="7" x2="15" y2="18" stroke="#475569" strokeWidth="0.8" />
    {/* Flared crossguard */}
    <path d="M11 15 L18 22 L16.5 23.5 L9.5 16.5 Z" fill="#334155" stroke="#d4af37" strokeWidth="0.6" />
    {/* Parrying ring */}
    <circle cx="14.5" cy="18.5" r="1.8" stroke="#d4af37" strokeWidth="0.6" fill="none" />
    {/* Long two-handed grip */}
    <line x1="12" y1="20" x2="7" y2="25" stroke="#451a03" strokeWidth="2.2" strokeLinecap="round" />
    {/* Pommel */}
    <circle cx="6" cy="26" r="1.8" fill="#d4af37" stroke="#78350f" strokeWidth="0.6" />
  </svg>
);

export const CharacterPaperdollArt: React.FC<{ heroClass: HeroClassId }> = ({ heroClass }) => {
  if (heroClass === 'warrior') {
    return (
      <svg
        viewBox="0 0 120 180"
        className="w-32 h-44 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="warriorAura" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#78350f" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="plateSteel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cloakRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
        </defs>

        {/* Ambient Warm Torchlight Behind Character */}
        <circle cx="60" cy="80" r="56" fill="url(#warriorAura)" />

        {/* Heavy Cloak Background */}
        <path d="M34 50 L20 145 L40 148 L44 80 Z" fill="url(#cloakRed)" opacity="0.9" />
        <path d="M86 50 L100 145 L80 148 L76 80 Z" fill="url(#cloakRed)" opacity="0.9" />

        {/* Legs & Greaves */}
        <path d="M42 105 L40 155 L52 155 L54 105 Z" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        <path d="M66 105 L68 155 L80 155 L78 105 Z" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        {/* Knee Poleyns */}
        <circle cx="47" cy="118" r="5" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
        <circle cx="73" cy="118" r="5" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
        {/* Steel Boots / Sabatons */}
        <polygon points="36,155 54,155 53,165 33,165" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
        <polygon points="66,155 84,155 87,165 67,165" fill="#1e293b" stroke="#64748b" strokeWidth="1" />

        {/* Torso Plate Cuirass */}
        <path
          d="M38 48 C38 48 60 45 82 48 L80 98 C72 104 48 104 40 98 Z"
          fill="url(#plateSteel)"
          stroke="#cbd5e1"
          strokeWidth="1.4"
        />
        {/* Ribbed Pectorals */}
        <path d="M44 60 Q60 67 76 60" stroke="#cbd5e1" strokeWidth="1.2" fill="none" />
        <path d="M46 72 Q60 79 74 72" stroke="#cbd5e1" strokeWidth="1.2" fill="none" />
        {/* Gold Belt & Heavy Lion Buckle */}
        <rect x="40" y="94" width="40" height="8" rx="2" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
        <circle cx="60" cy="98" r="5" fill="#facc15" stroke="#854d0e" strokeWidth="1" />

        {/* Arms & Spiked Pauldrons */}
        <polygon points="26,45 38,40 42,62 28,68" fill="#64748b" stroke="#e2e8f0" strokeWidth="1.2" />
        <polygon points="94,45 82,40 78,62 92,68" fill="#64748b" stroke="#e2e8f0" strokeWidth="1.2" />
        {/* Pauldron Spikes */}
        <polygon points="24,42 27,33 33,42" fill="#e2e8f0" />
        <polygon points="96,42 93,33 87,42" fill="#e2e8f0" />

        {/* Forearms & Gauntlets */}
        <rect x="24" y="68" width="9" height="26" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
        <rect x="87" y="68" width="9" height="26" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />

        {/* Great Broadsword in Right Hand */}
        <line x1="20" y1="20" x2="20" y2="135" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="22" x2="20" y2="105" stroke="#38bdf8" strokeWidth="1.2" opacity="0.9" />
        <line x1="12" y1="102" x2="28" y2="102" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy="138" r="3" fill="#facc15" stroke="#713f12" strokeWidth="1" />

        {/* Spiked Tower Shield in Left Hand */}
        <path
          d="M94 65 L108 72 C108 115 100 135 94 145 C88 135 84 115 84 72 Z"
          fill="#451a03"
          stroke="#ca8a04"
          strokeWidth="1.4"
        />
        <circle cx="94" cy="95" r="4" fill="#64748b" stroke="#f8fafc" strokeWidth="1" />
        <polygon points="94,89 97,95 94,101 91,95" fill="#facc15" />

        {/* Great Helm Head */}
        <path
          d="M47 18 C47 10 73 10 73 18 L75 46 C71 50 49 50 45 46 Z"
          fill="url(#plateSteel)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        {/* Crown Horns / Wings */}
        <polygon points="45,18 37,12 47,26" fill="#cbd5e1" />
        <polygon points="75,18 83,12 73,26" fill="#cbd5e1" />
        {/* T-Visor with Piercing Blue Gaze */}
        <path d="M50 30 H70 V34 H62 V42 H58 V34 H50 V30 Z" fill="#090d16" stroke="#ca8a04" strokeWidth="0.8" />
        <rect x="52" y="31" width="5" height="2" fill="#38bdf8" />
        <rect x="63" y="31" width="5" height="2" fill="#38bdf8" />
      </svg>
    );
  }

  // Mage
  return (
    <svg
      viewBox="0 0 120 180"
      className="w-32 h-44 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="mageAura" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mageRobe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Arcane Glowing Runes Aura */}
      <circle cx="60" cy="80" r="56" fill="url(#mageAura)" />
      <circle cx="60" cy="36" r="26" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" fill="none" />

      {/* Robe Skirt */}
      <path d="M38 60 L24 155 L96 155 L82 60 Z" fill="url(#mageRobe)" stroke="#6366f1" strokeWidth="1.2" />
      <path d="M56 60 L50 155 L70 155 L64 60 Z" fill="#4338ca" opacity="0.7" />

      {/* Boots under robe */}
      <polygon points="40,155 52,155 50,163 38,163" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
      <polygon points="68,155 80,155 82,163 70,163" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />

      {/* Robe Torso */}
      <path d="M42 46 L78 46 L76 100 L44 100 Z" fill="url(#mageRobe)" stroke="#818cf8" strokeWidth="1" />
      {/* Golden Rune Brooch */}
      <circle cx="60" cy="54" r="3.5" fill="#facc15" stroke="#854d0e" strokeWidth="0.8" />

      {/* Sleeves & Hands */}
      <polygon points="26,48 42,46 38,78 22,82" fill="#312e81" stroke="#6366f1" strokeWidth="0.8" />
      <polygon points="94,48 78,46 82,78 98,82" fill="#312e81" stroke="#6366f1" strokeWidth="0.8" />

      {/* Magic Staff in Hand */}
      <line x1="22" y1="18" x2="22" y2="150" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      {/* Crystal on staff head */}
      <polygon points="22,8 26,16 22,24 18,16" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1" />
      <circle cx="22" cy="16" r="2" fill="#ffffff" />

      {/* Floating Grimoire in Left Hand */}
      <rect x="86" y="80" width="16" height="22" rx="1.5" fill="#831843" stroke="#f43f5e" strokeWidth="1" />
      <line x1="94" y1="80" x2="94" y2="102" stroke="#fbcfe8" strokeWidth="1" />
      <circle cx="94" cy="91" r="2" fill="#facc15" />

      {/* Hood & Glowing Arcane Eyes */}
      <path d="M42 22 Q60 6 78 22 L80 48 Q60 54 40 48 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.2" />
      <ellipse cx="60" cy="34" rx="12" ry="10" fill="#090d16" />
      {/* Cyan Glowing Eyes */}
      <ellipse cx="54" cy="34" rx="2" ry="1.2" fill="#38bdf8" />
      <ellipse cx="66" cy="34" rx="2" ry="1.2" fill="#38bdf8" />
    </svg>
  );
};
