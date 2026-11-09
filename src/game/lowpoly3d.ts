import * as THREE from 'three';
import { Enemy, EnemyKind, WorldItem } from './world';

export const LOWPOLY_W = 320;
export const LOWPOLY_H = 200;

interface EnemyRig {
  group: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  body: THREE.Group;
}

export interface InteractionTarget {
  type: 'chest' | 'chest_potion' | 'chest_gold' | 'ground_item' | 'door' | 'stuck_mob' | 'npc' | 'signpost' | 'flower' | 'ore' | 'notice_board';
  itemId: number;
  label: string;
  item?: WorldItem;
}

export type HitZone = 'head' | 'torso' | 'arms' | 'legs' | 'joint' | 'back';

export interface EnemyAimResult {
  enemyId: number;
  zone: HitZone;
  isJoint: boolean;
  distance: number;
}

export interface ChestRig {
  group: THREE.Group;
  lidPivot: THREE.Group;
  base: THREE.Mesh;
  potionGroup: THREE.Group;
  coinsGroup: THREE.Group;
}

export class LowPolyDungeonRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private enemyRigs = new Map<number, EnemyRig>();
  private itemMeshes = new Map<number, THREE.Group>();
  private chestRigs = new Map<number, ChestRig>();
  private raycaster = new THREE.Raycaster();
  private weaponGroup: THREE.Group;
  private swordPivot: THREE.Group;
  private swordMesh: THREE.Group;
  private shieldMesh: THREE.Group;
  private magicOrbMesh: THREE.Group;
  private mapMesh: THREE.Group;
  private rightHandType: 'sword' | 'staff' | 'two_handed' | 'bow' | 'dagger' | null = 'sword';
  private leftHandType: 'sword' | 'staff' | 'shield' | 'orb' | null = null;
  private leftWeaponPivot: THREE.Group;
  private mapTexture: THREE.CanvasTexture;
  private mapCanvas: HTMLCanvasElement;
  private torchLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private portalCrystal: THREE.Mesh | null = null;
  private doorMesh: THREE.Group | null = null;
  private doorHinge: THREE.Group | null = null;
  private doorTargetAngle = 0;
  private signpostMeshes: THREE.Object3D[] = [];
  private noticeBoardMesh: THREE.Object3D | null = null;
  private forestWallGroups: THREE.Group[] = [];
  private blacksmithSparksTimer = 0;
  private stuckWallMob: THREE.Group | null = null;
  private stuckMobArm: THREE.Group | null = null;
  private stuckMobHead: THREE.Group | null = null;
  private staffCrystal: THREE.Mesh | null = null;
  private staffInnerCore: THREE.Mesh | null = null;
  private staffHaloRing: THREE.Mesh | null = null;
  private staffFloatingShards: THREE.Mesh[] = [];
  private staffLight: THREE.PointLight | null = null;
  private isStaffCharging = false;
  private staffCastRecoilTimer = 0;
  private isLocationForest = false;
  private sparks: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
  private magicProjectiles: {
    mesh: THREE.Mesh;
    light?: THREE.PointLight;
    dir: THREE.Vector3;
    speed: number;
    life: number;
    damage: number;
    element: string;
    spellId: string;
    onHit?: (e: Enemy, dmg: number) => void;
  }[] = [];
  private arrows: {
    mesh: THREE.Group;
    light?: THREE.PointLight;
    v: THREE.Vector3;
    gravityScale: number;
    life: number;
    maxDistance: number;
    traveled: number;
    damage: number;
    penetration: number;
    isCrit?: boolean;
    onHit?: (e: Enemy, dmg: number) => void;
  }[] = [];
  private bowArrowMesh: THREE.Group | null = null;
  private bowStringUpper: THREE.Mesh | null = null;
  private bowStringLower: THREE.Mesh | null = null;
  private bowReleaseTwang = 0;
  private lastRenderTime = 0;
  private mapGrid: number[][] = [];
  private walkCycle = 0;
  private lastPlayerX = 2.5;
  private lastPlayerY = 2.5;

  constructor(canvas: HTMLCanvasElement, map: number[][], enemies: Enemy[], items: WorldItem[], isForest = false) {
    this.mapGrid = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(LOWPOLY_W, LOWPOLY_H, false);
    this.renderer.setPixelRatio(1);

    this.isLocationForest = isForest;
    this.scene = new THREE.Scene();

    if (isForest) {
      this.scene.background = new THREE.Color(0x3a6073);
      this.scene.fog = new THREE.FogExp2(0x3a6073, 0.045);
    } else {
      this.scene.background = new THREE.Color(0x09080a);
      this.scene.fog = new THREE.FogExp2(0x09080a, 0.15);
    }

    this.camera = new THREE.PerspectiveCamera(72, LOWPOLY_W / LOWPOLY_H, 0.05, 26);
    this.camera.position.set(2.5, 0.52, 2.5);

    // Ambient + Player Torchlight
    const ambCol = isForest ? 0x8ab498 : 0x4a4054;
    const ambInt = isForest ? 2.1 : 1.25;
    this.ambientLight = new THREE.AmbientLight(ambCol, ambInt);
    this.scene.add(this.ambientLight);

    const torchCol = isForest ? 0xffdfa0 : 0xff9d47;
    const torchInt = isForest ? 1.8 : 2.5;
    this.torchLight = new THREE.PointLight(torchCol, torchInt, isForest ? 14.0 : 9.0, 1.2);
    this.scene.add(this.torchLight);

    if (map.length > 30) {
      // Atmospheric dark forest & crypt atmosphere
      this.scene.background = new THREE.Color(0x18242f);
      this.scene.fog = new THREE.FogExp2(0x18242f, 0.038);
      this.ambientLight.color.setHex(0x606c7a);
      this.ambientLight.intensity = 1.5;
      this.torchLight.color.setHex(0xffa550);
      this.torchLight.intensity = 2.2;
      this.torchLight.distance = 14.0;
      this.camera.far = 36;
      this.camera.updateProjectionMatrix();
      this.buildUnifiedWorldGeometry(map);
    } else if (isForest) {
      this.buildForestGeometry(map);
    } else {
      this.buildDungeonGeometry(map);
    }
    this.buildEnemies(enemies);
    this.buildItems(items, map);

    // First-person 3D Sword & Shield attached to camera
    this.weaponGroup = new THREE.Group();
    this.swordPivot = new THREE.Group();
    this.swordPivot.position.set(0.24, -0.22, -0.38);
    this.swordMesh = this.createFirstPersonSword();
    this.swordPivot.add(this.swordMesh);

    this.leftWeaponPivot = new THREE.Group();
    this.leftWeaponPivot.position.set(-0.24, -0.22, -0.38);
    this.leftWeaponPivot.visible = false;

    this.shieldMesh = this.createFirstPersonShield();
    this.shieldMesh.visible = false;
    this.magicOrbMesh = this.createFirstPersonMagicOrb();
    this.magicOrbMesh.visible = false;

    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 128;
    this.mapCanvas.height = 128;
    this.mapTexture = new THREE.CanvasTexture(this.mapCanvas);
    this.mapTexture.magFilter = THREE.NearestFilter;
    this.mapTexture.minFilter = THREE.NearestFilter;
    this.mapMesh = this.createFirstPersonMap();
    this.mapMesh.visible = false;

    this.weaponGroup.add(this.swordPivot);
    this.weaponGroup.add(this.leftWeaponPivot);
    this.weaponGroup.add(this.shieldMesh);
    this.weaponGroup.add(this.magicOrbMesh);
    this.weaponGroup.add(this.mapMesh);
    this.camera.add(this.weaponGroup);
    this.scene.add(this.camera);
  }

  public setPixelatedRendering(enabled: boolean) {
    const width = enabled ? LOWPOLY_W : Math.max(320, this.renderer.domElement.clientWidth);
    const height = enabled ? LOWPOLY_H : Math.max(200, this.renderer.domElement.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private buildDungeonGeometry(map: number[][]) {
    const rows = map.length;
    const cols = map[0].length;

    // Floor & Ceiling
    const floorGeo = new THREE.PlaneGeometry(cols, rows);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x262229 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cols / 2, 0, rows / 2);
    this.scene.add(floor);

    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x141117 });
    const ceil = new THREE.Mesh(floorGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cols / 2, 1.0, rows / 2);
    this.scene.add(ceil);

    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const matStone = new THREE.MeshLambertMaterial({ color: 0x524e56 });
    const matMoss = new THREE.MeshLambertMaterial({ color: 0x3f4d43 });
    const matBlood = new THREE.MeshLambertMaterial({ color: 0x594242 });
    const matIron = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = map[z][x];
        if (tile === 0) continue;

        if (tile === 5) {
          // Dungeon Exit / Entrance Door Portal
          const door = this.createDetailedDoor();
          door.position.set(x + 0.5, 0, z + 0.5);
          door.userData = { type: 'door', itemId: 9999 };
          door.traverse((c) => {
            c.userData = { type: 'door', itemId: 9999 };
          });
          this.doorMesh = door;
          this.scene.add(door);

          const doorGlow = new THREE.PointLight(0x38bdf8, 1.4, 4.0);
          doorGlow.position.set(x + 0.5, 0.55, z + 0.5);
          this.scene.add(doorGlow);
          continue;
        }

        if (tile === 4) {
          // Solid 3D Iron Cell Bars (no wireframe transparency!)
          const cellGroup = new THREE.Group();
          cellGroup.position.set(x + 0.5, 0, z + 0.5);

          const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1), matStone);
          base.position.y = 0.07;
          const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1), matStone);
          top.position.y = 0.93;
          cellGroup.add(base, top);

          const barGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6);
          for (let i = -0.35; i <= 0.36; i += 0.23) {
            const bar = new THREE.Mesh(barGeo, matIron);
            bar.position.set(i, 0.5, 0);
            cellGroup.add(bar);
          }
          const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.08), matIron);
          crossBar.position.set(0, 0.5, 0);
          cellGroup.add(crossBar);

          this.scene.add(cellGroup);
          continue;
        }

        const mat =
          tile === 2 ? matMoss : tile === 3 ? matBlood : matStone;

        const wall = new THREE.Mesh(wallGeo, mat);
        wall.position.set(x + 0.5, 0.5, z + 0.5);
        this.scene.add(wall);

        // Stuck Mob embedded in the stone wall right beside the exit door!
        if (x === 17 && z === 20 && !this.isLocationForest) {
          const stuckMob = this.createStuckWallMob();
          stuckMob.position.set(x + 0.5, 0, z + 0.5);
          stuckMob.userData = { type: 'stuck_mob' };
          stuckMob.traverse((c) => {
            c.userData = { type: 'stuck_mob' };
          });
          this.stuckWallMob = stuckMob;
          this.scene.add(stuckMob);
        }
      }
    }
  }

  public openDoor(animated = true) {
    this.doorTargetAngle = -Math.PI * 0.55;
    if (!animated && this.doorHinge) {
      this.doorHinge.rotation.y = this.doorTargetAngle;
    }
  }

  private createDetailedDoor(): THREE.Group {
    const group = new THREE.Group();
    const stoneFrameMat = new THREE.MeshLambertMaterial({ color: 0x3d3942, flatShading: true });
    const woodPlankMat = new THREE.MeshLambertMaterial({ color: 0x4a2810, flatShading: true });
    const ironBandMat = new THREE.MeshLambertMaterial({ color: 0x22262c, flatShading: true });
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });
    const runeGazeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Stone Frame (Left post, Right post, Arch lintel)
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.36), stoneFrameMat);
    postL.position.set(-0.41, 0.5, 0);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.36), stoneFrameMat);
    postR.position.set(0.41, 0.5, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.38), stoneFrameMat);
    lintel.position.set(0, 0.91, 0);

    const stoneStep = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.38), stoneFrameMat);
    stoneStep.position.set(0, 0.04, 0);

    // Door Hinge Pivot Group (hinged on the left post at x = -0.32)
    const doorHinge = new THREE.Group();
    doorHinge.position.set(-0.32, 0, 0);

    // Thick Oak Door Leaf (offset by +0.32 so it swings on the hinge)
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.82, 0.08), woodPlankMat);
    doorLeaf.position.set(0.32, 0.41, 0);

    // Iron reinforcement horizontal bands
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.09), ironBandMat);
    band1.position.set(0.32, 0.22, 0);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.09), ironBandMat);
    band2.position.set(0.32, 0.62, 0);

    // Iron ring handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 5, 8), handleMat);
    handle.position.set(0.52, 0.42, 0.05);

    // Mystical glowing rune etched in the center of the door
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), runeGazeMat);
    rune.position.set(0.32, 0.52, 0.05);

    doorHinge.add(doorLeaf, band1, band2, handle, rune);
    this.doorHinge = doorHinge;

    group.add(postL, postR, lintel, stoneStep, doorHinge);
    return group;
  }

  private createStuckWallMob(): THREE.Group {
    const root = new THREE.Group();
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1, flatShading: true });
    const darkBoneMat = new THREE.MeshLambertMaterial({ color: 0x78716c, flatShading: true });
    const stoneDebrisMat = new THREE.MeshLambertMaterial({ color: 0x44403c, flatShading: true });
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Stone rubble & fractured chunks bursting out of the wall surface (facing North)
    for (let i = 0; i < 7; i++) {
      const rubble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.04 + (i % 3) * 0.02, 0),
        stoneDebrisMat
      );
      rubble.position.set(
        Math.sin(i * 1.2) * 0.18,
        0.32 + i * 0.065,
        -0.46 - (i % 2) * 0.04
      );
      rubble.rotation.set(i * 0.5, i * 0.7, i * 0.3);
      root.add(rubble);
    }

    // Spine and ribcage protruding out from the stone surface
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.35, 5), darkBoneMat);
    spine.position.set(0, 0.52, -0.44);
    spine.rotation.x = -0.22;
    root.add(spine);

    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22 - r * 0.02, 0.022, 0.14), boneMat);
      rib.position.set(0, 0.44 + r * 0.065, -0.46 - r * 0.015);
      rib.rotation.x = -0.15;
      root.add(rib);
    }

    // Skull protruding out from the wall
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, -0.48);

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.15), boneMat);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.11), darkBoneMat);
    jaw.position.set(0, -0.07, 0.02);

    // Glowing red eye sockets
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.02), eyeGlowMat);
    eyeL.position.set(-0.035, 0.01, -0.076);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.02), eyeGlowMat);
    eyeR.position.set(0.035, 0.01, -0.076);

    // Broken horned iron helm on skull
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.16), stoneDebrisMat);
    helm.position.set(0, 0.07, 0);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), darkBoneMat);
    hornL.position.set(-0.07, 0.1, 0);
    hornL.rotation.z = 0.5;

    headGroup.add(cranium, jaw, eyeL, eyeR, helm, hornL);
    root.add(headGroup);
    this.stuckMobHead = headGroup;

    // Left arm: fused into the stone wall
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 5), darkBoneMat);
    armL.position.set(-0.16, 0.54, -0.38);
    armL.rotation.set(0.4, 0, -0.7);
    root.add(armL);

    // Right arm: reaching out from the wall into the room
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.14, 0.62, -0.44);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), boneMat);
    upperArm.position.set(0.08, -0.06, -0.08);
    upperArm.rotation.set(-0.6, 0.3, 0.7);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.18, 5), boneMat);
    forearm.position.set(0.15, -0.16, -0.18);
    forearm.rotation.set(-0.9, 0.5, 0.3);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), boneMat);
    hand.position.set(0.18, -0.24, -0.26);

    armRGroup.add(upperArm, forearm, hand);
    root.add(armRGroup);
    this.stuckMobArm = armRGroup;

    // Red eye light aura
    const eyeLight = new THREE.PointLight(0xef4444, 0.8, 2.0, 2.0);
    eyeLight.position.set(0, 0.7, -0.55);
    root.add(eyeLight);

    return root;
  }

  private buildForestGeometry(map: number[][]) {
    const rows = map.length;
    const cols = map[0].length;

    // Forest Grass Floor
    const floorGeo = new THREE.PlaneGeometry(cols, rows);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x1f3b18, flatShading: true });
    const floor = new THREE.Mesh(floorGeo, grassMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cols / 2, 0, rows / 2);
    this.scene.add(floor);

    // Winding Dirt Road (cross section running across the map)
    const roadGeo = new THREE.PlaneGeometry(2.4, rows);
    const dirtRoadMat = new THREE.MeshLambertMaterial({ color: 0x4a3622, flatShading: true });
    const road = new THREE.Mesh(roadGeo, dirtRoadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(11.5, 0.005, rows / 2);
    this.scene.add(road);

    // Low-poly Pine Tree materials
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2314, flatShading: true });
    const pineDarkMat = new THREE.MeshLambertMaterial({ color: 0x14341b, flatShading: true });
    const pineMidMat = new THREE.MeshLambertMaterial({ color: 0x1a4623, flatShading: true });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x474c47, flatShading: true });

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = map[z][x];
        if (tile === 0) continue;

        if (tile === 5) {
          // Dungeon Entrance Door back into the crypt
          const door = this.createDetailedDoor();
          door.position.set(x + 0.5, 0, z + 0.5);
          door.userData = { type: 'door', itemId: 9999 };
          door.traverse((c) => {
            c.userData = { type: 'door', itemId: 9999 };
          });
          this.doorMesh = door;
          this.scene.add(door);
          continue;
        }

        // Solid Tree / Boulder
        const isBoulder = (x + z) % 4 === 0;
        if (isBoulder) {
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), rockMat);
          rock.position.set(x + 0.5, 0.35, z + 0.5);
          rock.rotation.set((x * 0.4) % 1.5, (z * 0.6) % 2, 0);
          this.scene.add(rock);
        } else {
          // Low-poly Tree: Trunk + 3 Tier Cones
          const treeGroup = new THREE.Group();
          treeGroup.position.set(x + 0.5, 0, z + 0.5);

          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.65, 5), trunkMat);
          trunk.position.y = 0.32;
          treeGroup.add(trunk);

          const tier1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.65, 5), pineDarkMat);
          tier1.position.y = 0.75;
          const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 5), pineMidMat);
          tier2.position.y = 1.1;
          const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), pineDarkMat);
          tier3.position.y = 1.45;

          treeGroup.add(tier1, tier2, tier3);
          this.scene.add(treeGroup);
        }
      }
    }
  }

  private createDetailedSword(bladeColor: number, length = 0.48): THREE.Group {
    const g = new THREE.Group();
    const bladeMat = new THREE.MeshLambertMaterial({ color: bladeColor, flatShading: true });
    const fullerMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xca8a04, flatShading: true });
    const hiltMat = new THREE.MeshLambertMaterial({ color: 0x451a03, flatShading: true });

    const bodyLen = length * 0.8;
    const tipLen = length * 0.22;

    const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.068, bodyLen, 0.015), bladeMat);
    bladeBody.position.y = bodyLen / 2 + 0.04;

    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.022, bodyLen * 0.94, 0.022), fullerMat);
    fuller.position.y = bodyLen / 2 + 0.04;

    const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, tipLen * 0.4, 0.013), bladeMat);
    tip1.position.y = bodyLen + tipLen * 0.2 + 0.04;

    const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, tipLen * 0.35, 0.011), bladeMat);
    tip2.position.y = bodyLen + tipLen * 0.575 + 0.04;

    const tip3 = new THREE.Mesh(new THREE.BoxGeometry(0.014, tipLen * 0.25, 0.008), bladeMat);
    tip3.position.y = bodyLen + tipLen * 0.875 + 0.04;

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.028, 0.042), goldMat);
    guard.position.y = 0.03;

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.1, 6), hiltMat);
    grip.position.y = -0.03;

    const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), goldMat);
    pommel.position.y = -0.09;

    g.add(bladeBody, fuller, tip1, tip2, tip3, guard, grip, pommel);
    return g;
  }

  private createDetailedShield(woodColor: number, rimColor: number, scale = 1): THREE.Group {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: woodColor, flatShading: true });
    const rimMat = new THREE.MeshLambertMaterial({ color: rimColor, flatShading: true });

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.04, 6), woodMat);
    plate.rotation.x = Math.PI / 2;

    const boss = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), rimMat);
    boss.position.z = 0.03;

    g.add(plate, boss);
    g.scale.set(scale, scale, scale);
    return g;
  }

  private createEnemyRig(kind: EnemyKind): EnemyRig {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    if (kind === 'rat') {
      const furMat = new THREE.MeshLambertMaterial({ color: 0x6e5a4f, flatShading: true });
      const darkFur = new THREE.MeshLambertMaterial({ color: 0x4a3b32, flatShading: true });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tailMat = new THREE.MeshLambertMaterial({ color: 0xd48c8c, flatShading: true });

      const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), furMat);
      torso.scale.set(0.85, 0.7, 1.35);
      torso.position.y = 0.16;
      body.add(torso);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 5), darkFur);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.18, 0.3);
      body.add(head);

      const earGeo = new THREE.ConeGeometry(0.05, 0.08, 4);
      const earL = new THREE.Mesh(earGeo, tailMat);
      earL.position.set(-0.08, 0.26, 0.22);
      const earR = new THREE.Mesh(earGeo, tailMat);
      earR.position.set(0.08, 0.26, 0.22);
      body.add(earL, earR);

      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), eyeMat);
      eyeL.position.set(-0.06, 0.2, 0.32);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), eyeMat);
      eyeR.position.set(0.06, 0.2, 0.32);
      body.add(eyeL, eyeR);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.35, 5), tailMat);
      tail.rotation.x = -Math.PI / 2.2;
      tail.position.set(0, 0.14, -0.36);
      body.add(tail);

      const pawGeo = new THREE.BoxGeometry(0.05, 0.08, 0.07);
      const pawFL = new THREE.Mesh(pawGeo, tailMat);
      pawFL.position.set(-0.11, 0.04, 0.14);
      const pawFR = new THREE.Mesh(pawGeo, tailMat);
      pawFR.position.set(0.11, 0.04, 0.14);
      const pawBL = new THREE.Mesh(pawGeo, tailMat);
      pawBL.position.set(-0.12, 0.04, -0.14);
      const pawBR = new THREE.Mesh(pawGeo, tailMat);
      pawBR.position.set(0.12, 0.04, -0.14);
      body.add(pawFL, pawFR, pawBL, pawBR);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.14, 0.14, 0.18);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), eyeMat);
      claw.rotation.x = Math.PI / 2;
      claw.position.z = 0.08;
      rightArm.add(claw);
      group.add(rightArm);

      const leftArm = new THREE.Group();
      group.add(leftArm);

      return { group, rightArm, leftArm, body };
    }

    // Humanoid Low-Poly Enemies (Skeleton, Cultist, Warden)
    const palette: Record<Exclude<EnemyKind, 'rat'>, { primary: number; secondary: number; head: number; eye: number; scale: number }> = {
      skeleton: { primary: 0xd6cfc2, secondary: 0x475569, head: 0xe5dec9, eye: 0x38bdf8, scale: 1.0 },
      cultist: { primary: 0x7f1d1d, secondary: 0xca8a04, head: 0x450a0a, eye: 0xfacc15, scale: 1.02 },
      warden: { primary: 0x334155, secondary: 0xeab308, head: 0x1e293b, eye: 0xef4444, scale: 1.18 },
      bandit: { primary: 0x4a3219, secondary: 0x241d17, head: 0x262626, eye: 0xfbbf24, scale: 1.0 },
    };

    const p = palette[kind];
    group.scale.set(p.scale, p.scale, p.scale);

    const primaryMat = new THREE.MeshLambertMaterial({ color: p.primary, flatShading: true });
    const secondaryMat = new THREE.MeshLambertMaterial({ color: p.secondary, flatShading: true });
    const headMat = new THREE.MeshLambertMaterial({ color: p.head, flatShading: true });
    const eyeMat = new THREE.MeshBasicMaterial({ color: p.eye });

    // Torso & Chestplate
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.42, 6), primaryMat);
    chest.position.y = 0.46;
    chest.userData = { hitZone: 'torso' };
    body.add(chest);

    // Shoulder Pauldrons (tagged as arms/shoulders)
    const pauldronGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const pauldronL = new THREE.Mesh(pauldronGeo, secondaryMat);
    pauldronL.position.set(-0.22, 0.62, 0);
    pauldronL.userData = { hitZone: 'arms' };
    const pauldronR = new THREE.Mesh(pauldronGeo, secondaryMat);
    pauldronR.position.set(0.22, 0.62, 0);
    pauldronR.userData = { hitZone: 'arms' };
    body.add(pauldronL, pauldronR);

    // Anatomic Joints: Only for armored enemies (skeleton, warden)!
    // Skill reward: Tiny hitboxes rendered with dark chainmail/padded fabric material
    if (kind === 'skeleton' || kind === 'warden') {
      const jointMat = new THREE.MeshLambertMaterial({ color: 0x22262b, flatShading: true }); // dark chainmail slit

      // 1. Neck / Throat slit (tiny cylinder r=0.035, h=0.038)
      const neckJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.038, 6), jointMat);
      neckJoint.position.set(0, 0.685, 0.045);
      neckJoint.userData = { hitZone: 'joint', jointName: 'throat' };
      body.add(neckJoint);

      // 2. Armpit gaps (tiny boxes 0.035 x 0.035 x 0.035)
      const armpitL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), jointMat);
      armpitL.position.set(-0.17, 0.53, 0.02);
      armpitL.userData = { hitZone: 'joint', jointName: 'armpit' };
      const armpitR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), jointMat);
      armpitR.position.set(0.17, 0.53, 0.02);
      armpitR.userData = { hitZone: 'joint', jointName: 'armpit' };
      body.add(armpitL, armpitR);

      // 3. Groin / Pelvis joint slit (tiny box 0.06 x 0.03 x 0.03)
      const groinJoint = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.03), jointMat);
      groinJoint.position.set(0, 0.25, 0.03);
      groinJoint.userData = { hitZone: 'joint', jointName: 'groin' };
      body.add(groinJoint);

      // 4. Back of knees (popliteal fossa)
      const kneeBackL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.03), jointMat);
      kneeBackL.position.set(-0.09, 0.13, -0.05);
      kneeBackL.userData = { hitZone: 'joint', jointName: 'knee' };
      const kneeBackR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.03), jointMat);
      kneeBackR.position.set(0.09, 0.13, -0.05);
      kneeBackR.userData = { hitZone: 'joint', jointName: 'knee' };
      body.add(kneeBackL, kneeBackR);
    }

    // Head / Helm / Hood
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), headMat);
    head.position.y = 0.78;
    head.userData = { hitZone: 'head' };
    body.add(head);

    if (kind === 'warden') {
      // Horned Greathelm
      const hornGeo = new THREE.ConeGeometry(0.04, 0.18, 5);
      const hornL = new THREE.Mesh(hornGeo, secondaryMat);
      hornL.position.set(-0.12, 0.9, 0);
      hornL.rotation.z = 0.45;
      const hornR = new THREE.Mesh(hornGeo, secondaryMat);
      hornR.position.set(0.12, 0.9, 0);
      hornR.rotation.z = -0.45;
      body.add(hornL, hornR);
    }

    // Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.025, 0.03);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.05, 0.79, 0.12);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.05, 0.79, 0.12);
    body.add(eyeL, eyeR);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.26, 5);
    const legL = new THREE.Mesh(legGeo, secondaryMat);
    legL.position.set(-0.09, 0.13, 0);
    legL.userData = { hitZone: 'legs' };
    const legR = new THREE.Mesh(legGeo, secondaryMat);
    legR.position.set(0.09, 0.13, 0);
    legR.userData = { hitZone: 'legs' };
    body.add(legL, legR);

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 6), secondaryMat);
    belt.position.y = 0.27;
    body.add(belt);

    if (kind === 'skeleton') {
      // Ribcage & Jaw
      for (let r = 0; r < 3; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.026, 0.22), headMat);
        rib.position.set(0, 0.38 + r * 0.075, 0.02);
        body.add(rib);
      }
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.055, 0.13), headMat);
      jaw.position.set(0, 0.69, 0.03);
      body.add(jaw);
    } else if (kind === 'cultist') {
      // Pointed Hood & Robe Skirt
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.22, 6), primaryMat);
      hood.position.set(0, 0.92, -0.02);
      hood.rotation.x = -0.15;
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.25, 6), primaryMat);
      robe.position.y = 0.14;
      body.add(hood, robe);
    } else if (kind === 'warden') {
      // Armored Visor & Cape
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.045, 0.18), secondaryMat);
      visor.position.set(0, 0.77, 0.04);
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.03), new THREE.MeshLambertMaterial({ color: 0x7f1d1d, flatShading: true }));
      cape.position.set(0, 0.4, -0.17);
      cape.rotation.x = 0.12;
      body.add(visor, cape);
    } else if (kind === 'bandit') {
      // Bandit Face Mask & Vest
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), new THREE.MeshLambertMaterial({ color: 0x1c1917, flatShading: true }));
      mask.position.set(0, 0.74, 0.06);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.38, 0.23), secondaryMat);
      vest.position.set(0, 0.46, 0);
      body.add(mask, vest);
    }

    // Right Arm + Detailed 3D Sword (edge-on)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.24, 0.6, 0);
    const armMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.26, 5), primaryMat);
    armMeshR.position.y = -0.1;
    const sword = this.createDetailedSword(
      kind === 'warden' ? 0xf8fafc : 0xcbd5e1,
      kind === 'warden' ? 0.58 : 0.46
    );
    sword.position.set(0, -0.22, 0.04);
    sword.rotation.x = Math.PI / 2;
    sword.rotation.y = Math.PI / 2;
    rightArm.add(armMeshR, sword);
    group.add(rightArm);

    // Left Arm + Detailed 3D Shield
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.24, 0.56, 0.05);
    const shield = this.createDetailedShield(
      kind === 'cultist' ? 0x450a0a : 0x78350f,
      p.secondary,
      kind === 'warden' ? 1.25 : 1.0
    );
    shield.position.set(-0.04, -0.05, 0.12);
    leftArm.add(shield);
    group.add(leftArm);

    return { group, rightArm, leftArm, body };
  }


  public createVillageWell(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x47494a, flatShading: true });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2817, flatShading: true });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x162a45, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2b1c11, flatShading: true });

    // Round stone well curb
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.65, 8), stoneMat);
    curb.position.y = 0.325;
    root.add(curb);

    // Dark water inside well
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.05, 8), waterMat);
    water.position.y = 0.40;
    root.add(water);

    // Two wooden upright posts
    const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.45, 0.10), woodMat);
    post1.position.set(-0.62, 0.95, 0);
    const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.45, 0.10), woodMat);
    post2.position.set(0.62, 0.95, 0);

    // Cross beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.09, 0.09), woodMat);
    beam.position.set(0, 1.62, 0);

    // Winch axle & hanging bucket
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 6), woodMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 1.35, 0);

    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 6), woodMat);
    bucket.position.set(0.12, 0.85, 0);

    // Pitched timber roof over the well
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 1.3), roofMat);
    roof1.rotation.z = 0.52;
    roof1.position.set(-0.35, 1.85, 0);

    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 1.3), roofMat);
    roof2.rotation.z = -0.52;
    roof2.position.set(0.35, 1.85, 0);

    root.add(post1, post2, beam, axle, bucket, roof1, roof2);
    return root;
  }

  public createElderCottage(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x47494a, flatShading: true });
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x4e3522, flatShading: true });
    const plasterMat = new THREE.MeshLambertMaterial({ color: 0xc8bba8, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2e1d12, flatShading: true });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3d2313, flatShading: true });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x262626, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Stone foundation footing
    const found = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.35, 3.6), stoneMat);
    found.position.y = 0.175;
    root.add(found);

    // 2. Main timber & wattle-and-daub walls (5.0m wide, 3.5m deep, 2.1m high)
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.05, 3.4), plasterMat);
    walls.position.y = 1.375;
    root.add(walls);

    // Vertical corner timber pillars
    for (const [cx, cz] of [[-2.4, -1.7], [2.4, -1.7], [-2.4, 1.7], [2.4, 1.7]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), timberMat);
      pillar.position.set(cx, 1.4, cz);
      root.add(pillar);
    }
    // Horizontal beams
    const topBeam1 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.14, 0.14), timberMat);
    topBeam1.position.set(0, 2.38, 1.7);
    const topBeam2 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.14, 0.14), timberMat);
    topBeam2.position.set(0, 2.38, -1.7);
    root.add(topBeam1, topBeam2);

    // 3. Wooden Door at front (facing South into village plaza at z = 1.71)
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.08), timberMat);
    doorFrame.position.set(0, 1.22, 1.72);
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.80, 1.62, 0.05), doorMat);
    doorLeaf.position.set(0, 1.16, 1.73);
    const doorHandle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), ironMat);
    doorHandle.position.set(0.28, 1.15, 1.77);
    const doorstep = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.45), timberMat);
    doorstep.position.set(0, 0.07, 1.95);
    root.add(doorFrame, doorLeaf, doorHandle, doorstep);

    // Lantern by door
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), new THREE.MeshLambertMaterial({ color: 0x1c1917 }));
    lantern.position.set(0.68, 1.65, 1.82);
    const lanternCore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), glowMat);
    lanternCore.position.set(0.68, 1.65, 1.82);
    const lanternLight = new THREE.PointLight(0xf59e0b, 1.5, 6.0);
    lanternLight.position.set(0.68, 1.65, 1.95);
    root.add(lantern, lanternCore, lanternLight);

    // Windows with warm light
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.06), glowMat);
    win1.position.set(-1.4, 1.45, 1.72);
    const winFrame1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.04), timberMat);
    winFrame1.position.set(-1.4, 1.45, 1.71);
    root.add(win1, winFrame1);

    // 4. Full Pitched Gable Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.09, 2.25), roofMat);
    roofS.rotation.x = 0.62;
    roofS.position.set(0, 2.85, 0.95);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.09, 2.25), roofMat);
    roofN.rotation.x = -0.62;
    roofN.position.set(0, 2.85, -0.95);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.14, 0.14), timberMat);
    ridge.position.set(0, 3.52, 0);

    // Triangular Gable Walls (East and West ends)
    const gableGeo = new THREE.BufferGeometry();
    const gverts = new Float32Array([
      0, 0, -1.7,
      0, 0,  1.7,
      0, 1.15, 0,
      0, 0, -1.7,
      0, 1.15, 0,
      0, 0,  1.7,
    ]);
    gableGeo.setAttribute('position', new THREE.BufferAttribute(gverts, 3));
    gableGeo.computeVertexNormals();

    const gableW = new THREE.Mesh(gableGeo, timberMat);
    gableW.position.set(-2.4, 2.4, 0);
    const gableE = new THREE.Mesh(gableGeo, timberMat);
    gableE.position.set(2.4, 2.4, 0);

    // 5. Stone Chimney Stack
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.6, 0.65), stoneMat);
    chimney.position.set(1.5, 2.0, -0.6);
    const chimneyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 6), stoneMat);
    chimneyPot.position.set(1.5, 3.95, -0.6);

    root.add(roofS, roofN, ridge, gableW, gableE, chimney, chimneyPot);
    return root;
  }

  public createMerchantShop(): THREE.Group {
    const root = new THREE.Group();
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x48321e, flatShading: true });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x322114, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x24170e, flatShading: true });
    const awningGreen = new THREE.MeshLambertMaterial({ color: 0x166534, flatShading: true });
    const awningGold = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x5a3d24, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    // 1. Shop Building Walls (4.4m wide in X, 3.3m deep in Z, 2.2m high)
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 3.3), timberMat);
    walls.position.y = 1.1;
    root.add(walls);

    // 2. Pitched Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 2.15), roofMat);
    roofS.rotation.x = 0.58;
    roofS.position.set(0, 2.65, 0.90);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 2.15), roofMat);
    roofN.rotation.x = -0.58;
    roofN.position.set(0, 2.65, -0.90);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.12), darkWoodMat);
    ridge.position.set(0, 3.25, 0);
    root.add(roofS, roofN, ridge);

    // 3. Market Front Facade (Facing East towards village square at X = +2.2)
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.90, 2.2), darkWoodMat);
    counter.position.set(2.4, 0.45, 0);
    root.add(counter);

    // Striped Canvas Awning over counter (Gold & Green stripes)
    const awningGroup = new THREE.Group();
    awningGroup.position.set(2.4, 1.85, 0);
    for (let i = 0; i < 6; i++) {
      const stripeMat = i % 2 === 0 ? awningGreen : awningGold;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.38), stripeMat);
      stripe.rotation.z = -0.32;
      stripe.position.set(0.48, -0.16, -0.95 + i * 0.38);
      awningGroup.add(stripe);
    }
    // Timber awning supports
    const strut1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), timberMat);
    strut1.rotation.z = -0.65;
    strut1.position.set(0.45, -0.35, -0.95);
    const strut2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), timberMat);
    strut2.rotation.z = -0.65;
    strut2.position.set(0.45, -0.35, 0.95);
    awningGroup.add(strut1, strut2);
    root.add(awningGroup);

    // Market Lantern on counter beam
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), new THREE.MeshLambertMaterial({ color: 0x1c1917 }));
    lantern.position.set(2.7, 1.6, 1.0);
    const lanternGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.06), glowMat);
    lanternGlow.position.set(2.7, 1.6, 1.0);
    const light = new THREE.PointLight(0xf59e0b, 1.6, 5.5);
    light.position.set(2.7, 1.6, 1.0);
    root.add(lantern, lanternGlow, light);

    // Barrels and Crates outside
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 8), barrelMat);
    barrel1.position.set(2.4, 0.325, 1.35);
    const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 8), barrelMat);
    barrel2.position.set(2.4, 0.275, -1.35);
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.42), timberMat);
    crate1.position.set(2.5, 0.175, 1.85);
    root.add(barrel1, barrel2, crate1);

    return root;
  }

  public createBlacksmithForge(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x434448, flatShading: true });
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x3d2716, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x221a15, flatShading: true });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // 1. Smithy Building Walls (4.8m wide in X, 3.6m deep in Z, 2.3m high)
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.3, 3.6), stoneMat);
    walls.position.y = 1.15;
    root.add(walls);

    // 2. High Stone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.8, 0.85), stoneMat);
    chimney.position.set(-1.6, 1.9, 0.8);
    root.add(chimney);

    // 3. Sloped Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.08, 2.3), roofMat);
    roofS.rotation.x = 0.52;
    roofS.position.set(0, 2.75, 1.0);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.08, 2.3), roofMat);
    roofN.rotation.x = -0.52;
    roofN.position.set(0, 2.75, -1.0);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.12), timberMat);
    ridge.position.set(0, 3.32, 0);
    root.add(roofS, roofN, ridge);

    // 4. Open-Air Smithing Porch / Canopy (Facing North into village square at Z = -1.8)
    const canopyRafter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.8), roofMat);
    canopyRafter.rotation.x = -0.22;
    canopyRafter.position.set(-0.4, 2.2, -2.6);

    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.0, 6), timberMat);
    post1.position.set(-2.0, 1.0, -3.3);
    const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.0, 6), timberMat);
    post2.position.set(1.2, 1.0, -3.3);
    root.add(canopyRafter, post1, post2);

    // 5. Forge Hearth with Glowing Coals
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), stoneMat);
    hearth.position.set(-1.6, 0.375, -2.4);
    const coals = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), fireMat);
    coals.position.set(-1.6, 0.78, -2.4);
    const forgeLight = new THREE.PointLight(0xf97316, 2.4, 6.0);
    forgeLight.position.set(-1.6, 1.0, -2.4);
    root.add(hearth, coals, forgeLight);

    // 6. Heavy Forged Iron Anvil on Oak Stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.46, 7), timberMat);
    stump.position.set(-0.4, 0.23, -2.6);

    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.36), ironMat);
    anvilBase.position.set(-0.4, 0.52, -2.6);
    const anvilWaist = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), ironMat);
    anvilWaist.position.set(-0.4, 0.65, -2.6);
    const anvilFace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.44), ironMat);
    anvilFace.position.set(-0.4, 0.78, -2.6);
    const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 5), ironMat);
    anvilHorn.rotation.x = Math.PI / 2;
    anvilHorn.position.set(-0.4, 0.78, -2.9);
    root.add(stump, anvilBase, anvilWaist, anvilFace, anvilHorn);

    // 7. Water Quenching Tub
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.8), timberMat);
    tub.position.set(0.6, 0.21, -2.6);
    const tubWater = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.72), new THREE.MeshLambertMaterial({ color: 0x1e3a5f }));
    tubWater.position.set(0.6, 0.38, -2.6);
    root.add(tub, tubWater);

    return root;
  }

  public createSignpost(): THREE.Group {
    const root = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x54361c, flatShading: true });
    const signMat = new THREE.MeshLambertMaterial({ color: 0x7c4f28, flatShading: true });
    const arrowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, flatShading: true });

    // Vertical wooden post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6), woodMat);
    post.position.y = 0.5;
    root.add(post);

    // Top Sign pointing West (to Village)
    const signWest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), signMat);
    signWest.position.set(-0.16, 0.82, 0.02);
    const arrowWest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), arrowMat);
    arrowWest.rotation.z = Math.PI / 2;
    arrowWest.position.set(-0.38, 0.82, 0.02);
    root.add(signWest, arrowWest);

    // Bottom Sign pointing East (to Bandit Camp)
    const signEast = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.04), signMat);
    signEast.position.set(0.16, 0.64, -0.02);
    const arrowEast = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), arrowMat);
    arrowEast.rotation.z = -Math.PI / 2;
    arrowEast.position.set(0.38, 0.64, -0.02);
    root.add(signEast, arrowEast);

    return root;
  }

  public createCampfire(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x474c47, flatShading: true });
    const logMat = new THREE.MeshLambertMaterial({ color: 0x3d2511, flatShading: true });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Ring of stones
    for (let i = 0; i < 7; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), stoneMat);
      const angle = (i / 7) * Math.PI * 2;
      stone.position.set(Math.cos(angle) * 0.28, 0.05, Math.sin(angle) * 0.28);
      root.add(stone);
    }

    // Crossed firewood logs
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 5), logMat);
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.4;
    log1.position.y = 0.06;
    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 5), logMat);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.4;
    log2.position.y = 0.08;
    root.add(log1, log2);

    // Burning glowing flames
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), fireMat);
    flame.position.y = 0.18;
    root.add(flame);

    const flameLight = new THREE.PointLight(0xf97316, 2.5, 7.0);
    flameLight.position.y = 0.28;
    root.add(flameLight);

    return root;
  }

  public createTavern(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x48444c, flatShading: true });
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x3d2716, flatShading: true });
    const plasterMat = new THREE.MeshLambertMaterial({ color: 0xd4c7b5, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x241d1a, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x54361c, flatShading: true });

    // 1st Floor: Solid stone tavern hall
    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 4.2), stoneMat);
    floor1.position.y = 1.1;
    root.add(floor1);

    // 2nd Floor: Half-timbered upper guest floor with Jetty Overhang
    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(5.9, 2.0, 4.5), plasterMat);
    floor2.position.y = 3.2;
    root.add(floor2);

    // Timber vertical framing on 2nd floor
    for (const [bx, bz] of [[-2.9, -2.2], [2.9, -2.2], [-2.9, 2.2], [2.9, 2.2], [0, 2.22], [-1.5, 2.22], [1.5, 2.22]]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.0, 0.14), timberMat);
      beam.position.set(bx, 3.2, bz);
      root.add(beam);
    }

    // Heavy Slate Gabled Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 2.8), roofMat);
    roofS.rotation.x = 0.58;
    roofS.position.set(0, 4.85, 1.25);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 2.8), roofMat);
    roofN.rotation.x = -0.58;
    roofN.position.set(0, 4.85, -1.25);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.16, 0.16), timberMat);
    ridge.position.set(0, 5.62, 0);
    root.add(roofS, roofN, ridge);

    // Stone Chimney Stack
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.8, 0.8), stoneMat);
    chimney.position.set(-2.0, 2.9, -1.4);
    root.add(chimney);

    // Front Entrance Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.08), timberMat);
    door.position.set(0, 0.95, 2.14);
    root.add(door);

    // Hanging Tavern Signpost ("Пьяный Гоблин")
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), timberMat);
    crane.position.set(1.4, 2.1, 2.5);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.04), new THREE.MeshLambertMaterial({ color: 0x854d0e }));
    signBoard.position.set(1.4, 1.8, 2.7);
    const signMug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    signMug.position.set(1.4, 1.8, 2.74);
    root.add(crane, signBoard, signMug);

    // Warm Leaded Windows
    for (const wx of [-1.6, 1.6]) {
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.06), glowMat);
      win1.position.set(wx, 1.3, 2.14);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.06), glowMat);
      win2.position.set(wx, 3.3, 2.28);
      root.add(win1, win2);
    }

    // Outdoor Beer Patio: Tables, Benches & Barrels
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.8), timberMat);
    table.position.set(-1.8, 0.6, 3.2);
    const tLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), timberMat);
    tLeg1.position.set(-2.4, 0.3, 3.2);
    const tLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), timberMat);
    tLeg2.position.set(-1.2, 0.3, 3.2);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.3), timberMat);
    bench.position.set(-1.8, 0.35, 3.8);
    root.add(table, tLeg1, tLeg2, bench);

    // Stacked ale casks
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 8), barrelMat);
    b1.position.set(2.2, 0.33, 2.6);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 8), barrelMat);
    b2.position.set(2.6, 0.3, 2.6);
    root.add(b1, b2);

    // Warm porch lantern light
    const porchLight = new THREE.PointLight(0xf59e0b, 1.8, 7.0);
    porchLight.position.set(0, 2.1, 2.4);
    root.add(porchLight);

    return root;
  }

  public createHerbalistCottage(): THREE.Group {
    const root = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3d3a40, flatShading: true });
    const plasterMat = new THREE.MeshLambertMaterial({ color: 0xc4b99f, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0x585a2d, flatShading: true });
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x422a18, flatShading: true });
    const herbGlow = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Wattle-and-daub cottage body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.0, 3.2), plasterMat);
    body.position.y = 1.0;
    root.add(body);

    // Curved Mossy Thatched Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 2.1), thatchMat);
    roofS.rotation.x = 0.62;
    roofS.position.set(0, 2.55, 0.9);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 2.1), thatchMat);
    roofN.rotation.x = -0.62;
    roofN.position.set(0, 2.55, -0.9);
    root.add(roofS, roofN);

    // Cobblestone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.5, 0.65), stoneMat);
    chimney.position.set(-1.4, 1.75, 0.8);
    root.add(chimney);

    // Door and round window
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 0.06), timberMat);
    door.position.set(0.6, 0.85, 1.62);
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 8), glowMat);
    win.rotation.x = Math.PI / 2;
    win.position.set(-0.9, 1.2, 1.62);
    root.add(door, win);

    // Fenced Herb Garden with glowing Moon Lilies and nightshade
    const gardenFence = new THREE.Group();
    gardenFence.position.set(-1.8, 0, 2.6);
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), timberMat);
      post.position.set(i * 0.7 - 1.0, 0.3, 0);
      gardenFence.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.05), timberMat);
    rail.position.set(0, 0.45, 0);
    gardenFence.add(rail);

    // Glowing garden blossoms
    for (let i = 0; i < 5; i++) {
      const flower = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), herbGlow);
      flower.position.set((i * 0.4) - 0.8, 0.2, -0.4 + (i % 2) * 0.3);
      gardenFence.add(flower);
    }
    const gardenLight = new THREE.PointLight(0xa855f7, 1.5, 4.0);
    gardenLight.position.set(0, 0.6, -0.2);
    gardenFence.add(gardenLight);
    root.add(gardenFence);

    // Alchemy Table with Alembic & Pot
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.5), stoneMat);
    table.position.set(1.4, 0.325, 2.2);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.16, 6), stoneMat);
    pot.position.set(1.4, 0.73, 2.2);
    const alembic = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
    alembic.position.set(1.65, 0.73, 2.2);
    root.add(table, pot, alembic);

    return root;
  }

  public createHuntersLodge(): THREE.Group {
    const root = new THREE.Group();
    const logMat = new THREE.MeshLambertMaterial({ color: 0x3d2716, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x1f1712, flatShading: true });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, flatShading: true });
    const hideMat = new THREE.MeshLambertMaterial({ color: 0x92400e, flatShading: true });
    const strawMat = new THREE.MeshLambertMaterial({ color: 0xca8a04, flatShading: true });

    // Pine Log Cabin Walls
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.1, 3.4), logMat);
    cabin.position.y = 1.05;
    root.add(cabin);

    // Overlapping Timber Roof
    const roofS = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.2), roofMat);
    roofS.rotation.x = 0.55;
    roofS.position.set(0, 2.6, 0.95);
    const roofN = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.2), roofMat);
    roofN.rotation.x = -0.55;
    roofN.position.set(0, 2.6, -0.95);
    root.add(roofS, roofN);

    // Door with deer skull and antlers
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 0.06), logMat);
    door.position.set(0, 0.85, 1.72);
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), hornMat);
    skull.rotation.x = Math.PI;
    skull.position.set(0, 1.85, 1.76);
    const antlerL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 3, 6, Math.PI / 1.5), hornMat);
    antlerL.position.set(-0.12, 1.95, 1.76);
    const antlerR = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 3, 6, Math.PI / 1.5), hornMat);
    antlerR.rotation.y = Math.PI;
    antlerR.position.set(0.12, 1.95, 1.76);
    root.add(door, skull, antlerL, antlerR);

    // Pelt drying frame
    const framePost1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4), logMat);
    framePost1.position.set(-1.8, 0.7, 2.4);
    const framePost2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4), logMat);
    framePost2.position.set(-1.0, 0.7, 2.4);
    const hide = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.02), hideMat);
    hide.position.set(-1.4, 0.75, 2.4);
    root.add(framePost1, framePost2, hide);

    // Archery Straw Target Butt
    const target = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 8), strawMat);
    target.rotation.x = Math.PI / 2;
    target.position.set(1.8, 0.75, 2.5);
    const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    bullseye.position.set(1.8, 0.75, 2.6);
    root.add(target, bullseye);

    // Firewood chopping block with embedded axe
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.45, 6), logMat);
    stump.position.set(1.4, 0.225, 1.9);
    const axe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.32), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
    axe.position.set(1.4, 0.52, 1.9);
    root.add(stump, axe);

    return root;
  }

  public createNoticeBoard(): THREE.Group {
    const root = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e3522, flatShading: true });
    const parchmentMat = new THREE.MeshLambertMaterial({ color: 0xfef3c7, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x221811, flatShading: true });

    // 2 upright posts
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), woodMat);
    p1.position.set(-0.65, 1.0, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), woodMat);
    p2.position.set(0.65, 1.0, 0);

    // Main notice board back
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), woodMat);
    board.position.set(0, 1.35, 0);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.45), roofMat);
    roof.position.set(0, 1.95, 0);

    // Pinned quest notices (parchment scrolls)
    for (const [nx, ny] of [[-0.35, 1.45], [0.1, 1.5], [0.38, 1.3], [-0.15, 1.25]]) {
      const notice = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.02), parchmentMat);
      notice.position.set(nx, ny, 0.05);
      root.add(notice);
    }

    root.add(p1, p2, board, roof);
    return root;
  }

  public createGuardOutpost(): THREE.Group {
    const root = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x452a16, flatShading: true });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x27272a, flatShading: true });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Left and Right wooden palisade barrier walls
    for (const side of [-1, 1]) {
      const wall = new THREE.Group();
      wall.position.x = side * 2.2;
      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 5), woodMat);
        log.position.set(i * 0.22 - 0.33, 1.1, 0);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), woodMat);
        tip.position.set(i * 0.22 - 0.33, 2.35, 0);
        wall.add(log, tip);
      }
      // Torch brazier on guard post
      const brazierPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 5), woodMat);
      brazierPost.position.set(-side * 0.4, 0.8, 0.2);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.12, 6), ironMat);
      bowl.position.set(-side * 0.4, 1.65, 0.2);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), fireMat);
      flame.position.set(-side * 0.4, 1.76, 0.2);
      const light = new THREE.PointLight(0xf97316, 1.8, 6.0);
      light.position.set(-side * 0.4, 1.85, 0.3);
      wall.add(brazierPost, bowl, flame, light);
      root.add(wall);
    }

    return root;
  }

  public createDetailedMoonLily(): THREE.Group {
    const root = new THREE.Group();
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const petalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    // Slender curved stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5), stemMat);
    stem.position.y = 0.16;
    root.add(stem);

    // 4 glowing petals
    for (let i = 0; i < 4; i++) {
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), petalMat);
      const angle = (i / 4) * Math.PI * 2;
      petal.rotation.z = 0.35;
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.03, 0.3, Math.sin(angle) * 0.03);
      root.add(petal);
    }

    // Glowing core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), glowMat);
    core.position.y = 0.34;
    const light = new THREE.PointLight(0x38bdf8, 1.8, 3.0);
    light.position.y = 0.36;
    root.add(core, light);

    return root;
  }

  public createDetailedOreSack(): THREE.Group {
    const root = new THREE.Group();
    const burlapMat = new THREE.MeshLambertMaterial({ color: 0x785334, flatShading: true });
    const oreMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });

    // Sack body
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), burlapMat);
    sack.scale.set(1.2, 0.9, 1.1);
    sack.position.y = 0.14;

    // Tied rope collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 8), burlapMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.24;

    // Glowing metallic ore chunks poking out of top
    const ore1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), oreMat);
    ore1.position.set(0.04, 0.28, 0.02);
    const ore2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05, 0), oreMat);
    ore2.position.set(-0.04, 0.27, -0.02);

    root.add(sack, collar, ore1, ore2);
    return root;
  }

  public createDenseForestWall(x: number, z: number): THREE.Group {
    const root = new THREE.Group();
    root.position.set(x + 0.5, 0, z + 0.5);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2b1810, flatShading: true });
    const pineDarkMat = new THREE.MeshLambertMaterial({ color: 0x0c2512, flatShading: true });
    const pineMidMat = new THREE.MeshLambertMaterial({ color: 0x143b1e, flatShading: true });
    const pineDeepMat = new THREE.MeshLambertMaterial({ color: 0x091c0e, flatShading: true });
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x12351b, flatShading: true });

    // Seed variations for natural forest appearance
    const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    const r1 = hash - Math.floor(hash);
    const r2 = (hash * 1.5) - Math.floor(hash * 1.5);

    // 1. Central Dominant Towering Pine (3.5 - 4.2m tall, broad 1.18m canopy overlapping borders)
    const trunkH = 1.1 + r1 * 0.3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, trunkH, 5), trunkMat);
    trunk.position.y = trunkH / 2;
    root.add(trunk);

    const canopy = new THREE.Group();
    canopy.name = 'tree_canopy';
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.18, 1.1, 6), pineDarkMat);
    c1.position.y = trunkH + 0.35;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.95, 6), pineMidMat);
    c2.position.y = trunkH + 0.95;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.85, 6), pineDeepMat);
    c3.position.y = trunkH + 1.55;
    const c4 = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.75, 5), pineMidMat);
    c4.position.y = trunkH + 2.15;
    canopy.add(c1, c2, c3, c4);
    root.add(canopy);

    // 2. Secondary Flanking Spruce (Offset to seal any gap)
    const sTrunkH = 0.8 + r2 * 0.2;
    const sTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, sTrunkH, 5), trunkMat);
    sTrunk.position.set(-0.32, sTrunkH / 2, 0.28);
    root.add(sTrunk);

    const s1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.85, 5), pineMidMat);
    s1.position.set(-0.32, sTrunkH + 0.25, 0.28);
    const s2 = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.75, 5), pineDarkMat);
    s2.position.set(-0.32, sTrunkH + 0.75, 0.28);
    const s3 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 5), pineDeepMat);
    s3.position.set(-0.32, sTrunkH + 1.25, 0.28);
    root.add(s1, s2, s3);

    // 3. Third Satellite Pine (Opposite side)
    const tTrunkH = 0.7 + r1 * 0.2;
    const tTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, tTrunkH, 5), trunkMat);
    tTrunk.position.set(0.34, tTrunkH / 2, -0.26);
    root.add(tTrunk);

    const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.75, 5), pineDeepMat);
    t1.position.set(0.34, tTrunkH + 0.22, -0.26);
    const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.65, 5), pineMidMat);
    t2.position.set(0.34, tTrunkH + 0.68, -0.26);
    root.add(t1, t2);

    // 4. Ground-level dense shrubs sealing base gaps
    const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), bushMat);
    b1.position.set(0.18, 0.22, 0.32);
    const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), pineDeepMat);
    b2.position.set(-0.25, 0.18, -0.24);
    root.add(b1, b2);

    return root;
  }

  public createDetailedNpc(npcId = 'elder_mark', name = 'NPC'): THREE.Group {
    const root = new THREE.Group();
    root.name = 'npc_' + npcId;
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0a980, flatShading: true });
    const hairWhite = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, flatShading: true });
    const hairBrown = new THREE.MeshLambertMaterial({ color: 0x54361c, flatShading: true });
    const hairDark = new THREE.MeshLambertMaterial({ color: 0x27272a, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e3522, flatShading: true });
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.16), hairDark);
    legs.position.y = 0.16;
    root.add(legs);

    // Body
    let bodyColor = 0x1e3a5f;
    if (npcId === 'merchant_gus') bodyColor = 0x15803d;
    else if (npcId === 'blacksmith_torin') bodyColor = 0x451a03;
    else if (npcId === 'innkeeper_bran') bodyColor = 0x831843;
    else if (npcId === 'herbalist_isolda') bodyColor = 0x14532d;
    else if (npcId === 'hunter_ragnar') bodyColor = 0x713f12;
    else if (npcId === 'guard_olgerd') bodyColor = 0xb91c1c;

    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.48, 6), bodyMat);
    body.position.y = 0.52;
    body.name = 'npc_body';
    root.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), skinMat);
    head.position.y = 0.84;
    head.name = 'npc_head';
    root.add(head);

    if (npcId === 'elder_mark') {
      // Long wise beard + cowl + elder staff with glowing amber tip
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 5), hairWhite);
      beard.rotation.x = 0.2;
      beard.position.set(0, 0.74, 0.08);
      const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0x1e3a5f }));
      cowl.position.set(0, 0.94, -0.02);
      const staffGroup = new THREE.Group();
      staffGroup.position.set(0.24, 0, 0.12);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.15, 5), woodMat);
      shaft.position.y = 0.58;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      crystal.position.y = 1.16;
      staffGroup.add(shaft, crystal);
      staffGroup.name = 'elder_staff';
      root.add(beard, cowl, staffGroup);
    } else if (npcId === 'merchant_gus') {
      // Feathered beret hat + coin purse
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.07, 7), goldMat);
      hat.position.set(0, 0.93, 0);
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 4), new THREE.MeshLambertMaterial({ color: 0xef4444 }));
      feather.rotation.z = -0.5;
      feather.position.set(0.12, 1.0, 0);
      const pouch = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), goldMat);
      pouch.position.set(0.18, 0.46, 0.08);
      root.add(hat, feather, pouch);
    } else if (npcId === 'blacksmith_torin') {
      // Heavy leather apron + smithing hammer
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.06), leatherMat);
      apron.position.set(0, 0.48, 0.09);
      const hammer = new THREE.Group();
      hammer.name = 'smith_hammer';
      hammer.position.set(0.24, 0.58, 0.1);
      const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 5), woodMat);
      hHandle.position.y = -0.1;
      const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), steelMat);
      hHead.position.y = 0.12;
      hammer.add(hHandle, hHead);
      root.add(apron, hammer);
    } else if (npcId === 'innkeeper_bran') {
      // White apron + beer tankard + polishing rag
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.04), new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }));
      apron.position.set(0, 0.46, 0.08);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6), woodMat);
      mug.position.set(-0.2, 0.55, 0.15);
      const rag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
      rag.name = 'inn_rag';
      rag.position.set(-0.16, 0.58, 0.15);
      root.add(apron, mug, rag);
    } else if (npcId === 'herbalist_isolda') {
      // Herb wreath + basket with glowing herb
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 4, 8), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
      wreath.rotation.x = Math.PI / 2;
      wreath.position.set(0, 0.94, 0);
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 6), woodMat);
      basket.position.set(0.2, 0.48, 0.12);
      const herbFlower = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
      herbFlower.position.set(0.2, 0.54, 0.12);
      root.add(wreath, basket, herbFlower);
    } else if (npcId === 'hunter_ragnar') {
      // Hunting bow + quiver + hunting knife
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.38, 5), leatherMat);
      quiver.rotation.z = -0.3;
      quiver.position.set(-0.12, 0.65, -0.12);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 4, 8, Math.PI), woodMat);
      bow.rotation.y = Math.PI / 2;
      bow.position.set(0.14, 0.62, -0.1);
      const knife = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.02), steelMat);
      knife.position.set(0.18, 0.48, 0.12);
      knife.name = 'hunter_knife';
      root.add(quiver, bow, knife);
    } else if (npcId === 'guard_olgerd') {
      // Steel helmet + halberd spear + shield
      const helm = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 6), steelMat);
      helm.position.set(0, 0.96, 0);
      const spear = new THREE.Group();
      spear.name = 'guard_spear';
      spear.position.set(0.22, 0, 0.1);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5), woodMat);
      shaft.position.y = 0.8;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), steelMat);
      blade.position.y = 1.65;
      spear.add(shaft, blade);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.24), new THREE.MeshLambertMaterial({ color: 0x991b1b }));
      shield.position.set(-0.2, 0.55, 0.05);
      root.add(helm, spear, shield);
    }

    return root;
  }

  public createDetailedTrophyEar(): THREE.Group {
    const root = new THREE.Group();
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
    const bloodMat = new THREE.MeshLambertMaterial({ color: 0x991b1b, flatShading: true });

    // Trophy pouch / dried ear token
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), leatherMat);
    base.scale.set(1.2, 0.8, 1.4);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), bloodMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.05;
    root.add(base, cord);

    return root;
  }

  private buildUnifiedWorldGeometry(map: number[][]) {
    const rows = map.length;
    const cols = map[0].length;

    // 1. Crypt Stone Floor (rows 0..21, cols 0..22)
    const cryptFloorGeo = new THREE.PlaneGeometry(22, 21);
    const cryptFloorMat = new THREE.MeshLambertMaterial({ color: 0x262229 });
    const cryptFloor = new THREE.Mesh(cryptFloorGeo, cryptFloorMat);
    cryptFloor.rotation.x = -Math.PI / 2;
    cryptFloor.position.set(11, 0, 10.5);
    this.scene.add(cryptFloor);

    // Crypt Stone Ceiling (y = 1.0)
    const cryptCeilMat = new THREE.MeshLambertMaterial({ color: 0x141117 });
    const cryptCeil = new THREE.Mesh(cryptFloorGeo, cryptCeilMat);
    cryptCeil.rotation.x = Math.PI / 2;
    cryptCeil.position.set(11, 1.0, 10.5);
    this.scene.add(cryptCeil);

    // 2. Outdoor Grass Floor (rows 21..54, cols 0..48)
    const outdoorFloorGeo = new THREE.PlaneGeometry(cols, rows - 21);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x1f3b18, flatShading: true });
    const outdoorFloor = new THREE.Mesh(outdoorFloorGeo, grassMat);
    outdoorFloor.rotation.x = -Math.PI / 2;
    outdoorFloor.position.set(cols / 2, 0, 21 + (rows - 21) / 2);
    this.scene.add(outdoorFloor);

    // 3. Continuous Dirt Roads connecting Crypt to Village and Bandit Camp
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x423425, flatShading: true });
    const cobbleMat = new THREE.MeshLambertMaterial({ color: 0x4a4440, flatShading: true });

    // Road 1: Crypt Exit straight south to Fork (z=20.5..28.5)
    const roadCryptToFork = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 8.5), dirtMat);
    roadCryptToFork.rotation.x = -Math.PI / 2;
    roadCryptToFork.position.set(18.0, 0.005, 24.25);
    this.scene.add(roadCryptToFork);

    // Road 2: Connector from Fork into Village Square (z=28.0..34.0)
    const roadForkToVillage = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.0), dirtMat);
    roadForkToVillage.rotation.x = -Math.PI / 2;
    roadForkToVillage.position.set(17.5, 0.006, 31.0);
    this.scene.add(roadForkToVillage);

    // Road 3: Wide Village Plaza (connecting Elder, Gus, Torin, and Well)
    const villagePlaza = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 12.0), dirtMat);
    villagePlaza.rotation.x = -Math.PI / 2;
    villagePlaza.position.set(15.5, 0.005, 38.5);
    this.scene.add(villagePlaza);

    // Cobblestone accents around village well
    const wellCobble = new THREE.Mesh(new THREE.CircleGeometry(2.2, 8), cobbleMat);
    wellCobble.rotation.x = -Math.PI / 2;
    wellCobble.position.set(14.5, 0.007, 38.0);
    this.scene.add(wellCobble);

    // Road 4: Trail from Fork to Bandit Camp
    const roadForkToCamp = new THREE.Mesh(new THREE.PlaneGeometry(13.0, 2.8), dirtMat);
    roadForkToCamp.rotation.x = -Math.PI / 2;
    roadForkToCamp.position.set(25.5, 0.006, 32.5);
    roadForkToCamp.rotation.z = -0.55;
    this.scene.add(roadForkToCamp);

    // Road 5: Camp approach
    const roadCampApproach = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 2.8), dirtMat);
    roadCampApproach.rotation.x = -Math.PI / 2;
    roadCampApproach.position.set(32.5, 0.005, 37.5);
    this.scene.add(roadCampApproach);

    // Road 6: Bandit camp clearing
    const campDirt = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 10.0), dirtMat);
    campDirt.rotation.x = -Math.PI / 2;
    campDirt.position.set(38.5, 0.005, 40.0);
    this.scene.add(campDirt);

    // 4. Place Bespoke Cohesive Village Architecture
    const elderHouse = this.createElderCottage();
    elderHouse.position.set(17.0, 0, 34.0);
    this.scene.add(elderHouse);

    const merchantShop = this.createMerchantShop();
    merchantShop.position.set(8.5, 0, 38.0);
    this.scene.add(merchantShop);

    const blacksmithForge = this.createBlacksmithForge();
    blacksmithForge.position.set(18.5, 0, 42.5);
    this.scene.add(blacksmithForge);

    const tavern = this.createTavern();
    tavern.position.set(11.5, 0, 32.0);
    this.scene.add(tavern);

    const herbalistCottage = this.createHerbalistCottage();
    herbalistCottage.position.set(6.5, 0, 42.5);
    this.scene.add(herbalistCottage);

    const huntersLodge = this.createHuntersLodge();
    huntersLodge.position.set(23.5, 0, 37.5);
    this.scene.add(huntersLodge);

    const guardOutpost = this.createGuardOutpost();
    guardOutpost.position.set(17.5, 0, 29.0);
    this.scene.add(guardOutpost);

    const noticeBoard = this.createNoticeBoard();
    noticeBoard.position.set(13.5, 0, 36.5);
    noticeBoard.userData = { type: 'notice_board', itemId: 8888 };
    noticeBoard.traverse((c) => {
      c.userData = { type: 'notice_board', itemId: 8888 };
    });
    this.noticeBoardMesh = noticeBoard;
    this.scene.add(noticeBoard);

    const villageWell = this.createVillageWell();
    villageWell.position.set(14.5, 0, 38.5);
    this.scene.add(villageWell);

    // Materials for dungeon walls (unified ancient stone, no bizarre green/red patches)
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const matStone = new THREE.MeshLambertMaterial({ color: 0x48444c, flatShading: true });
    const matStoneDark = new THREE.MeshLambertMaterial({ color: 0x3d3942, flatShading: true });
    const matIronBars = new THREE.MeshLambertMaterial({ color: 0x22262c, flatShading: true });

    // Materials for outdoors
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2518, flatShading: true });
    const pineDarkMat = new THREE.MeshLambertMaterial({ color: 0x14341b, flatShading: true });
    const pineMidMat = new THREE.MeshLambertMaterial({ color: 0x1a4623, flatShading: true });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x474c47, flatShading: true });

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = map[z][x];
        if (tile === 0) continue;

        if (tile === 5) {
          // Crypt Exit Gateway Door!
          const door = this.createDetailedDoor();
          door.position.set(x + 0.5, 0, z + 0.5);
          door.userData = { type: 'door', itemId: 9999 };
          door.traverse((c) => {
            c.userData = { type: 'door', itemId: 9999 };
          });
          this.doorMesh = door;
          this.scene.add(door);

          // Warm lantern glow over the crypt portal
          const doorGlow = new THREE.PointLight(0xf59e0b, 1.4, 5.0);
          doorGlow.position.set(x + 0.5, 0.85, z + 0.5);
          this.scene.add(doorGlow);
          continue;
        }

        if (tile === 6) {
          // Wooden Signpost at fork
          const signpost = this.createSignpost();
          signpost.position.set(x + 0.5, 0, z + 0.5);
          signpost.userData = { type: 'signpost', itemId: 7777 };
          signpost.traverse((c) => {
            c.userData = { type: 'signpost', itemId: 7777 };
          });
          this.signpostMeshes.push(signpost);
          this.scene.add(signpost);
          continue;
        }

        if (tile === 7) {
          // Campfire in bandit camp
          const fire = this.createCampfire();
          fire.position.set(x + 0.5, 0, z + 0.5);
          this.scene.add(fire);
          continue;
        }

                if (tile === 8) {
          // Cottage footprint: geometry is covered by bespoke architectural models above
          continue;
        }

        // Mountain cliffs around crypt and map boundaries vs outdoor pine trees
        const isMountainCliff = (z <= 21 && (x <= 21 || z <= 20)) || z >= rows - 2 || x < 2 || x >= cols - 2;
        if (isMountainCliff) {
          // Solid Mountain Stone Cliff Face
          let mat = (x + z) % 2 === 0 ? matStone : matStoneDark;
          if (tile === 4) mat = matIronBars;

          const wall = new THREE.Mesh(wallGeo, mat);
          wall.position.set(x + 0.5, 0.5, z + 0.5);
          this.scene.add(wall);

          if (x === 17 && z === 20) {
            const stuckMob = this.createStuckWallMob();
            stuckMob.position.set(x + 0.5, 0, z + 0.5);
            stuckMob.userData = { type: 'stuck_mob' };
            stuckMob.traverse((c) => {
              c.userData = { type: 'stuck_mob' };
            });
            this.stuckWallMob = stuckMob;
            this.scene.add(stuckMob);
          }
        } else {
          // Outdoor: Dense Forest Walls (seamless impenetrable tree barrier)
          const isGladeRock = (x === 28 && z === 25) || (x === 41 && z === 38);
          if (isGladeRock) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
            rock.position.set(x + 0.5, 0.4, z + 0.5);
            rock.rotation.set(0.4, 0.6, 0.2);
            this.scene.add(rock);
          } else {
            const forestWall = this.createDenseForestWall(x, z);
            this.forestWallGroups.push(forestWall);
            this.scene.add(forestWall);
          }
        }
      }
    }
  }


  private buildEnemies(enemies: Enemy[]) {
    for (const e of enemies) {
      const rig = this.createEnemyRig(e.kind);
      rig.group.position.set(e.x, 0, e.y);
      this.scene.add(rig.group);
      this.enemyRigs.set(e.id, rig);
    }
  }

  private createDetailedChest(): ChestRig {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x452311, flatShading: true });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x241107, flatShading: true });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, flatShading: true });
    const rubyFlaskMat = new THREE.MeshLambertMaterial({ color: 0xef4444, flatShading: true });
    const corkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });

    // Chest Base box sitting on floor: width 0.44, height 0.22, depth 0.30
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.3), woodMat);
    base.position.y = 0.11;

    // Dark interior cavity visible when open
    const interior = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.24), darkWoodMat);
    interior.position.y = 0.2;

    // Iron corner bands on base
    const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.225, 0.305), ironMat);
    bandL.position.set(-0.19, 0.11, 0);
    const bandR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.225, 0.305), ironMat);
    bandR.position.set(0.19, 0.11, 0);

    // Front golden lock plate
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), goldMat);
    lockPlate.position.set(0, 0.13, 0.155);

    group.add(base, interior, bandL, bandR, lockPlate);

    // Physical Potion Bottle inside chest (left side)
    const potionGroup = new THREE.Group();
    potionGroup.position.set(-0.1, 0.18, 0.02);
    const potionBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.07, 8), rubyFlaskMat);
    potionBulb.position.y = 0.035;
    const potionNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.028, 8), rubyFlaskMat);
    potionNeck.position.y = 0.082;
    const potionCork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.018, 8), corkMat);
    potionCork.position.y = 0.102;
    const potionHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.16, 0.12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    potionHit.position.y = 0.07;
    potionGroup.add(potionBulb, potionNeck, potionCork, potionHit);
    potionGroup.visible = false;
    group.add(potionGroup);

    // Physical Gold Coins mound inside chest (right side)
    const coinsGroup = new THREE.Group();
    coinsGroup.position.set(0.09, 0.19, 0.01);
    const coinMound = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.14), goldMat);
    coinMound.position.y = 0.018;
    const coinStack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.022, 8), goldMat);
    coinStack1.position.set(-0.02, 0.04, -0.01);
    const coinStack2 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.02, 8), goldMat);
    coinStack2.position.set(0.025, 0.038, 0.02);
    const coinsHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, 0.16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    coinsHit.position.y = 0.06;
    coinsGroup.add(coinMound, coinStack1, coinStack2, coinsHit);
    coinsGroup.visible = false;
    group.add(coinsGroup);

    // Hinged lid pivot placed at the rear top edge of the base
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.22, -0.15);

    // Lid geometry relative to lidPivot
    const lidBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.31), woodMat);
    lidBody.position.set(0, 0.045, 0.15);

    // Arched top ridge on lid
    const lidRidge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.18), woodMat);
    lidRidge.position.set(0, 0.1, 0.15);

    // Iron reinforcing straps on lid
    const lidBandL = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.13, 0.315), ironMat);
    lidBandL.position.set(-0.19, 0.065, 0.15);
    const lidBandR = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.13, 0.315), ironMat);
    lidBandR.position.set(0.19, 0.065, 0.15);

    // Front golden clasp
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), goldMat);
    clasp.position.set(0, 0.01, 0.31);

    lidPivot.add(lidBody, lidRidge, lidBandL, lidBandR, clasp);
    group.add(lidPivot);

    return { group, lidPivot, base, potionGroup, coinsGroup };
  }

  private buildItems(items: WorldItem[], map: number[][]) {
    for (const item of items) {
      if (item.kind === 'chest') {
        const chestRig = this.createDetailedChest();
        chestRig.group.position.set(item.x, 0, item.y);

        // Tag all parts with item IDs and types for raycasting
        chestRig.base.userData = { type: 'chest', itemId: item.id };
        chestRig.lidPivot.userData = { type: 'chest', itemId: item.id };
        chestRig.lidPivot.traverse((c) => {
          c.userData = { type: 'chest', itemId: item.id };
        });
        chestRig.potionGroup.userData = { type: 'chest_potion', itemId: item.id };
        chestRig.potionGroup.traverse((c) => {
          c.userData = { type: 'chest_potion', itemId: item.id };
        });
        chestRig.coinsGroup.userData = { type: 'chest_gold', itemId: item.id };
        chestRig.coinsGroup.traverse((c) => {
          c.userData = { type: 'chest_gold', itemId: item.id };
        });

        // Align chest facing outward from adjacent wall and snap flush against it
        const mx = Math.floor(item.x);
        const my = Math.floor(item.y);
        let px = item.x;
        let py = item.y;
        if (map[my - 1]?.[mx] !== 0) {
          chestRig.group.rotation.y = 0; // Wall North -> face South
          py = my + 0.16;
        } else if (map[my]?.[mx - 1] !== 0) {
          chestRig.group.rotation.y = -Math.PI / 2; // Wall West -> face East
          px = mx + 0.16;
        } else if (map[my]?.[mx + 1] !== 0) {
          chestRig.group.rotation.y = Math.PI / 2; // Wall East -> face West
          px = mx + 0.84;
        } else if (map[my + 1]?.[mx] !== 0) {
          chestRig.group.rotation.y = Math.PI; // Wall South -> face North
          py = my + 0.84;
        }
        chestRig.group.position.set(px, 0, py);

        this.scene.add(chestRig.group);
        this.chestRigs.set(item.id, chestRig);
      } else {
        const g = new THREE.Group();
        if (item.kind === 'npc') {
          const npcMesh = this.createDetailedNpc(item.npcId, item.name);
          g.add(npcMesh);
          g.position.set(item.x, 0, item.y);
          g.userData = { type: 'npc', itemId: item.id };
          g.traverse((c) => {
            c.userData = { type: 'npc', itemId: item.id };
          });
          this.scene.add(g);
          this.itemMeshes.set(item.id, g);
          continue;
        } else if (item.kind === 'sword' || item.kind === 'weapon') {
          if (item.name && item.name.toLowerCase().includes('лук')) {
            const bowMesh = this.createDetailedGroundBow();
            bowMesh.position.y = 0.08;
            g.add(bowMesh);
          } else {
            const blade = this.createDetailedSword(0xe2e8f0, 0.42);
            blade.position.y = 0.12;
            blade.rotation.z = 0.3;
            g.add(blade);
          }
        } else if (item.kind === 'key') {
          const keyMesh = this.createDetailedKey();
          keyMesh.position.y = 0.18;
          g.add(keyMesh);
        } else if (item.kind === 'flower') {
          const flowerMesh = this.createDetailedMoonLily();
          g.add(flowerMesh);
        } else if (item.kind === 'ore') {
          const oreMesh = this.createDetailedOreSack();
          g.add(oreMesh);
        }
        g.position.set(item.x, 0, item.y);
        g.userData = { type: 'ground_item', itemId: item.id };
        g.traverse((c) => {
          c.userData = { type: 'ground_item', itemId: item.id };
        });
        this.scene.add(g);
        this.itemMeshes.set(item.id, g);
      }
    }
  }

  private createDetailedKey(): THREE.Group {
    const root = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.8,
      flatShading: true,
    });
    const brightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Key Ring / Bow (Torus)
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12), goldMat);
    bow.position.y = 0.22;
    bow.rotation.x = Math.PI / 2;
    root.add(bow);

    // Key Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 6), goldMat);
    collar.position.y = 0.15;
    root.add(collar);

    // Key Shaft / Stem
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.2, 6), goldMat);
    shaft.position.y = 0.05;
    root.add(shaft);

    // Key Bit / Teeth
    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.014), goldMat);
    bit1.position.set(0.028, -0.01, 0);
    const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.014), goldMat);
    bit2.position.set(0.02, -0.04, 0);
    root.add(bit1, bit2);

    // Small glowing rune / spark in the center of the ring
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), brightMat);
    gem.position.y = 0.22;
    root.add(gem);

    // Golden point light aura
    const light = new THREE.PointLight(0xfbbf24, 1.2, 2.0, 1.5);
    light.position.y = 0.15;
    root.add(light);

    return root;
  }

  private createDetailedCoinPouch(): THREE.Group {
    const g = new THREE.Group();
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
    const stringMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, flatShading: true });

    // Leather coin pouch base
    const pouchBase = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), leatherMat);
    pouchBase.position.y = 0.05;
    pouchBase.scale.set(1, 0.85, 1);

    // Tied string
    const string = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 8), stringMat);
    string.rotation.x = Math.PI / 2;
    string.position.y = 0.085;

    // Small gold coins spilling/peeking
    const coin1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 6), goldMat);
    coin1.position.set(0.035, 0.02, 0.03);
    coin1.rotation.set(0.2, 0.4, 0.1);

    const coin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 6), goldMat);
    coin2.position.set(-0.03, 0.015, -0.035);
    coin2.rotation.set(-0.1, 0.5, 0.2);

    g.add(pouchBase, string, coin1, coin2);
    return g;
  }

  public spawnWorldItem(item: WorldItem): void {
    if (this.itemMeshes.has(item.id)) return;
    const g = new THREE.Group();
    if (item.kind === 'key') {
      const keyMesh = this.createDetailedKey();
      keyMesh.position.y = 0.18;
      g.add(keyMesh);
    } else if (item.kind === 'two_handed') {
      const greatsword = this.createDetailedTwoHandedSword(0xf8fafc, 0.62);
      greatsword.position.y = 0.14;
      greatsword.rotation.z = 0.35;
      g.add(greatsword);
    } else if (item.kind === 'armor') {
      const armorMesh = this.createDetailedArmorSlotItem(item.armorSlot || 'torso');
      armorMesh.position.y = 0.08;
      g.add(armorMesh);
    } else if (item.kind === 'potion') {
      const potionGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6);
      const potionMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
      const potionMesh = new THREE.Mesh(potionGeo, potionMat);
      potionMesh.position.y = 0.06;
      g.add(potionMesh);
    } else if (item.kind === 'gold') {
      const pouch = this.createDetailedCoinPouch();
      g.add(pouch);
    } else if (item.kind === 'ear') {
      const ear = this.createDetailedTrophyEar();
      ear.position.y = 0.08;
      g.add(ear);
    } else if (item.kind === 'weapon' || item.kind === 'sword') {
      if (item.name && item.name.toLowerCase().includes('лук')) {
        const bowMesh = this.createDetailedGroundBow();
        bowMesh.position.y = 0.08;
        g.add(bowMesh);
      } else {
        const blade = this.createDetailedSword(0xe2e8f0, 0.42);
        blade.position.y = 0.12;
        blade.rotation.z = 0.3;
        g.add(blade);
      }
    } else {
      const blade = this.createDetailedSword(0xe2e8f0, 0.42);
      blade.position.y = 0.12;
      blade.rotation.z = 0.3;
      g.add(blade);
    }
    g.position.set(item.x, 0, item.y);
    g.userData = { type: 'ground_item', itemId: item.id };
    g.traverse((c) => {
      c.userData = { type: 'ground_item', itemId: item.id };
    });
    this.scene.add(g);
    this.itemMeshes.set(item.id, g);
  }

  private createDetailedTwoHandedSword(bladeColor: number, length = 0.65): THREE.Group {
    const g = new THREE.Group();
    const bladeMat = new THREE.MeshLambertMaterial({ color: bladeColor, flatShading: true });
    const fullerMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    const crossMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x27190e, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });

    const bodyLen = length * 0.82;
    const tipLen = length * 0.22;

    // Massive broad blade
    const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.095, bodyLen, 0.02), bladeMat);
    bladeBody.position.y = bodyLen / 2 + 0.05;

    // Deep twin fullers
    const fuller1 = new THREE.Mesh(new THREE.BoxGeometry(0.016, bodyLen * 0.88, 0.024), fullerMat);
    fuller1.position.set(-0.022, bodyLen / 2 + 0.05, 0);
    const fuller2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, bodyLen * 0.88, 0.024), fullerMat);
    fuller2.position.set(0.022, bodyLen / 2 + 0.05, 0);

    // Stepped point tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, tipLen, 4), bladeMat);
    tip.position.y = bodyLen + tipLen / 2 + 0.05;
    tip.rotation.y = Math.PI / 4;

    // Flared Zweihander crossguard with parrying rings
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.05), crossMat);
    guard.position.y = 0.04;

    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 4, 8), crossMat);
    ringL.position.set(-0.08, 0.04, 0);
    ringL.rotation.y = Math.PI / 2;
    const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 4, 8), crossMat);
    ringR.position.set(0.08, 0.04, 0);
    ringR.rotation.y = Math.PI / 2;

    // Long two-handed grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.22, 6), gripMat);
    grip.position.y = -0.08;

    // Heavy faceted steel pommel
    const pommel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.036, 0), goldMat);
    pommel.position.y = -0.21;

    g.add(bladeBody, fuller1, fuller2, tip, guard, ringL, ringR, grip, pommel);
    return g;
  }

  private createDetailedGroundBow(): THREE.Group {
    const root = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x704321, flatShading: true });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xfafaf9 });
    const arrowMat = new THREE.MeshLambertMaterial({ color: 0x7c4f30, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0xa1a1aa, flatShading: true });

    // Curved stave (Torus arc)
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 4, 12, Math.PI), woodMat);
    arc.position.set(0, 0.10, 0);
    arc.rotation.y = Math.PI / 2;

    // String across nocks
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.48, 3), stringMat);
    string.position.set(0, 0.10, 0.02);

    // Arrow lying alongside bow
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.52, 4), arrowMat);
    arrowShaft.position.set(0.06, 0.03, 0);
    arrowShaft.rotation.x = Math.PI / 2;

    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), steelMat);
    arrowTip.position.set(0.06, 0.03, -0.27);
    arrowTip.rotation.x = -Math.PI / 2;

    root.add(arc, string, arrowShaft, arrowTip);
    return root;
  }

  private createDetailedArmorSlotItem(slot: 'head' | 'torso' | 'arms' | 'legs'): THREE.Group {
    const g = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.7, flatShading: true });
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });

    if (slot === 'head') {
      // Helmet (Dodecahedron + visor slit)
      const helm = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), steelMat);
      helm.position.y = 0.09;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.095), brassMat);
      visor.position.set(0, 0.09, 0.04);
      g.add(helm, visor);
    } else if (slot === 'arms') {
      // Gauntlets / Bracers
      const bracer1 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.14, 6), steelMat);
      bracer1.position.set(-0.06, 0.07, 0);
      const bracer2 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.14, 6), steelMat);
      bracer2.position.set(0.06, 0.07, 0);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.06), leatherMat);
      cuff.position.y = 0.04;
      g.add(bracer1, bracer2, cuff);
    } else if (slot === 'legs') {
      // Greaves
      const greave1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.18, 6), steelMat);
      greave1.position.set(-0.05, 0.09, 0);
      const greave2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.18, 6), steelMat);
      greave2.position.set(0.05, 0.09, 0);
      const knee1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), brassMat);
      knee1.position.set(-0.05, 0.17, 0.02);
      const knee2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), brassMat);
      knee2.position.set(0.05, 0.17, 0.02);
      g.add(greave1, greave2, knee1, knee2);
    } else {
      // Torso Cuirass
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.22, 6), steelMat);
      chest.position.y = 0.11;
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.20, 0.14), brassMat);
      crest.position.y = 0.11;
      g.add(chest, crest);
    }
    return g;
  }

  private createFirstPersonTwoHandedSword(): THREE.Group {
    const root = new THREE.Group();
    const sword = this.createDetailedTwoHandedSword(0xf1f5f9, 0.72);
    sword.rotation.set(0, 1.25, 0);
    root.add(sword);

    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x221c18, flatShading: true });

    // Right hand (upper grip)
    const fistR = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.075, 0.062), gloveMat);
    fistR.position.set(0, -0.02, 0);
    const knucklesR = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.068, 0.022), steelMat);
    knucklesR.position.set(0.015, -0.02, 0.03);
    const forearmR = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.26, 0.08), sleeveMat);
    forearmR.position.set(0.06, -0.18, 0.14);
    forearmR.rotation.set(0.55, 0.15, -0.25);

    // Left hand (lower grip near pommel)
    const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.072, 0.06), gloveMat);
    fistL.position.set(0, -0.14, 0);
    const knucklesL = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.065, 0.022), steelMat);
    knucklesL.position.set(-0.015, -0.14, -0.03);
    const forearmL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.26, 0.08), sleeveMat);
    forearmL.position.set(-0.06, -0.28, 0.12);
    forearmL.rotation.set(0.55, -0.15, 0.25);

    root.add(fistR, knucklesR, forearmR, fistL, knucklesL, forearmL);
    return root;
  }

  private createFirstPersonStaff(): THREE.Group {
    const root = new THREE.Group();

    // High quality fantasy materials
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x221812, flatShading: true }); // Charred elderwood
    const warmWoodMat = new THREE.MeshLambertMaterial({ color: 0x3d271a, flatShading: true }); // Polished burl wood
    const antiqueGoldMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true }); // Gilded brass / rune gold
    const darkBronzeMat = new THREE.MeshLambertMaterial({ color: 0x6e4726, flatShading: true }); // Carved bronze mounts
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x422d20, flatShading: true }); // Grip wrap
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // Outer facet crystal
    const innerCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Radiant inner core
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x211738, flatShading: true }); // Deep arcane purple sleeve
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x2b221d, flatShading: true }); // Leather gauntlet

    // 1. Lower shaft: tapered elderwood
    const lowerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.50, 7), darkWoodMat);
    lowerShaft.position.set(0, -0.22, 0);
    root.add(lowerShaft);

    // 2. Pointed bronze butt spike & ferrule
    const buttCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.06, 7), darkBronzeMat);
    buttCap.position.set(0, -0.47, 0);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 6), antiqueGoldMat);
    spike.position.set(0, -0.53, 0);
    spike.rotation.x = Math.PI;
    root.add(buttCap, spike);

    // 3. Grip section (where hand holds): leather spiral cross-binding
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.18, 8), leatherMat);
    grip.position.set(0, -0.02, 0);
    root.add(grip);

    // Leather cross-straps around grip
    const strap1 = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.003, 4, 8), darkBronzeMat);
    strap1.position.set(0, 0.05, 0);
    strap1.rotation.x = Math.PI / 2;
    const strap2 = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.003, 4, 8), darkBronzeMat);
    strap2.position.set(0, -0.09, 0);
    strap2.rotation.x = Math.PI / 2;
    root.add(strap1, strap2);

    // 4. Upper staff body: organic twisted shaft
    const upperShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.44, 7), warmWoodMat);
    upperShaft.position.set(0, 0.22, 0);
    upperShaft.rotation.z = -0.02;
    root.add(upperShaft);

    // Spiral bronze dragon-vine wrapping upward along shaft
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const angle = t * Math.PI * 3.5;
      const vy = 0.04 + t * 0.38;
      const vx = Math.cos(angle) * 0.023;
      const vz = Math.sin(angle) * 0.023;
      const vineNode = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.008), antiqueGoldMat);
      vineNode.position.set(vx, vy, vz);
      vineNode.rotation.y = angle;
      vineNode.rotation.z = 0.35;
      root.add(vineNode);
    }

    // 5. Crown Collar (Runic ring below headpiece)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.05, 8), antiqueGoldMat);
    collar.position.set(0, 0.45, 0);
    root.add(collar);

    // 6. Crown Prongs: 4 curved ornate talons framing the crystal like a mystical chalice
    const prongOffsets = [
      { x: 0.032, z: 0, rx: 0, rz: -0.26 },
      { x: -0.032, z: 0, rx: 0, rz: 0.26 },
      { x: 0, z: 0.032, rx: 0.26, rz: 0 },
      { x: 0, z: -0.032, rx: -0.26, rz: 0 },
    ];
    for (const po of prongOffsets) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), antiqueGoldMat);
      prong.position.set(po.x, 0.54, po.z);
      prong.rotation.set(po.rx, 0, po.rz);

      // Inward claw tip
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.032, 4), darkBronzeMat);
      claw.position.set(po.x * 0.85, 0.62, po.z * 0.85);
      claw.rotation.set(-po.rx * 1.5, 0, -po.rz * 1.5);
      root.add(prong, claw);
    }

    // 7. Floating Runic Halo Ring around the crystal
    const haloGeo = new THREE.TorusGeometry(0.075, 0.006, 5, 12);
    const haloMesh = new THREE.Mesh(haloGeo, antiqueGoldMat);
    haloMesh.position.set(0, 0.57, 0);
    haloMesh.rotation.x = Math.PI / 2.5;
    root.add(haloMesh);
    this.staffHaloRing = haloMesh;

    // 8. Central Dual-Faceted Glowing Crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.052, 0);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 0.57, 0);
    root.add(crystal);
    this.staffCrystal = crystal;

    // Inner glowing core
    const coreGeo = new THREE.IcosahedronGeometry(0.026, 0);
    const innerCore = new THREE.Mesh(coreGeo, innerCoreMat);
    innerCore.position.set(0, 0.57, 0);
    root.add(innerCore);
    this.staffInnerCore = innerCore;

    // 9. Floating satellite shards (hovering orbiting micro-crystals)
    this.staffFloatingShards = [];
    const shardGeo = new THREE.OctahedronGeometry(0.016, 0);
    const shard1 = new THREE.Mesh(shardGeo, crystalMat);
    shard1.position.set(0.058, 0.61, 0.03);
    const shard2 = new THREE.Mesh(shardGeo, crystalMat);
    shard2.position.set(-0.054, 0.60, -0.035);
    root.add(shard1, shard2);
    this.staffFloatingShards.push(shard1, shard2);

    // 10. Magical point light emitted from crystal
    const staffLight = new THREE.PointLight(0x38bdf8, 0.9, 2.8);
    staffLight.position.set(0, 0.57, 0);
    root.add(staffLight);
    this.staffLight = staffLight;

    // 11. Arm, Gauntlet & Sleeve
    // Leather fingerless combat gauntlet
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.076, 0.054), gloveMat);
    palm.position.set(0, -0.02, 0);

    // Metal knuckle guard plate
    const knucklePlate = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.038, 0.016), antiqueGoldMat);
    knucklePlate.position.set(0.01, -0.02, 0.032);
    knucklePlate.rotation.y = 0.2;

    // Robe sleeve extending back
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.26, 0.078), sleeveMat);
    sleeve.position.set(0.045, -0.17, 0.13);
    sleeve.rotation.set(0.52, 0.12, -0.2);

    // Gold embroidered sleeve trim / cuff
    const cuffTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.024, 0.084), antiqueGoldMat);
    cuffTrim.position.set(0.035, -0.065, 0.07);
    cuffTrim.rotation.set(0.52, 0.12, -0.2);

    root.add(palm, knucklePlate, sleeve, cuffTrim);
    return root;
  }

  private createDetailedDagger(colorHex = 0xe2e8f0, scale = 0.3): THREE.Group {
    const root = new THREE.Group();
    root.scale.set(scale, scale, scale);
    const bladeMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.85, flatShading: true });
    const fullerMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const crossMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x291d17, flatShading: true });
    const pommelMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8, flatShading: true });

    const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.016), bladeMat);
    bladeBody.position.y = 0.18;

    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.26, 0.02), fullerMat);
    fuller.position.set(0, 0.18, 0);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.12, 4), bladeMat);
    tip.position.y = 0.40;
    tip.rotation.y = Math.PI / 4;

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.04), crossMat);
    guard.position.y = 0.01;

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.14, 6), gripMat);
    grip.position.y = -0.06;

    const pommel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.025, 0), pommelMat);
    pommel.position.y = -0.14;

    root.add(bladeBody, fuller, tip, guard, grip, pommel);
    return root;
  }

  private createFirstPersonDagger(): THREE.Group {
    const root = new THREE.Group();
    const dagger = this.createDetailedDagger(0xe2e8f0, 0.45);
    dagger.rotation.set(0, 1.2, 0);
    root.add(dagger);

    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x221c18, flatShading: true });

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.076, 0.054), gloveMat);
    fist.position.set(0, -0.02, 0);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.26, 0.072), sleeveMat);
    forearm.position.set(0.04, -0.18, 0.14);
    forearm.rotation.set(0.55, 0.15, -0.25);

    root.add(fist, forearm);
    return root;
  }

  private createFirstPersonSword(): THREE.Group {
    const root = new THREE.Group();
    const sword = this.createDetailedSword(0xe2e8f0, 0.44);
    sword.rotation.set(0, 1.2, 0);
    root.add(sword);

    // Right Arm, Forearm Vambrace & Armored Gauntlet gripping the sword
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true }); // Dark leather gambeson sleeve
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true }); // Steel armor plate
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x221c18, flatShading: true }); // Leather glove

    // Armored gauntlet fist centered at the grip y = -0.03
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.08, 0.058), gloveMat);
    fist.position.set(0, -0.03, 0);

    // Steel knuckle protector plate on back of the hand
    const knuckles = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.07, 0.022), steelMat);
    knuckles.position.set(0.015, -0.03, 0.028);

    // Curled steel finger plates on the front of the grip
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.068, 0.02), steelMat);
    fingers.position.set(-0.012, -0.03, -0.024);

    // Thumb wrapped over
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.038, 0.028), steelMat);
    thumb.position.set(-0.028, -0.018, 0.008);

    // Gauntlet flared wrist cuff
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.045, 0.08), steelMat);
    cuff.position.set(0.02, -0.09, 0.05);
    cuff.rotation.set(0.4, 0.15, -0.2);

    // Forearm extending down and back from wrist to offscreen right
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.28, 0.078), sleeveMat);
    forearm.position.set(0.05, -0.20, 0.15);
    forearm.rotation.set(0.55, 0.15, -0.25);

    // Steel Vambrace plate strapped to the top of the forearm
    const vambrace = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.18, 0.03), steelMat);
    vambrace.position.set(0.055, -0.18, 0.17);
    vambrace.rotation.set(0.55, 0.15, -0.25);

    root.add(fist, knuckles, fingers, thumb, cuff, forearm, vambrace);
    return root;
  }

  private createFirstPersonShield(): THREE.Group {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x34251a, flatShading: true });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x52525b, flatShading: true });
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x292524, flatShading: true });
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.036, 6), woodMat);
    plate.rotation.x = Math.PI / 2;

    // Front boss pointing away from player (-Z)
    const boss = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.035, 6), rimMat);
    boss.rotation.x = -Math.PI / 2;
    boss.position.z = -0.035;

    // Inner handle facing player (+Z)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.028), gripMat);
    handle.position.z = 0.028;

    // Left Arm holding the shield:
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.26, 0.08), sleeveMat);
    forearm.position.set(-0.04, -0.12, 0.16);
    forearm.rotation.set(0.55, -0.2, 0.25);

    const vambrace = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.16, 0.035), steelMat);
    vambrace.position.set(-0.04, -0.11, 0.18);
    vambrace.rotation.set(0.55, -0.2, 0.25);

    // Left gauntlet fist tightly holding the shield handle
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.065), gripMat);
    fist.position.set(0, 0, 0.035);

    const knuckles = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.02), steelMat);
    knuckles.position.set(0, 0, 0.06);

    // Leather arm straps holding the shield to forearm
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.09), gripMat);
    strap1.position.set(-0.03, -0.06, 0.09);
    strap1.rotation.set(0.55, -0.2, 0.25);

    g.add(plate, boss, handle, forearm, vambrace, fist, knuckles, strap1);
    g.position.set(-0.14, -0.14, -0.34);
    g.rotation.set(0, 0.18, 0);
    return g;
  }

  private createFirstPersonMagicOrb(): THREE.Group {
    const g = new THREE.Group();

    // Robe sleeve mat (deep violet)
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x2e1b5c, flatShading: true });
    // Arcane fabric at wrist
    const cuffMat = new THREE.MeshLambertMaterial({ color: 0x1a0f36, flatShading: true });
    // Orb outer shell - semi-dark glass
    const orbOuterMat = new THREE.MeshLambertMaterial({
      color: 0x4c1d95,
      flatShading: true,
      transparent: true,
      opacity: 0.82,
    });
    // Orb inner core - bright cyan glow
    const orbCoreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    // Orb inner energy pulse
    const orbPulseMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    // Brass cradle holding the orb
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });

    // --- Left forearm sleeve ---
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.078), sleeveMat);
    forearm.position.set(-0.03, -0.14, 0.14);
    forearm.rotation.set(0.5, -0.18, 0.22);

    // Wrist cuff band
    const wristCuff = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.04, 0.085), cuffMat);
    wristCuff.position.set(-0.03, -0.025, 0.05);
    wristCuff.rotation.set(0.5, -0.18, 0.22);

    // --- Orb holder: brass cradle with 4 curved prongs ---
    const cradleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.025, 8), brassMat);
    cradleBase.position.set(0, 0, 0);

    // 4 upward prongs gripping the orb from below
    const prong1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.014), brassMat);
    prong1.position.set(0.044, 0.028, 0);
    prong1.rotation.set(0, 0, 0.35);
    const prong2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.014), brassMat);
    prong2.position.set(-0.044, 0.028, 0);
    prong2.rotation.set(0, 0, -0.35);
    const prong3 = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.045, 0.018), brassMat);
    prong3.position.set(0, 0.028, 0.044);
    prong3.rotation.set(-0.35, 0, 0);
    const prong4 = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.045, 0.018), brassMat);
    prong4.position.set(0, 0.028, -0.044);
    prong4.rotation.set(0.35, 0, 0);

    // The palm of the hand as a flat plate beneath the cradle
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.015, 0.058), cuffMat);
    palm.position.set(0, -0.015, 0);

    // Fingers curling up around cradle sides
    const finger1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.038, 0.014), cuffMat);
    finger1.position.set(0.038, 0.012, -0.018);
    finger1.rotation.set(-0.4, 0, 0.3);
    const finger2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.038, 0.014), cuffMat);
    finger2.position.set(0.044, 0.012, 0);
    finger2.rotation.set(0, 0, 0.35);
    const finger3 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.038, 0.014), cuffMat);
    finger3.position.set(0.038, 0.012, 0.018);
    finger3.rotation.set(0.4, 0, 0.3);

    // --- Orb itself: outer shell (icosahedron for a faceted magical look) ---
    const orbOuter = new THREE.Mesh(new THREE.IcosahedronGeometry(0.062, 0), orbOuterMat);
    orbOuter.position.set(0, 0.062, 0);

    // Inner glowing core
    const orbCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), orbCoreMat);
    orbCore.position.set(0, 0.062, 0);

    // Tiny bright spark at center
    const orbPulse = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), orbPulseMat);
    orbPulse.position.set(0, 0.062, 0);

    // Point light emanating from orb
    const orbLight = new THREE.PointLight(0x38bdf8, 0.9, 1.4, 1.8);
    orbLight.position.set(0, 0.062, 0);

    g.add(
      forearm, wristCuff,
      cradleBase, prong1, prong2, prong3, prong4,
      palm, finger1, finger2, finger3,
      orbOuter, orbCore, orbPulse, orbLight
    );

    // Position: bottom-left of view, slightly forward
    g.position.set(-0.14, -0.16, -0.34);
    g.rotation.set(0.1, 0.22, 0);
    return g;
  }

  private createFirstPersonBow(): THREE.Group {
    const root = new THREE.Group();
    // Keep the bow at a believable first-person scale; the old mesh filled most of the view.
    root.scale.setScalar(0.62);

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x54321d, flatShading: true });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x2b1c14, flatShading: true });
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xded8cc, flatShading: true });
    const leatherGripMat = new THREE.MeshLambertMaterial({ color: 0x291d17, flatShading: true });
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xd4af37, flatShading: true });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xfafaf9 });
    const arrowWoodMat = new THREE.MeshLambertMaterial({ color: 0x7c4f30, flatShading: true });
    const arrowSteelMat = new THREE.MeshLambertMaterial({ color: 0xa1a1aa, flatShading: true });
    const fletchMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
    const archerLeatherMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });

    // 1. Central Riser & Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.046), leatherGripMat);
    grip.position.set(0, 0, 0);

    const brassBandTop = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.016, 0.048), brassMat);
    brassBandTop.position.set(0, 0.065, 0);
    const brassBandBottom = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.016, 0.048), brassMat);
    brassBandBottom.position.set(0, -0.065, 0);

    // Arrow pass shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.036), boneMat);
    shelf.position.set(-0.024, 0.02, 0);
    root.add(grip, brassBandTop, brassBandBottom, shelf);

    // 2. Upper Recurve Limb
    const upperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(0.008, 0.18, -0.012),
      new THREE.Vector3(-0.018, 0.30, -0.035), new THREE.Vector3(-0.045, 0.41, -0.025),
      new THREE.Vector3(-0.05, 0.48, 0.005),
    ]);
    const uSeg1 = new THREE.Mesh(new THREE.TubeGeometry(upperCurve, 8, 0.018, 5, false), woodMat);

    const uNock = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.035, 5), hornMat);
    uNock.position.set(-0.05, 0.48, 0.005);
    uNock.rotation.set(-0.25, 0, -0.1);

    root.add(uSeg1, uNock);

    // 3. Lower Recurve Limb
    const lowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(0.008, -0.18, -0.012),
      new THREE.Vector3(-0.018, -0.30, -0.035), new THREE.Vector3(-0.045, -0.41, -0.025),
      new THREE.Vector3(-0.05, -0.48, 0.005),
    ]);
    const lSeg1 = new THREE.Mesh(new THREE.TubeGeometry(lowerCurve, 8, 0.018, 5, false), woodMat);

    const lNock = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.035, 5), hornMat);
    lNock.position.set(-0.05, -0.48, 0.005);
    lNock.rotation.set(Math.PI + 0.25, 0, 0.1);

    root.add(lSeg1, lNock);

    // 4. Bowstring
    const stringUpperGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.50, 4);
    const stringUpper = new THREE.Mesh(stringUpperGeo, stringMat);
    stringUpper.position.set(-0.05, 0.24, 0.04);
    root.add(stringUpper);
    this.bowStringUpper = stringUpper;

    const stringLowerGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.50, 4);
    const stringLower = new THREE.Mesh(stringLowerGeo, stringMat);
    stringLower.position.set(-0.05, -0.24, 0.04);
    root.add(stringLower);
    this.bowStringLower = stringLower;

    // 5. Nocked Arrow
    const arrowRoot = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.64, 5), arrowWoodMat);
    shaft.rotation.x = Math.PI / 2;
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.055, 4), arrowSteelMat);
    point.rotation.x = -Math.PI / 2;
    point.position.z = -0.34;
    for (let f = 0; f < 3; f++) {
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.026, 0.085), fletchMat);
      fletch.position.set(0, 0, 0.25);
      fletch.rotation.z = (f * Math.PI * 2) / 3;
      arrowRoot.add(fletch);
    }
    const nock = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 5), boneMat);
    nock.rotation.x = Math.PI / 2;
    nock.position.z = 0.32;
    arrowRoot.add(shaft, point, nock);
    arrowRoot.position.set(-0.02, 0.02, 0);
    root.add(arrowRoot);
    this.bowArrowMesh = arrowRoot;

    // 6. Archer's Left Hand & Forearm
    const leftArmGroup = new THREE.Group();
    const leftFist = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.082, 0.054), archerLeatherMat);
    leftFist.position.set(0.008, 0, 0.006);
    const leftFingers = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.074, 0.022), archerLeatherMat);
    leftFingers.position.set(-0.016, 0, -0.022);
    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.26, 0.072), archerLeatherMat);
    leftForearm.position.set(0.08, -0.16, 0.12);
    leftForearm.rotation.set(0.55, -0.15, 0.25);
    const bracer = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.17, 0.022), brassMat);
    bracer.position.set(0.068, -0.15, 0.13);
    bracer.rotation.set(0.55, -0.15, 0.25);
    leftArmGroup.add(leftFist, leftFingers, leftForearm, bracer);
    root.add(leftArmGroup);

    // 7. Archer's Right Hand
    const rightHandGroup = new THREE.Group();
    const tabFingers = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.062, 0.036), archerLeatherMat);
    tabFingers.position.set(-0.015, 0.02, 0.33);
    const rightPalm = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.065, 0.040), archerLeatherMat);
    rightPalm.position.set(0.02, 0.015, 0.36);
    rightHandGroup.add(tabFingers, rightPalm);
    root.add(rightHandGroup);

    return root;
  }

  public createInventoryPreviewModel(iconType: string): THREE.Group {
    const bowRefs = [this.bowArrowMesh, this.bowStringUpper, this.bowStringLower] as const;
    let model: THREE.Group;
    switch (iconType) {
      case 'bow': model = this.createFirstPersonBow(); break;
      case 'two_handed': model = this.createFirstPersonTwoHandedSword(); break;
      case 'staff': model = this.createFirstPersonStaff(); break;
      case 'shield': model = this.createFirstPersonShield(); break;
      case 'orb': model = this.createFirstPersonMagicOrb(); break;
      case 'sword':
      case 'steel_sword': model = this.createFirstPersonSword(); break;
      default: model = this.createFirstPersonSword();
    }
    [this.bowArrowMesh, this.bowStringUpper, this.bowStringLower] = bowRefs;
    return model;
  }

  public setEquippedItems(
    mainHand: { name?: string; iconType?: string; type?: string } | null,
    offHand: { name?: string; iconType?: string; type?: string } | null
  ) {
    // 1. Right Hand / Weapon
    while (this.swordPivot.children.length) {
      this.swordPivot.remove(this.swordPivot.children[0]);
    }

    if (!mainHand || mainHand.name === 'Кулаки') {
      this.rightHandType = null;
      this.swordPivot.visible = false;
    } else {
      const isBow =
        mainHand.iconType === 'bow' ||
        (mainHand.name && mainHand.name.toLowerCase().includes('лук'));
      const isTwoHanded =
        (mainHand as any).twoHanded ||
        mainHand.iconType === 'two_handed' ||
        (mainHand.name && (mainHand.name.toLowerCase().includes('двуруч') || mainHand.name.toLowerCase().includes('цвайхендер')));
      const isStaff =
        mainHand.iconType === 'staff' ||
        (mainHand.name && mainHand.name.toLowerCase().includes('посох'));
      const isDagger =
        mainHand.iconType === 'dagger' ||
        (mainHand.name && (mainHand.name.toLowerCase().includes('кинжал') || mainHand.name.toLowerCase().includes('нож')));

      if (isBow) {
        this.rightHandType = 'bow';
        const bow = this.createFirstPersonBow();
        this.swordPivot.add(bow);
        this.swordPivot.position.set(0.34, -0.30, -0.50);
      } else if (isTwoHanded) {
        this.rightHandType = 'two_handed';
        const bigSword = this.createFirstPersonTwoHandedSword();
        this.swordPivot.add(bigSword);
        this.swordPivot.position.set(0.16, -0.22, -0.36);
      } else if (isStaff) {
        this.rightHandType = 'staff';
        const staff = this.createFirstPersonStaff();
        this.swordPivot.add(staff);
        this.swordPivot.position.set(0.18, -0.24, -0.38);
      } else if (isDagger) {
        this.rightHandType = 'dagger';
        const dagger = this.createFirstPersonDagger();
        this.swordPivot.add(dagger);
        this.swordPivot.position.set(0.22, -0.20, -0.36);
      } else {
        this.rightHandType = 'sword';
        const sword = this.createFirstPersonSword();
        this.swordPivot.add(sword);
        this.swordPivot.position.set(0.24, -0.22, -0.38);
      }
    }

    // 2. Left Hand
    while (this.leftWeaponPivot.children.length) {
      this.leftWeaponPivot.remove(this.leftWeaponPivot.children[0]);
    }

    if (!offHand) {
      this.leftHandType = null;
      this.leftWeaponPivot.visible = false;
    } else if (offHand.iconType === 'orb' || offHand.type === 'focus') {
      this.leftHandType = 'orb';
      this.leftWeaponPivot.visible = false;
    } else if (offHand.iconType === 'shield' || offHand.type === 'shield') {
      this.leftHandType = 'shield';
      this.leftWeaponPivot.visible = false;
    } else if (
      offHand.iconType === 'staff' ||
      (offHand.name && offHand.name.toLowerCase().includes('посох'))
    ) {
      this.leftHandType = 'staff';
      const staff = this.createFirstPersonStaff();
      // Mirror along X axis so left arm holds it
      staff.scale.set(-1, 1, 1);
      this.leftWeaponPivot.add(staff);
      this.leftWeaponPivot.position.set(-0.18, -0.24, -0.38);
      this.leftWeaponPivot.visible = true;
    } else if (
      offHand.iconType === 'sword' ||
      offHand.iconType === 'steel_sword' ||
      offHand.type === 'weapon'
    ) {
      this.leftHandType = 'sword';
      const sword = this.createFirstPersonSword();
      sword.scale.set(-1, 1, 1);
      this.leftWeaponPivot.add(sword);
      this.leftWeaponPivot.position.set(-0.24, -0.22, -0.38);
      this.leftWeaponPivot.visible = true;
    } else {
      this.leftHandType = null;
      this.leftWeaponPivot.visible = false;
    }

    this.magicOrbMesh.visible = this.leftHandType === 'orb';
    this.shieldMesh.visible = false;
  }

  public setEquippedWeapon(weaponName: string, hasMagic = false) {
    const isStaff = weaponName.toLowerCase().includes('посох');
    const isBow = weaponName.toLowerCase().includes('лук');
    this.setEquippedItems(
      weaponName === 'Кулаки'
        ? null
        : { name: weaponName, iconType: isBow ? 'bow' : isStaff ? 'staff' : 'sword' },
      isBow ? null : hasMagic ? { iconType: 'orb', type: 'focus' } : { iconType: 'shield', type: 'shield' }
    );
  }

  public setStaffCharging(charging: boolean) {
    this.isStaffCharging = charging;
    if (!charging && this.staffLight) {
      this.staffLight.intensity = 0.8;
    }
    if (!charging && this.staffCrystal) {
      this.staffCrystal.scale.set(1, 1, 1);
    }
  }

  public setStaffElementColor(hexColor: string) {
    const col = new THREE.Color(hexColor);
    if (this.staffCrystal) {
      (this.staffCrystal.material as THREE.MeshBasicMaterial).color.copy(col);
    }
    if (this.staffInnerCore) {
      (this.staffInnerCore.material as THREE.MeshBasicMaterial).color.copy(col).lerp(new THREE.Color(0xffffff), 0.5);
    }
    for (const sh of this.staffFloatingShards) {
      (sh.material as THREE.MeshBasicMaterial).color.copy(col);
    }
    if (this.staffLight) {
      this.staffLight.color.copy(col);
    }
  }

  public setOrbElementColor(hexColor: string) {
    const col = new THREE.Color(hexColor);
    if (this.magicOrbMesh) {
      // children order in magicOrbMesh: 11=orbOuter, 12=orbCore, 13=orbPulse, 14=orbLight
      const orbOuter = this.magicOrbMesh.children[11] as THREE.Mesh | undefined;
      const orbCore = this.magicOrbMesh.children[12] as THREE.Mesh | undefined;
      const orbPulse = this.magicOrbMesh.children[13] as THREE.Mesh | undefined;
      const orbLight = this.magicOrbMesh.children[14] as THREE.PointLight | undefined;
      if (orbOuter && orbOuter.material) (orbOuter.material as THREE.MeshBasicMaterial).color.copy(col);
      if (orbCore && orbCore.material) (orbCore.material as THREE.MeshBasicMaterial).color.copy(col);
      if (orbPulse && orbPulse.material) (orbPulse.material as THREE.MeshBasicMaterial).color.copy(col);
      if (orbLight) orbLight.color.copy(col);
    }
  }

  public triggerStaffCastAnimation() {
    this.staffCastRecoilTimer = 0.22;
    if (this.staffLight) {
      this.staffLight.intensity = 2.8;
    }
  }

  private createFirstPersonMap(): THREE.Group {
    const g = new THREE.Group();
    const paperMat = new THREE.MeshBasicMaterial({ map: this.mapTexture });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21, flatShading: true });
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x221c18, flatShading: true });

    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.28), paperMat);
    const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), woodMat);
    topRoll.rotation.z = Math.PI / 2;
    topRoll.position.y = 0.145;

    const botRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), woodMat);
    botRoll.rotation.z = Math.PI / 2;
    botRoll.position.y = -0.145;

    // Left Arm & Hand holding the left wooden roller of the map
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.22, 0.07), sleeveMat);
    leftArm.position.set(-0.21, -0.16, 0.12);
    leftArm.rotation.set(0.5, 0.15, -0.2);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.05), gloveMat);
    leftHand.position.set(-0.185, -0.04, 0.02);

    const leftThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.02), steelMat);
    leftThumb.position.set(-0.165, -0.02, -0.015);

    // Right Arm & Hand holding the right wooden roller of the map
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.22, 0.07), sleeveMat);
    rightArm.position.set(0.21, -0.16, 0.12);
    rightArm.rotation.set(0.5, -0.15, 0.2);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.05), gloveMat);
    rightHand.position.set(0.185, -0.04, 0.02);

    const rightThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.045, 0.02), steelMat);
    rightThumb.position.set(0.165, -0.02, -0.015);

    g.add(sheet, topRoll, botRoll, leftArm, leftHand, leftThumb, rightArm, rightHand, rightThumb);
    g.position.set(0, -0.05, -0.32);
    g.rotation.set(-0.22, 0, 0);
    return g;
  }

  public updateMapTexture(
    map: number[][],
    explored: boolean[][],
    playerX: number,
    playerY: number,
    playerAngle: number
  ) {
    const ctx = this.mapCanvas.getContext('2d');
    if (!ctx) return;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;
    ctx.fillStyle = '#d6c39c';
    ctx.fillRect(0, 0, w, h);

    // Parchment border
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    const cellSize = Math.floor(Math.min((w - 12) / map[0].length, (h - 12) / map.length));
    const offsetX = Math.floor((w - map[0].length * cellSize) / 2);
    const offsetY = Math.floor((h - map.length * cellSize) / 2);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0].length; x++) {
        if (!explored[y]?.[x]) continue;
        const tile = map[y][x];
        if (tile === 0) {
          ctx.fillStyle = '#bfa87a';
        } else if (tile === 5) {
          ctx.fillStyle = '#0284c7';
        } else if (tile === 4) {
          ctx.fillStyle = '#64748b';
        } else {
          ctx.fillStyle = '#3b2818';
        }
        ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
      }
    }

    const px = offsetX + playerX * cellSize;
    const py = offsetY + playerY * cellSize;
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(playerAngle) * 7, py + Math.sin(playerAngle) * 7);
    ctx.stroke();

    this.mapTexture.needsUpdate = true;
  }

  public triggerParrySparks() {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const origin = this.camera.position.clone().addScaledVector(forward, 0.42);
    origin.y -= 0.04;

    // Pure realistic metallic friction sparks (no blue glitter/magic sparkles)
    const sparkGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const colors = [0xffffff, 0xfef08a, 0xfacc15, 0xf59e0b, 0xd97706];

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 4.2,
        vy: (Math.random() - 0.1) * 3.6,
        vz: (Math.random() - 0.5) * 4.2,
        life: 0.32 + Math.random() * 0.25,
      });
    }
  }

  public triggerPowerHitSparks(worldX: number, worldZ: number) {
    const origin = new THREE.Vector3(worldX, 0.46, worldZ);
    const sparkGeo = new THREE.BoxGeometry(0.038, 0.038, 0.038);
    const colors = [0xf97316, 0xef4444, 0xfbbf24, 0xffffff, 0xd97706];

    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 3.6,
        vy: 0.6 + Math.random() * 3.2,
        vz: (Math.random() - 0.5) * 3.6,
        life: 0.35 + Math.random() * 0.25,
      });
    }
  }

  public triggerHitSparks(worldX: number, worldZ: number, blocked: boolean) {
    const origin = new THREE.Vector3(worldX, 0.46, worldZ);
    const sparkGeo = new THREE.BoxGeometry(0.028, 0.028, 0.028);
    const colors = blocked
      ? [0xfef08a, 0xfacc15, 0xffffff]
      : [0xdc2626, 0xef4444, 0xf97316, 0x991b1b];

    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 2.8,
        vy: 0.4 + Math.random() * 2.0,
        vz: (Math.random() - 0.5) * 2.8,
        life: 0.22 + Math.random() * 0.16,
      });
    }
  }

  public triggerChestSparks(worldX: number, worldZ: number) {
    const origin = new THREE.Vector3(worldX, 0.25, worldZ);
    const sparkGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
    const colors = [0xfef08a, 0xfacc15, 0xeab308, 0xffffff];

    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 1.8,
        vy: 1.2 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 1.8,
        life: 0.35 + Math.random() * 0.25,
      });
    }
  }

  public triggerPotionPickupSparks(worldX: number, worldZ: number) {
    const origin = new THREE.Vector3(worldX, 0.28, worldZ);
    const sparkGeo = new THREE.BoxGeometry(0.024, 0.024, 0.024);
    const colors = [0xef4444, 0xf43f5e, 0xfb7185, 0xffffff];

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.0 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 1.5,
        life: 0.32 + Math.random() * 0.22,
      });
    }
  }

  public triggerHealFlash() {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const origin = this.camera.position.clone().addScaledVector(forward, 0.38);
    origin.y -= 0.08;

    const sparkGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const colors = [0x22c55e, 0x4ade80, 0x86efac, 0xffffff];

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.4 + Math.random() * 1.4,
        vz: (Math.random() - 0.5) * 1.2,
        life: 0.3 + Math.random() * 0.2,
      });
    }
  }

  public spawnMagicProjectile(
    spellId: string,
    colorHex: string,
    size: number,
    speed: number,
    damage: number,
    element: string,
    onHit?: (e: Enemy, dmg: number) => void
  ) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const spawnPos = this.camera.position.clone().addScaledVector(forward, 0.35);
    spawnPos.y -= 0.08;

    const geo = new THREE.SphereGeometry(size, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const light = new THREE.PointLight(new THREE.Color(colorHex), 1.6, 3.5);
    light.position.copy(spawnPos);
    this.scene.add(light);

    this.magicProjectiles.push({
      mesh,
      light,
      dir: forward.normalize(),
      speed,
      life: 2.5,
      damage,
      element,
      spellId,
      onHit,
    });
  }

  public spawnArrow(
    spawnPos: THREE.Vector3,
    velocity: THREE.Vector3,
    gravityScale: number,
    damage: number,
    penetration: number,
    isCrit: boolean,
    onHitEnemy?: (e: Enemy, dmg: number) => void
  ) {
    const arrowGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.56, 5),
      new THREE.MeshLambertMaterial({ color: 0x785338, flatShading: true })
    );
    shaft.rotation.x = Math.PI / 2;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.055, 4),
      new THREE.MeshLambertMaterial({ color: isCrit ? 0xfef08a : 0x94a3b8, flatShading: true })
    );
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.28;

    const fletchMat = new THREE.MeshLambertMaterial({
      color: isCrit ? 0xf59e0b : 0x1e293b,
      flatShading: true,
    });
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.024, 0.075), fletchMat);
      fletch.position.set(0, 0, 0.22);
      fletch.rotation.z = (i * Math.PI * 2) / 3;
      arrowGroup.add(fletch);
    }
    arrowGroup.add(shaft, head);
    arrowGroup.position.copy(spawnPos);
    arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), velocity.clone().normalize());
    this.scene.add(arrowGroup);

    let light: THREE.PointLight | undefined;
    if (isCrit) {
      light = new THREE.PointLight(0xf59e0b, 1.4, 2.8);
      light.position.copy(spawnPos);
      this.scene.add(light);
    }

    this.arrows.push({
      mesh: arrowGroup,
      light,
      v: velocity,
      gravityScale,
      life: 10.0,
      maxDistance: 300.0,
      traveled: 0,
      damage,
      penetration,
      isCrit,
      onHit: onHitEnemy,
    });

    this.bowReleaseTwang = 0.25;
  }

  public triggerMishapExplosion() {
    const origin = this.camera.position.clone();
    origin.y -= 0.1;

    const sparkGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    const colors = [0xef4444, 0x9333ea, 0x000000, 0xfacc15];

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.sparks.push({
        mesh,
        vx: (Math.random() - 0.5) * 2.8,
        vy: (Math.random() - 0.5) * 2.4,
        vz: (Math.random() - 0.5) * 2.8,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  public getEnemyUnderAim(enemies: Enemy[]): EnemyAimResult | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = 4.0;

    const candidates: THREE.Object3D[] = [];
    const enemyById = new Map<number, Enemy>();

    for (const e of enemies) {
      if (!e.alive) continue;
      const rig = this.enemyRigs.get(e.id);
      if (!rig) continue;
      candidates.push(rig.group);
      enemyById.set(e.id, e);
    }

    if (candidates.length === 0) return null;

    const intersects = this.raycaster.intersectObjects(candidates, true);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    let curr: THREE.Object3D | null = hit.object;
    let hitZone: HitZone = 'torso';
    let isJoint = false;

    // Check hit object for user data tags
    if (curr.userData && curr.userData.hitZone) {
      hitZone = curr.userData.hitZone;
      if (hitZone === 'joint') isJoint = true;
    }

    // Identify which enemy was hit
    let foundEnemyId: number | null = null;
    let scan: THREE.Object3D | null = curr;
    while (scan) {
      for (const [id, rig] of this.enemyRigs.entries()) {
        if (rig.group === scan) {
          foundEnemyId = id;
          break;
        }
      }
      if (foundEnemyId !== null) break;
      scan = scan.parent;
    }

    if (foundEnemyId === null) return null;

    // Height-based fallback check if specific mesh lacked tag
    if (hitZone === 'torso') {
      const localY = hit.point.y;
      if (localY >= 0.70) hitZone = 'head';
      else if (localY <= 0.28) hitZone = 'legs';
    }

    return {
      enemyId: foundEnemyId,
      zone: hitZone,
      isJoint,
      distance: hit.distance,
    };
  }

  public getAimPoint(enemies: Enemy[], maxDist = 500): THREE.Vector3 {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = maxDist;

    const candidates: THREE.Object3D[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const rig = this.enemyRigs.get(e.id);
      if (rig) candidates.push(rig.group);
    }
    if (this.doorMesh) candidates.push(this.doorMesh);
    if (this.stuckWallMob) candidates.push(this.stuckWallMob);
    for (const s of this.signpostMeshes) candidates.push(s);
    if (this.noticeBoardMesh) candidates.push(this.noticeBoardMesh);
    for (const fw of this.forestWallGroups) candidates.push(fw);

    // Also include top-level meshes in scene that are walls/props (excluding player camera/weapons)
    for (const child of this.scene.children) {
      if (child === this.camera || child === this.ambientLight || child === this.torchLight) continue;
      if (child.type === 'Mesh' || child.type === 'Group') {
        candidates.push(child);
      }
    }

    const intersects = this.raycaster.intersectObjects(candidates, true);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return this.camera.position.clone().addScaledVector(forward, maxDist);
  }

  public getInteractionTarget(items: WorldItem[], isDoorUnlocked = true): InteractionTarget | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = 2.4;

    const candidates: THREE.Object3D[] = [];
    if (this.doorMesh) {
      candidates.push(this.doorMesh);
    }
    if (this.stuckWallMob) {
      candidates.push(this.stuckWallMob);
    }
    for (const s of this.signpostMeshes) {
      candidates.push(s);
    }
    if (this.noticeBoardMesh) {
      candidates.push(this.noticeBoardMesh);
    }
    const itemMap = new Map<number, WorldItem>();
    for (const it of items) {
      if (it.collected) continue;
      itemMap.set(it.id, it);
      if (it.kind === 'chest') {
        const rig = this.chestRigs.get(it.id);
        if (!rig) continue;
        if (!it.opened) {
          candidates.push(rig.base);
          candidates.push(rig.lidPivot);
        } else {
          if (it.hasPotion) {
            candidates.push(rig.potionGroup);
          }
          if (it.hasGold) {
            candidates.push(rig.coinsGroup);
          }
          candidates.push(rig.base);
        }
      } else {
        const mesh = this.itemMeshes.get(it.id);
        if (mesh) candidates.push(mesh);
      }
    }

    if (candidates.length === 0) return null;

    const intersects = this.raycaster.intersectObjects(candidates, true);
    if (intersects.length === 0) return null;

    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      let targetType: string | null = null;
      let itemId: number | null = null;

      while (curr) {
        if (curr.userData && curr.userData.type) {
          targetType = curr.userData.type;
          itemId = curr.userData.itemId;
          break;
        }
        curr = curr.parent;
      }

      if (targetType === 'door') {
        const doorLabel = this.isLocationForest
          ? 'Войти в Склеп Пепла [E]'
          : isDoorUnlocked
          ? 'Выйти из Склепа в Лес [E]'
          : 'Врата Склепа (Заперто) [E]';
        return {
          type: 'door',
          itemId: 9999,
          label: doorLabel,
        };
      }

      if (targetType === 'stuck_mob') {
        return {
          type: 'stuck_mob',
          itemId: 8888,
          label: 'Замурованный узник [E]',
        };
      }

      if (targetType === 'signpost') {
        return {
          type: 'signpost',
          itemId: 7777,
          label: 'Осмотреть указатель [E]',
        };
      }

      if (targetType === 'notice_board') {
        return {
          type: 'notice_board',
          itemId: 8888,
          label: 'Доска объявлений деревни [E]',
        };
      }

      if (targetType === 'npc') {
        const id = itemId ?? 0;
        const npcItem = itemMap.get(id);
        return {
          type: 'npc',
          itemId: id,
          label: npcItem ? `${npcItem.name} [${npcItem.npcRole || 'Житель'}] [E]` : 'Поговорить [E]',
          item: npcItem,
        };
      }

      if (!targetType || itemId === null) continue;
      const item = itemMap.get(itemId);
      if (!item) continue;

      if (targetType === 'chest') {
        if (!item.opened) {
          return {
            type: 'chest',
            itemId,
            label: 'Открыть сундук',
            item,
          };
        } else {
          // Open chest hit on base: pick which item remains
          if (item.hasPotion && !item.hasGold) {
            return {
              type: 'chest_potion',
              itemId,
              label: 'Забрать зелье здоровья',
              item,
            };
          }
          if (!item.hasPotion && item.hasGold) {
            return {
              type: 'chest_gold',
              itemId,
              label: `Забрать золото (+${item.goldAmount || 45})`,
              item,
            };
          }
          if (item.hasPotion && item.hasGold) {
            const rig = this.chestRigs.get(itemId);
            if (rig) {
              const localHit = rig.group.worldToLocal(hit.point.clone());
              if (localHit.x < 0) {
                return {
                  type: 'chest_potion',
                  itemId,
                  label: 'Забрать зелье здоровья',
                  item,
                };
              } else {
                return {
                  type: 'chest_gold',
                  itemId,
                  label: `Забрать золото (+${item.goldAmount || 45})`,
                  item,
                };
              }
            }
          }
          return null;
        }
      }

      if (targetType === 'chest_potion') {
        if (item.hasPotion) {
          return {
            type: 'chest_potion',
            itemId,
            label: 'Забрать зелье здоровья',
            item,
          };
        }
        continue;
      }

      if (targetType === 'chest_gold') {
        if (item.hasGold) {
          return {
            type: 'chest_gold',
            itemId,
            label: `Забрать золото (+${item.goldAmount || 45})`,
            item,
          };
        }
        continue;
      }

      if (targetType === 'ground_item') {
        const verb = item.kind === 'flower' ? 'Сорвать' : item.kind === 'ore' ? 'Забрать' : 'Подобрать';
        return {
          type: 'ground_item',
          itemId,
          label: `${verb}: ${item.name} [E]`,
          item,
        };
      }
    }

    return null;
  }

  public render(
    playerX: number,
    playerY: number,
    playerAngle: number,
    playerPitch: number,
    enemies: Enemy[],
    items: WorldItem[],
    swingTimer: number,
    isBlocking: boolean,
    time: number,
    cameraShake = 0,
    isMapOpen = false,
    offHandSwingTimer = 0,
    powerSwingTimer = 0,
    parryAttemptTimer = 0,
    offHandPowerSwingTimer = 0,
    isRightCharging = false,
    isLeftCharging = false,
    bowDraw = 0
  ) {
    const dt = this.lastRenderTime > 0 ? Math.min(0.05, Math.max(0, time - this.lastRenderTime)) : 1 / 60;
    this.lastRenderTime = time;
    // Animate Door Hinge Opening
    if (this.doorHinge) {
      this.doorHinge.rotation.y = THREE.MathUtils.lerp(
        this.doorHinge.rotation.y,
        this.doorTargetAngle,
        0.06
      );
    }

    // Update 3D Parry Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= 0.016;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      } else {
        s.vy -= 5.5 * 0.016;
        s.mesh.position.x += s.vx * 0.016;
        s.mesh.position.y += s.vy * 0.016;
        s.mesh.position.z += s.vz * 0.016;
        const sc = Math.max(0.2, s.life * 3.5);
        s.mesh.scale.set(sc, sc, sc);
      }
    }

    // Update 3D Magic Projectiles (Flight & Enemy Collisions)
    for (let i = this.magicProjectiles.length - 1; i >= 0; i--) {
      const p = this.magicProjectiles[i];
      p.life -= 0.016;
      p.mesh.position.addScaledVector(p.dir, p.speed * 0.016);
      if (p.light) {
        p.light.position.copy(p.mesh.position);
      }

      // Check collision with alive enemies
      let hitEnemy: Enemy | null = null;
      for (const e of enemies) {
        if (!e.alive) continue;
        const distSq =
          (p.mesh.position.x - e.x) * (p.mesh.position.x - e.x) +
          (p.mesh.position.z - e.y) * (p.mesh.position.z - e.y);
        if (distSq < 0.65 * 0.65) {
          hitEnemy = e;
          break;
        }
      }

      if (hitEnemy) {
        // Deal damage
        const damageDealt = Math.max(1, p.damage - Math.floor(hitEnemy.armor * 0.3));
        hitEnemy.hp -= damageDealt;
        hitEnemy.hurtTimer = 0.3;
        hitEnemy.stagger = Math.min(100, hitEnemy.stagger + (p.element === 'frost' ? 30 : 20));
        if (p.element === 'frost') {
          hitEnemy.speed = Math.max(0.3, hitEnemy.speed * 0.6);
        }
        if (hitEnemy.hp <= 0) {
          hitEnemy.alive = false;
        }
        if (p.onHit) p.onHit(hitEnemy, damageDealt);
        this.triggerHitSparks(p.mesh.position.x, p.mesh.position.z, true);
        p.life = 0; // Destroy projectile
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        if (p.light) {
          this.scene.remove(p.light);
        }
        this.magicProjectiles.splice(i, 1);
      }
    }

    // Update 3D Flying Arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      a.v.y -= 9.81 * a.gravityScale * dt;
      const step = a.v.clone().multiplyScalar(dt);
      const stepDist = step.length();
      a.traveled += stepDist;

      a.mesh.position.add(step);
      a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), a.v.clone().normalize());
      if (a.light) {
        a.light.position.copy(a.mesh.position);
      }

      if (a.life <= 0 || a.traveled >= a.maxDistance) {
        this.scene.remove(a.mesh);
        if (a.light) this.scene.remove(a.light);
        this.arrows.splice(i, 1);
        continue;
      }

      // Check collision with alive enemies
      let hitEnemy: Enemy | null = null;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = a.mesh.position.x - e.x;
        const dz = a.mesh.position.z - e.y;
        if (dx * dx + dz * dz < 0.65 * 0.65) {
          hitEnemy = e;
          break;
        }
      }

      if (hitEnemy) {
        const effArmor = Math.max(0, hitEnemy.armor * (1 - a.penetration / 100));
        const damageDealt = Math.max(1, Math.floor(a.damage - effArmor * 0.35));
        hitEnemy.hp -= damageDealt;
        hitEnemy.hurtTimer = 0.35;
        hitEnemy.stagger = Math.min(100, hitEnemy.stagger + (a.isCrit ? 45 : 25));
        if (hitEnemy.hp <= 0) {
          hitEnemy.alive = false;
        }
        if (a.onHit) a.onHit(hitEnemy, damageDealt);
        this.triggerHitSparks(a.mesh.position.x, a.mesh.position.z, true);
        this.scene.remove(a.mesh);
        if (a.light) this.scene.remove(a.light);
        this.arrows.splice(i, 1);
      } else if (this.mapGrid && this.mapGrid.length > 0) {
        const mx = Math.floor(a.mesh.position.x);
        const my = Math.floor(a.mesh.position.z);
        if (my >= 0 && my < this.mapGrid.length && mx >= 0 && mx < this.mapGrid[0].length) {
          const tile = this.mapGrid[my][mx];
          if (tile === 1 || tile === 8) {
            this.triggerHitSparks(a.mesh.position.x, a.mesh.position.z, false);
            this.scene.remove(a.mesh);
            if (a.light) this.scene.remove(a.light);
            this.arrows.splice(i, 1);
          }
        }
      }
    }
    const shakeX = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake * 0.06 : 0;
    const shakeY = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake * 0.06 : 0;
    this.camera.position.set(playerX + shakeX, 0.52 + shakeY, playerY);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = -playerAngle - Math.PI / 2;
    this.camera.rotation.x = playerPitch + (cameraShake > 0 ? (Math.random() - 0.5) * cameraShake * 0.04 : 0);

    // Track movement for weapon bobbing
    const dx = playerX - this.lastPlayerX;
    const dy = playerY - this.lastPlayerY;
    const distMoved = Math.sqrt(dx * dx + dy * dy);
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
    if (distMoved > 0.0005) {
      this.walkCycle += Math.min(0.35, distMoved * 12.0);
    }

    this.torchLight.position.set(playerX, 0.65, playerY);
    this.torchLight.intensity = 2.4 + Math.sin(time * 12) * 0.15;

    if (this.portalCrystal) {
      this.portalCrystal.rotation.y = time * 1.8;
      this.portalCrystal.rotation.x = time * 1.1;
    }

    for (const e of enemies) {
      const rig = this.enemyRigs.get(e.id);
      if (!rig) continue;
      rig.group.visible = e.alive;
      if (!e.alive) continue;

      rig.group.position.set(e.x, 0, e.y);
      rig.group.lookAt(playerX, 0, playerY);

      const armY = e.kind === 'rat' ? 0.14 : 0.56;

      if (e.parryStaggerTimer > 0) {
        // Micro-stagger animation on parry: guard broken, weapon arm flung back, tremor
        const factor = Math.min(1, e.parryStaggerTimer * 2.2);
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, -0.45 * factor, 0.35);
        rig.body.rotation.z = Math.sin(time * 36 + e.id) * 0.09 * factor;
        rig.body.position.y = Math.abs(Math.sin(time * 26 + e.id)) * 0.03 * factor;

        // Weapon arm is knocked backward and flings wide open
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -1.65 * factor, 0.35);
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.85 * factor, 0.35);

        // Shield arm deflected outward at shoulder height
        rig.leftArm.rotation.set(0, 0, -0.65 * factor);
        rig.leftArm.position.set(-0.28, armY, -0.05);
      } else if (e.stunTimer > 0) {
        // Full stagger/stun: hunched over, dizzy wobble
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0.35 + Math.sin(time * 6 + e.id) * 0.08, 0.2);
        rig.body.rotation.z = Math.sin(time * 4 + e.id) * 0.06;
        rig.body.position.y = 0;
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.25, 0.2);
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.15, 0.2);
        rig.leftArm.rotation.set(0.2, 0, 0);
        rig.leftArm.position.set(-0.24, armY, 0.05);
      } else if (e.hurtTimer > 0) {
        // Flinch when taking damage
        rig.body.rotation.x = -0.22;
        rig.body.rotation.z = Math.sin(time * 20 + e.id) * 0.06;
        rig.body.position.y = 0;
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -0.4, 0.25);
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, 0.2);
        rig.leftArm.position.set(-0.24, armY, 0.05);
      } else if (e.aiState === 'windup') {
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, 0.2);
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(
          rig.rightArm.rotation.x,
          -2.4 + Math.sin(time * 16 + e.id) * 0.04,
          0.055
        );
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, -0.2, 0.055);
        rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.2);
        rig.body.position.y = 0;
        rig.leftArm.rotation.set(0, 0, 0);
        rig.leftArm.position.set(-0.24, armY, 0.05);
      } else if (e.aiState === 'attack') {
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, 0.2);
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, 0.75, 0.35);
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0.22, 0.35);
        rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.2);
        rig.body.position.y = 0;
        rig.leftArm.rotation.set(0, 0, 0);
        rig.leftArm.position.set(-0.24, armY, 0.05);
      } else if (e.aiState === 'block') {
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, 0.2);
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -0.3, 0.2);
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0, 0.2);
        rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.2);
        rig.body.position.y = 0;
        rig.leftArm.rotation.set(0, 0.35, 0);
        rig.leftArm.position.set(-0.14, armY, 0.18);
      } else {
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, 0.2);
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(
          rig.rightArm.rotation.x,
          Math.sin(time * 4 + e.id) * 0.15,
          0.15
        );
        rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, 0, 0.15);
        rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, 0, 0.2);
        rig.body.position.y = 0;
        rig.leftArm.rotation.set(0, 0, 0);
        rig.leftArm.position.set(-0.24, armY, 0.05);
      }
    }

    for (const item of items) {
      if (item.kind === 'chest') {
        const rig = this.chestRigs.get(item.id);
        if (!rig) continue;
        rig.group.visible = true; // Chests remain permanently in the world!
        if (item.opened) {
          // Smoothly animate lid opening backwards around hinge (-110 deg)
          rig.lidPivot.rotation.x = THREE.MathUtils.lerp(
            rig.lidPivot.rotation.x,
            -Math.PI * 0.62,
            0.12
          );
          rig.potionGroup.visible = !!item.hasPotion;
          rig.coinsGroup.visible = !!item.hasGold;
        } else {
          rig.lidPivot.rotation.x = 0;
          rig.potionGroup.visible = false;
          rig.coinsGroup.visible = false;
        }
      } else {
        const m = this.itemMeshes.get(item.id);
        if (!m) continue;
        m.visible = !item.collected;
        if (!item.collected) {
          if (item.kind === 'npc') {
            const dx = playerX - item.x;
            const dz = playerY - item.y;
            const dist = Math.hypot(dx, dz);
            if (dist < 7.5) {
              m.rotation.y = Math.atan2(dx, dz);
            } else {
              m.rotation.y = Math.sin(time * 0.4 + item.id) * 0.25;
            }
            m.position.y = Math.sin(time * 2.2 + item.id) * 0.012;

            if (item.npcId === 'blacksmith_torin') {
              const hammer = m.getObjectByName('smith_hammer');
              if (hammer) {
                const strikeCycle = (time * 1.6) % 1.0;
                if (strikeCycle < 0.35) {
                  hammer.rotation.x = -0.9 + Math.sin(strikeCycle * Math.PI / 0.35) * 0.4;
                } else if (strikeCycle < 0.48) {
                  hammer.rotation.x = 0.55;
                  if (dist < 18.0 && Math.random() < 0.35) {
                    this.triggerHitSparks(18.5, 41.5 - 0.25, false);
                  }
                } else {
                  hammer.rotation.x = 0;
                }
              }
            } else if (item.npcId === 'innkeeper_bran') {
              const rag = m.getObjectByName('inn_rag');
              if (rag) {
                rag.position.x = -0.16 + Math.cos(time * 6.0) * 0.035;
                rag.position.y = 0.58 + Math.sin(time * 6.0) * 0.035;
              }
            } else if (item.npcId === 'herbalist_isolda') {
              const body = m.getObjectByName('npc_body');
              if (body) {
                body.rotation.x = 0.12 + Math.sin(time * 1.5) * 0.08;
              }
            } else if (item.npcId === 'hunter_ragnar') {
              const knife = m.getObjectByName('hunter_knife');
              if (knife) {
                knife.rotation.z = Math.sin(time * 3.5) * 0.15;
              }
            } else if (item.npcId === 'guard_olgerd') {
              const spear = m.getObjectByName('guard_spear');
              if (spear) {
                if (dist < 4.5) {
                  spear.rotation.x = -0.35; // Respectful guard salute
                } else {
                  spear.rotation.x = Math.sin(time * 1.2) * 0.05;
                }
              }
            } else if (item.npcId === 'elder_mark') {
              const staff = m.getObjectByName('elder_staff');
              if (staff) {
                staff.position.y = Math.sin(time * 1.8) * 0.015;
              }
            } else if (item.npcId === 'merchant_gus') {
              m.rotation.x = Math.sin(time * 2.2) * 0.02;
            }
            continue;
          }
          m.rotation.y = time * 1.5 + item.id;
        }
      }
    }

    for (const fg of this.forestWallGroups) {
      const c = fg.getObjectByName('tree_canopy');
      if (c) {
        c.rotation.z = Math.sin(time * 1.6 + fg.position.x * 0.7 + fg.position.z * 0.9) * 0.035;
      }
    }

    this.mapMesh.visible = isMapOpen;
    if (isMapOpen) {
      this.mapMesh.position.y = -0.05 + Math.sin(time * 2.5) * 0.005;
    }
    const hasOrb = this.leftHandType === 'orb';
    const hasShield = this.leftHandType === 'shield';
    const hasLeftWeapon = this.leftHandType === 'sword' || this.leftHandType === 'staff';
    const hasWeapon = this.rightHandType !== null;

    const isBow = this.rightHandType === 'bow';
    // Shield visible whenever equipped in left hand (map closed, not holding bow)
    this.shieldMesh.visible = !isMapOpen && hasShield && !isBow;
    // Orb only visible when holding orb (never while map open or holding bow)
    this.magicOrbMesh.visible = !isMapOpen && hasOrb && !isBow;
    // Weapon visible if holding weapon
    this.swordPivot.visible = !isMapOpen && hasWeapon;
    // Left weapon visible if equipped and map closed (not holding bow)
    this.leftWeaponPivot.visible = !isMapOpen && hasLeftWeapon && !isBow;
    if (hasShield && !isMapOpen) {
      if (parryAttemptTimer > 0) {
        // Crisp, controlled shield deflect (no flying off screen or covering camera face)
        const pNorm = Math.min(1, parryAttemptTimer / 0.30);
        const surge = Math.sin(pNorm * Math.PI); // 0 -> 1 -> 0
        const sx = -0.10 + surge * 0.04;
        const sy = -0.14 + surge * 0.03;
        const sz = -0.30 - surge * 0.06;
        const sRotX = 0.08 + surge * 0.12;
        const sRotY = 0.08 + surge * 0.18;
        const sRotZ = 0.02 - surge * 0.08;
        this.shieldMesh.position.set(sx, sy, sz);
        this.shieldMesh.rotation.set(sRotX, sRotY, sRotZ);
      } else if (isBlocking) {
        // Raised guard stance: center-left, raised to block incoming strikes
        this.shieldMesh.position.set(-0.08, -0.12, -0.30);
        this.shieldMesh.rotation.set(0.08, 0.05, 0.02);
      } else {
        // Natural first-person resting stance: LOWERED down into the bottom-left corner
        const sBob = Math.sin(time * 2.4 + 1.2) * 0.005;
        const sWalkX = distMoved > 0.0005 ? Math.sin(this.walkCycle + Math.PI) * 0.008 : 0;
        const sWalkY = distMoved > 0.0005 ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.01 : 0;
        this.shieldMesh.position.set(-0.21 + sWalkX, -0.26 + sBob - sWalkY, -0.34);
        this.shieldMesh.rotation.set(-0.12, 0.28, -0.14 + sWalkX * 1.2);
      }
    }

    if (!isBlocking && !isMapOpen) {
      if (this.rightHandType === 'bow') {
        if (this.bowReleaseTwang > 0) {
          this.bowReleaseTwang = Math.max(0, this.bowReleaseTwang - dt);
        }

        const drawFactor = Math.max(0, Math.min(1.0, bowDraw));
        const twang = this.bowReleaseTwang > 0 ? Math.sin(time * 85) * this.bowReleaseTwang * 0.04 : 0;

        const idleBob = Math.sin(time * 2.4) * 0.006;
        const walkBobX = distMoved > 0.0005 ? Math.sin(this.walkCycle) * 0.012 : 0;
        const walkBobY = distMoved > 0.0005 ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.014 : 0;

        // Smoothly pull bow towards center aim line as draw increases
        const px = THREE.MathUtils.lerp(0.34 + walkBobX, 0.38, drawFactor);
        const py = THREE.MathUtils.lerp(-0.30 + idleBob - walkBobY, -0.32, drawFactor);
        const pz = THREE.MathUtils.lerp(-0.50, -0.46, drawFactor);
        const rx = THREE.MathUtils.lerp(-0.16, -0.05, drawFactor);
        const rz = THREE.MathUtils.lerp(0.14, 0.20 + twang, drawFactor);

        this.swordPivot.position.set(px, py, pz);
        this.swordPivot.rotation.set(rx, 0.02, rz);

        if (this.bowArrowMesh) {
          this.bowArrowMesh.position.set(-0.02, 0.02, 0.06 + drawFactor * 0.28);
          this.bowArrowMesh.visible = this.bowReleaseTwang <= 0.12;
        }
        if (this.bowStringUpper && this.bowStringLower) {
          const center = new THREE.Vector3(-0.05, 0, 0.06 + drawFactor * 0.28);
          const upper = new THREE.Vector3(-0.05, 0.48, 0.025);
          const lower = new THREE.Vector3(-0.05, -0.48, 0.025);
          const alignString = (mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) => {
            const axis = new THREE.Vector3().subVectors(to, from);
            mesh.position.copy(from).add(to).multiplyScalar(0.5);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
            mesh.scale.y = axis.length() / 0.5;
          };
          alignString(this.bowStringUpper, center, upper);
          alignString(this.bowStringLower, lower, center);
        }

        // FOV is built directly from bowDraw: 72 -> 58
        const targetFov = THREE.MathUtils.lerp(72, 58, drawFactor);
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.15);
          this.camera.updateProjectionMatrix();
        }
      } else if (powerSwingTimer > 0) {
        let px = 0.24;
        let py = -0.22;
        let pz = -0.38;
        let rx = -0.22;
        let rz = 0.18;

        if (this.rightHandType === 'two_handed') {
          // Devastating two-handed vertical overhead smash
          if (powerSwingTimer < 0.30) {
            const t = powerSwingTimer / 0.30;
            const ease = t * t;
            px = 0.08 + ease * 0.04;
            py = -0.06 + ease * 0.20;
            pz = -0.28 - ease * 0.06;
            rx = -0.42 - ease * 0.35;
            rz = -0.38 + ease * 0.20;
          } else if (powerSwingTimer < 0.52) {
            const t = (powerSwingTimer - 0.30) / 0.22;
            const ease = 1 - Math.pow(1 - t, 4);
            px = 0.12 - ease * 0.24;
            py = 0.14 - ease * 0.52;
            pz = -0.34 - ease * 0.16;
            rx = -0.77 + ease * 1.55;
            rz = -0.18 - ease * 0.15;
          } else {
            const t = (powerSwingTimer - 0.52) / 0.48;
            const ease = t * t * (3 - 2 * t);
            px = -0.12 + ease * 0.28;
            py = -0.38 + ease * 0.18;
            pz = -0.50 + ease * 0.16;
            rx = 0.78 - ease * 1.06;
            rz = -0.33 + ease * 0.43;
          }
        } else {
          // 1H cleave
          if (powerSwingTimer < 0.32) {
            const t = powerSwingTimer / 0.32;
            const ease = t * t;
            px = 0.34 + ease * 0.14;
            py = -0.16 + ease * 0.28;
            pz = -0.28 - ease * 0.04;
            rx = -0.15 - ease * 0.65;
            rz = -0.85 + ease * 0.25;
          } else if (powerSwingTimer < 0.50) {
            const t = (powerSwingTimer - 0.32) / 0.18;
            const ease = 1 - Math.pow(1 - t, 4);
            px = 0.48 - ease * 0.82;
            py = 0.12 - ease * 0.48;
            pz = -0.32 - ease * 0.16;
            rx = -0.80 + ease * 1.35;
            rz = -0.60 + ease * 1.5;
          } else {
            const t = (powerSwingTimer - 0.50) / 0.50;
            const ease = t * t * (3 - 2 * t);
            px = -0.34 + ease * 0.58;
            py = -0.36 + ease * 0.14;
            pz = -0.48 + ease * 0.10;
            rx = 0.55 - ease * 0.77;
            rz = 0.90 - ease * 0.72;
          }
        }

        this.swordPivot.position.set(px, py, pz);
        this.swordPivot.rotation.set(rx, 0, rz);
      } else if (isRightCharging) {
        if (this.rightHandType === 'two_handed') {
          // Zweihander two-handed overhead power charge ready stance
          const trem = Math.sin(time * 35) * 0.0035;
          const breath = Math.sin(time * 3) * 0.004;
          const px = 0.08 + trem;
          const py = -0.06 + breath;
          const pz = -0.28;
          const rx = -0.42;
          const rz = -0.38 + trem * 1.8;
          this.swordPivot.position.set(px, py, pz);
          this.swordPivot.rotation.set(rx, 0.20, rz);
        } else {
          // Authentic 1H shoulder wind-up
          const trem = Math.sin(time * 30) * 0.0025;
          const breath = Math.sin(time * 3) * 0.004;
          const px = 0.35 + trem;
          const py = -0.18 + breath;
          const pz = -0.26;
          const rx = -0.12;
          const rz = -0.92 + trem * 1.5;
          this.swordPivot.position.set(px, py, pz);
          this.swordPivot.rotation.set(rx, 0.32, rz);
        }
      } else if (parryAttemptTimer > 0 && !hasShield) {
        // Tight, grounded weapon parry (blade stays in frame, crisp deflect flick)
        const pNorm = Math.min(1, parryAttemptTimer / 0.28);
        const surge = Math.sin(pNorm * Math.PI);
        const px = 0.22 - surge * 0.08;
        const py = -0.20 + surge * 0.08;
        const pz = -0.36 - surge * 0.05;
        const rx = -0.22 - surge * 0.22;
        const rz = 0.18 + surge * 0.35;
        this.swordPivot.position.set(px, py, pz);
        this.swordPivot.rotation.set(rx, -surge * 0.15, rz);
      } else if (swingTimer > 0) {
        let px = 0.24;
        let py = -0.22;
        let pz = -0.38;
        let rx = -0.22;
        let rz = 0.18;

        if (swingTimer < 0.28) {
          // Phase 1: Turn right & cock diagonally
          const t = swingTimer / 0.28;
          const ease = t * t;
          px = 0.24 + ease * 0.18;
          py = -0.22 + ease * 0.3;
          pz = -0.38 + ease * 0.06;
          rx = -0.22 + ease * 0.37;
          rz = 0.18 - ease * 0.83;
        } else if (swingTimer < 0.52) {
          // Phase 2: Diagonal cleave toward bottom-left corner
          const t = (swingTimer - 0.28) / 0.24;
          const ease = 1 - Math.pow(1 - t, 3);
          px = 0.42 - ease * 0.68;
          py = 0.08 - ease * 0.4;
          pz = -0.32 - ease * 0.14;
          rx = 0.15 - ease * 1.0;
          rz = -0.65 + ease * 1.4;
        } else {
          // Phase 3: Heavy follow-through & slow recovery to ready stance
          const t = (swingTimer - 0.52) / 0.48;
          const ease = t * t * (3 - 2 * t);
          px = -0.26 + ease * 0.5;
          py = -0.32 + ease * 0.1;
          pz = -0.46 + ease * 0.08;
          rx = -0.85 + ease * 0.63;
          rz = 0.75 - ease * 0.57;
        }

        this.swordPivot.position.set(px, py, pz);
        this.swordPivot.rotation.set(rx, 0, rz);
      }

 else {
        const idleBob = Math.sin(time * 2.4) * 0.006;
        const walkBobX = distMoved > 0.0005 ? Math.sin(this.walkCycle) * 0.012 : 0;
        const walkBobY = distMoved > 0.0005 ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.014 : 0;
        const is2H = this.rightHandType === 'two_handed';
        let px = (this.rightHandType === 'staff' ? 0.18 : is2H ? 0.16 : 0.24) + walkBobX;
        let py = (this.rightHandType === 'staff' ? -0.24 : is2H ? -0.20 : -0.22) + idleBob - walkBobY;
        let pz = is2H ? -0.34 : -0.38;
        let rx = is2H ? -0.28 : -0.22;
        let rz = (this.rightHandType === 'staff' ? 0.12 : is2H ? 0.10 : 0.18) + walkBobX * 1.5;

        if (Math.abs(this.camera.fov - 72) > 0.1) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 72, 0.15);
          this.camera.updateProjectionMatrix();
        }
        if (this.rightHandType === 'staff') {
          // Subtle idle floating & rotation of mystical staff parts
          if (this.staffHaloRing) {
            this.staffHaloRing.rotation.y = time * (this.isStaffCharging ? 6.5 : 1.6);
            this.staffHaloRing.rotation.x = Math.PI / 2.5 + Math.sin(time * 2.2) * 0.18;
          }
          if (this.staffCrystal) {
            this.staffCrystal.rotation.y = time * (this.isStaffCharging ? 4.5 : 1.2);
            this.staffCrystal.rotation.z = Math.cos(time * 1.7) * 0.12;
          }
          if (this.staffInnerCore) {
            this.staffInnerCore.rotation.y = -time * 3.2;
          }
          for (let si = 0; si < this.staffFloatingShards.length; si++) {
            const sh = this.staffFloatingShards[si];
            sh.position.y = 0.60 + Math.sin(time * 3.2 + si * Math.PI) * 0.014;
            sh.rotation.y = time * 2.8 + si;
          }

          if (this.isStaffCharging) {
            // Charging stance: raise and aim staff slightly forward, crystal vibrates
            py += 0.045 + Math.sin(time * 22) * 0.003;
            pz -= 0.06;
            rx += 0.18;
            const pulse = 1.05 + Math.sin(time * 20) * 0.28;
            if (this.staffCrystal) this.staffCrystal.scale.set(pulse, pulse, pulse);
            if (this.staffLight) this.staffLight.intensity = 1.4 + Math.sin(time * 20) * 0.6;
          }

          // Recoil punch when spell fires (applies also when charging)
          if (this.staffCastRecoilTimer > 0) {
            const t = this.staffCastRecoilTimer / 0.22;
            pz += Math.sin(t * Math.PI) * 0.08;
            rx -= Math.sin(t * Math.PI) * 0.18;
            if (this.staffLight) this.staffLight.intensity = Math.max(this.staffLight.intensity, t * 2.8);
          }
        }

        this.swordPivot.position.set(px, py, pz);
        this.swordPivot.rotation.set(rx, 0, rz);
      }

      // Animate Off-Hand weapon (Dual Wield)
      if (hasLeftWeapon) {
        if (offHandPowerSwingTimer > 0) {
          let lpx = -0.24;
          let lpy = -0.22;
          let lpz = -0.38;
          let lrx = -0.22;
          let lrz = -0.18;

          if (offHandPowerSwingTimer < 0.32) {
            // Rapid forward snap from left shoulder
            const t = offHandPowerSwingTimer / 0.32;
            const ease = t * t;
            lpx = -0.34 - ease * 0.14;
            lpy = -0.16 + ease * 0.28;
            lpz = -0.28 - ease * 0.04;
            lrx = -0.15 - ease * 0.65;
            lrz = 0.85 - ease * 0.25;
          } else if (offHandPowerSwingTimer < 0.50) {
            // Brutal downward overhead slash from left to right
            const t = (offHandPowerSwingTimer - 0.32) / 0.18;
            const ease = 1 - Math.pow(1 - t, 4);
            lpx = -0.48 + ease * 0.82;
            lpy = 0.12 - ease * 0.48;
            lpz = -0.32 - ease * 0.16;
            lrx = -0.80 + ease * 1.35;
            lrz = 0.60 - ease * 1.5;
          } else {
            // Recovery
            const t = (offHandPowerSwingTimer - 0.50) / 0.50;
            const ease = t * t * (3 - 2 * t);
            lpx = 0.34 - ease * 0.58;
            lpy = -0.36 + ease * 0.14;
            lpz = -0.48 + ease * 0.10;
            lrx = 0.55 - ease * 0.77;
            lrz = -0.90 + ease * 0.72;
          }
          this.leftWeaponPivot.position.set(lpx, lpy, lpz);
          this.leftWeaponPivot.rotation.set(lrx, 0, lrz);
        } else if (isLeftCharging) {
          // Skyrim-style left shoulder wind-up
          const trem = Math.sin(time * 30 + 1.2) * 0.0025;
          const breath = Math.sin(time * 3 + 1.2) * 0.004;
          const lpx = -0.35 - trem;
          const lpy = -0.18 + breath;
          const lpz = -0.26;
          const lrx = -0.12;
          const lrz = 0.92 - trem * 1.5;
          this.leftWeaponPivot.position.set(lpx, lpy, lpz);
          this.leftWeaponPivot.rotation.set(lrx, -0.32, lrz);
        } else if (parryAttemptTimer > 0) {
          // Crisp off-hand deflect flick
          const pNorm = Math.min(1, parryAttemptTimer / 0.28);
          const surge = Math.sin(pNorm * Math.PI);
          const lpx = -0.22 + surge * 0.08;
          const lpy = -0.20 + surge * 0.08;
          const lpz = -0.36 - surge * 0.05;
          const lrx = -0.22 - surge * 0.22;
          const lrz = -0.18 - surge * 0.35;
          this.leftWeaponPivot.position.set(lpx, lpy, lpz);
          this.leftWeaponPivot.rotation.set(lrx, surge * 0.15, lrz);
        } else if (offHandSwingTimer > 0) {
          let lpx = -0.24;
          let lpy = -0.22;
          let lpz = -0.38;
          let lrx = -0.22;
          let lrz = -0.18;

          if (offHandSwingTimer < 0.28) {
            // Phase 1: Turn left & cock back
            const t = offHandSwingTimer / 0.28;
            const ease = t * t;
            lpx = -0.24 - ease * 0.18;
            lpy = -0.22 + ease * 0.3;
            lpz = -0.38 + ease * 0.06;
            lrx = -0.22 + ease * 0.37;
            lrz = -0.18 + ease * 0.83;
          } else if (offHandSwingTimer < 0.52) {
            // Phase 2: Diagonal slash toward right corner
            const t = (offHandSwingTimer - 0.28) / 0.24;
            const ease = 1 - Math.pow(1 - t, 3);
            lpx = -0.42 + ease * 0.68;
            lpy = 0.08 - ease * 0.4;
            lpz = -0.32 - ease * 0.14;
            lrx = 0.15 - ease * 1.0;
            lrz = 0.65 - ease * 1.4;
          } else {
            // Phase 3: Recovery
            const t = (offHandSwingTimer - 0.52) / 0.48;
            const ease = t * t * (3 - 2 * t);
            lpx = 0.26 - ease * 0.5;
            lpy = -0.32 + ease * 0.1;
            lpz = -0.46 + ease * 0.08;
            lrx = -0.85 + ease * 0.63;
            lrz = -0.75 + ease * 0.57;
          }
          this.leftWeaponPivot.position.set(lpx, lpy, lpz);
          this.leftWeaponPivot.rotation.set(lrx, 0, lrz);
        } else {
          // Off-hand weapon idle bobbing
          const idleBob = Math.sin(time * 2.4 + 1.2) * 0.006;
          const walkBobX = distMoved > 0.0005 ? Math.sin(this.walkCycle + Math.PI) * 0.012 : 0;
          const walkBobY = distMoved > 0.0005 ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.014 : 0;
          const lpx = (this.leftHandType === 'staff' ? -0.18 : -0.24) + walkBobX;
          const lpy = (this.leftHandType === 'staff' ? -0.24 : -0.22) + idleBob - walkBobY;
          const lpz = -0.38;
          const lrx = -0.22;
          const lrz = (this.leftHandType === 'staff' ? -0.12 : -0.18) + walkBobX * 1.5;

          this.leftWeaponPivot.position.set(lpx, lpy, lpz);
          this.leftWeaponPivot.rotation.set(lrx, 0, lrz);
        }
      }
    }

    if (this.staffCastRecoilTimer > 0) {
      this.staffCastRecoilTimer = Math.max(0, this.staffCastRecoilTimer - 0.016);
    }

    // Animate magic orb: float + rotate inner core + pulse scale
    if (hasOrb && !isMapOpen) {
      const orbBob = Math.sin(time * 2.8) * 0.005;
      this.magicOrbMesh.position.set(-0.14, -0.16 + orbBob, -0.34);
      // children order: 0=forearm,1=wristCuff,2=cradleBase,3-6=prongs,7=palm,8-10=fingers,11=orbOuter,12=orbCore,13=orbPulse,14=orbLight
      const orbCore = this.magicOrbMesh.children[12];
      const orbPulse = this.magicOrbMesh.children[13];
      if (orbCore) orbCore.rotation.y = time * 2.4;
      if (orbPulse) {
        orbPulse.rotation.x = time * 3.1;
        const pScale = 0.85 + Math.sin(time * 5.0) * 0.18;
        orbPulse.scale.set(pScale, pScale, pScale);
      }
    }

    // Animate stuck mob in the stone wall
    if (this.stuckMobArm) {
      this.stuckMobArm.rotation.x = -0.15 + Math.sin(time * 2.8) * 0.14;
      this.stuckMobArm.rotation.z = Math.cos(time * 2.1) * 0.08;
    }
    if (this.stuckMobHead) {
      this.stuckMobHead.rotation.y = Math.sin(time * 1.3) * 0.18;
      this.stuckMobHead.rotation.x = Math.cos(time * 1.7) * 0.06;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
