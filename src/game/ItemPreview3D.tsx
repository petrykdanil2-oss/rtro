import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { InventoryItem } from './items';
import type { LowPolyDungeonRenderer } from './lowpoly3d';

export function ItemPreview3D({ item, gameRenderer }: { item: InventoryItem; gameRenderer: LowPolyDungeonRenderer | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameRenderer) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 30);
    camera.position.set(0, 0, 3.2);
    scene.add(new THREE.HemisphereLight(0xffe8c2, 0x302018, 2.2));
    const key = new THREE.DirectionalLight(0xffd69a, 3);
    key.position.set(2, 3, 4);
    scene.add(key);

    // Use the same first-person mesh factory as the in-game held item.
    const model = gameRenderer.createInventoryPreviewModel(item.iconType);
    model.position.set(0, 0, 0);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.55 / Math.max(size.x, size.y, size.z, 0.01);
    model.scale.multiplyScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    model.rotation.x = 0.08;
    scene.add(model);

    let dragging = false, lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      model.rotation.y += (e.clientX - lastX) * 0.012;
      model.rotation.x += (e.clientY - lastY) * 0.012;
      lastX = e.clientX; lastY = e.clientY;
    };
    const onUp = () => { dragging = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      scene.remove(model);
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, [item.id, item.iconType, gameRenderer]);

  return <div className="w-full h-[170px] border border-[#504431] bg-[radial-gradient(ellipse_at_center,#33291f_0%,#12100f_75%)] relative cursor-grab active:cursor-grabbing"><canvas ref={canvasRef} className="w-full h-full"/><span className="absolute bottom-1 right-2 text-[8px] text-[#a89f91] pointer-events-none">перетащи модель для поворота</span></div>;
}
