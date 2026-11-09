import { TEX_SIZE, TextureSet } from './textures';
import { Enemy, WorldItem } from './world';

export const RENDER_W = 280;
export const RENDER_H = 175;

export interface RenderState {
  playerX: number;
  playerY: number;
  playerAngle: number;
  map: number[][];
  enemies: Enemy[];
  items: WorldItem[];
  swingTimer: number; // 0..1
  isBlocking: boolean;
  parryBonusReady: boolean;
  hurtFlash: number; // 0..1
  time: number;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  imgData: ImageData,
  textures: TextureSet,
  state: RenderState
) {
  const buf = imgData.data;
  const { playerX, playerY, playerAngle, map, enemies, items, swingTimer, isBlocking, hurtFlash, time } = state;

  const dirX = Math.cos(playerAngle);
  const dirY = Math.sin(playerAngle);
  const fov = 0.66;
  const planeX = -dirY * fov;
  const planeY = dirX * fov;

  // Subtle torchlight flicker
  const flicker = 1.0 + Math.sin(time * 11) * 0.04 + Math.cos(time * 23) * 0.03;

  // 1. Ceiling & Floor with distance shading
  const halfH = RENDER_H >> 1;
  for (let y = 0; y < RENDER_H; y++) {
    const isCeiling = y < halfH;
    const distFactor = isCeiling
      ? (halfH - y) / halfH
      : (y - halfH) / halfH;
    const shade = Math.min(1, distFactor * 1.15) * flicker;

    const r = isCeiling ? Math.floor(16 * shade) : Math.floor(28 * shade);
    const g = isCeiling ? Math.floor(14 * shade) : Math.floor(24 * shade);
    const b = isCeiling ? Math.floor(20 * shade) : Math.floor(22 * shade);

    const rowOffset = y * RENDER_W * 4;
    for (let x = 0; x < RENDER_W; x++) {
      const idx = rowOffset + x * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }

  // Z-buffer for sprite occlusion
  const zBuffer = new Float32Array(RENDER_W);

  // 2. Wall Raycasting (DDA)
  for (let x = 0; x < RENDER_W; x++) {
    const cameraX = (2 * x) / RENDER_W - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(playerX);
    let mapY = Math.floor(playerY);

    const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
    const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

    let stepX = 0;
    let stepY = 0;
    let sideDistX = 0;
    let sideDistY = 0;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (playerX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - playerX) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (playerY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - playerY) * deltaDistY;
    }

    let hit = 0;
    let side = 0;
    let steps = 0;

    while (hit === 0 && steps < 32) {
      steps++;
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[0].length) {
        if (map[mapY][mapX] > 0) {
          hit = map[mapY][mapX];
        }
      } else {
        hit = 1;
      }
    }

    const perpWallDist =
      side === 0
        ? (mapX - playerX + (1 - stepX) / 2) / (rayDirX || 1e-6)
        : (mapY - playerY + (1 - stepY) / 2) / (rayDirY || 1e-6);

    const safeDist = Math.max(0.1, perpWallDist);
    zBuffer[x] = safeDist;

    const lineHeight = Math.floor(RENDER_H / safeDist);
    let drawStart = -Math.floor(lineHeight / 2) + halfH;
    if (drawStart < 0) drawStart = 0;
    let drawEnd = Math.floor(lineHeight / 2) + halfH;
    if (drawEnd >= RENDER_H) drawEnd = RENDER_H - 1;

    let wallX =
      side === 0
        ? playerY + perpWallDist * rayDirY
        : playerX + perpWallDist * rayDirX;
    wallX -= Math.floor(wallX);

    let texX = Math.floor(wallX * TEX_SIZE);
    if (side === 0 && rayDirX > 0) texX = TEX_SIZE - texX - 1;
    if (side === 1 && rayDirY < 0) texX = TEX_SIZE - texX - 1;
    texX = Math.max(0, Math.min(TEX_SIZE - 1, texX));

    const tex = textures.walls[hit] || textures.walls[1];
    const step = TEX_SIZE / lineHeight;
    let texPos = (drawStart - halfH + lineHeight / 2) * step;

    // Distance fog + side shading
    const fog = Math.max(0.08, Math.min(1, (1 / (1 + safeDist * safeDist * 0.14)) * flicker));
    const sideShade = side === 1 ? 0.72 : 1.0;
    const light = fog * sideShade;

    for (let y = drawStart; y <= drawEnd; y++) {
      const texY = Math.floor(texPos) & (TEX_SIZE - 1);
      texPos += step;
      const rgba = tex[texY * TEX_SIZE + texX];
      const idx = (y * RENDER_W + x) * 4;
      buf[idx] = Math.floor(rgba[0] * light);
      buf[idx + 1] = Math.floor(rgba[1] * light);
      buf[idx + 2] = Math.floor(rgba[2] * light);
      buf[idx + 3] = 255;
    }
  }

  // 3. Billboard Sprites (Items + Enemies)
  interface SpriteDraw {
    x: number;
    y: number;
    distSq: number;
    texKey: string;
    hurt: boolean;
  }

  const spritesToDraw: SpriteDraw[] = [];

  for (const item of items) {
    if (item.collected) continue;
    const dx = item.x - playerX;
    const dy = item.y - playerY;
    spritesToDraw.push({
      x: item.x,
      y: item.y,
      distSq: dx * dx + dy * dy,
      texKey: item.kind,
      hurt: false,
    });
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - playerX;
    const dy = enemy.y - playerY;
    spritesToDraw.push({
      x: enemy.x,
      y: enemy.y,
      distSq: dx * dx + dy * dy,
      texKey: `${enemy.kind}_${enemy.aiState}`,
      hurt: enemy.hurtTimer > 0,
    });
  }

  // Sort back-to-front
  spritesToDraw.sort((a, b) => b.distSq - a.distSq);

  const invDet = 1.0 / (planeX * dirY - dirX * planeY);

  for (const spr of spritesToDraw) {
    const spriteX = spr.x - playerX;
    const spriteY = spr.y - playerY;

    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

    if (transformY <= 0.15) continue;

    const spriteScreenX = Math.floor((RENDER_W / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(RENDER_H / transformY));
    const spriteWidth = spriteHeight;

    let drawStartY = -Math.floor(spriteHeight / 2) + halfH;
    if (drawStartY < 0) drawStartY = 0;
    let drawEndY = Math.floor(spriteHeight / 2) + halfH;
    if (drawEndY >= RENDER_H) drawEndY = RENDER_H - 1;

    let drawStartX = -Math.floor(spriteWidth / 2) + spriteScreenX;
    if (drawStartX < 0) drawStartX = 0;
    let drawEndX = Math.floor(spriteWidth / 2) + spriteScreenX;
    if (drawEndX >= RENDER_W) drawEndX = RENDER_W - 1;

    const tex = textures.sprites[spr.texKey];
    if (!tex) continue;
    const sSize = textures.spriteSize[spr.texKey] || TEX_SIZE;

    const fog = Math.max(0.1, Math.min(1, (1 / (1 + transformY * transformY * 0.14)) * flicker));

    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      if (transformY >= zBuffer[stripe]) continue;

      const texX = Math.floor(
        ((stripe - (-spriteWidth / 2 + spriteScreenX)) * sSize) / spriteWidth
      );
      if (texX < 0 || texX >= sSize) continue;

      for (let y = drawStartY; y <= drawEndY; y++) {
        const d = y * 256 - RENDER_H * 128 + spriteHeight * 128;
        const texY = Math.floor((d * sSize) / spriteHeight / 256);
        if (texY < 0 || texY >= sSize) continue;

        const rgba = tex[texY * sSize + texX];
        if (rgba[3] === 0) continue;

        const idx = (y * RENDER_W + stripe) * 4;
        if (spr.hurt) {
          buf[idx] = Math.min(255, Math.floor(rgba[0] * fog + 140));
          buf[idx + 1] = Math.floor(rgba[1] * fog * 0.3);
          buf[idx + 2] = Math.floor(rgba[2] * fog * 0.3);
        } else {
          buf[idx] = Math.floor(rgba[0] * fog);
          buf[idx + 1] = Math.floor(rgba[1] * fog);
          buf[idx + 2] = Math.floor(rgba[2] * fog);
        }
        buf[idx + 3] = 255;
      }
    }
  }

  // 4. Hurt red flash overlay
  if (hurtFlash > 0) {
    const alpha = Math.min(0.45, hurtFlash * 0.45);
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = Math.min(255, Math.floor(buf[i] + 180 * alpha));
      buf[i + 1] = Math.floor(buf[i + 1] * (1 - alpha * 0.6));
      buf[i + 2] = Math.floor(buf[i + 2] * (1 - alpha * 0.6));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 5. First-person pixelated weapon & shield overlay
  drawFirstPersonWeapon(ctx, swingTimer, isBlocking, time);

  // 6. Skyrim-style center crosshair
  const cx = RENDER_W >> 1;
  const cy = RENDER_H >> 1;
  ctx.fillStyle = state.parryBonusReady ? '#facc15' : 'rgba(230, 220, 200, 0.55)';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawFirstPersonWeapon(
  ctx: CanvasRenderingContext2D,
  swingTimer: number,
  isBlocking: boolean,
  time: number
) {
  ctx.save();

  if (isBlocking) {
    const sx = 96;
    const sy = 96 + Math.sin(time * 6) * 1.5;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(sx, sy, 68, 79);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx, sy, 68, 79);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(sx + 28, sy + 28, 12, 16);
  } else {
    const swingArc = swingTimer > 0 ? Math.sin(swingTimer * Math.PI) : 0;
    const baseX = 195 - swingArc * 75;
    const baseY = 112 + swingArc * 22 + Math.sin(time * 4) * 1.5;

    ctx.translate(baseX, baseY);
    ctx.rotate(-0.35 - swingArc * 1.15);

    // Blade
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-5, -56, 10, 56);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -56, 4, 54);
    // Crossguard
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-14, 0, 28, 6);
    // Hilt
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4, 6, 8, 16);
  }

  ctx.restore();
}
