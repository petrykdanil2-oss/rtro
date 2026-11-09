import { Enemy } from './world';

export function renderAutomap(
  ctx: CanvasRenderingContext2D,
  map: number[][],
  explored: boolean[][],
  playerX: number,
  playerY: number,
  playerAngle: number,
  enemies: Enemy[]
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = '#09080a';
  ctx.fillRect(0, 0, w, h);

  const cellSize = Math.floor(Math.min(w / map[0].length, h / map.length));
  const offsetX = Math.floor((w - map[0].length * cellSize) / 2);
  const offsetY = Math.floor((h - map.length * cellSize) / 2);

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (!explored[y][x]) continue;
      const tile = map[y][x];
      if (tile === 0) {
        ctx.fillStyle = '#1c1921';
      } else if (tile === 5) {
        ctx.fillStyle = '#38bdf8';
      } else if (tile === 4) {
        ctx.fillStyle = '#64748b';
      } else {
        ctx.fillStyle = '#57534e';
      }
      ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
    }
  }


  // Draw player arrow
  const px = offsetX + playerX * cellSize;
  const py = offsetY + playerY * cellSize;
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(playerAngle) * 7, py + Math.sin(playerAngle) * 7);
  ctx.stroke();
}
