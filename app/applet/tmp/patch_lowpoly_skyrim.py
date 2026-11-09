with open('src/game/lowpoly3d.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update arrows array type definition
old_arrows_type = """  private arrows: {
    mesh: THREE.Group;
    light?: THREE.PointLight;
    dir: THREE.Vector3;
    speed: number;
    life: number;
    damage: number;
    penetration: number;
    isCrit?: boolean;
    onHit?: (e: Enemy, dmg: number) => void;
  }[] = [];"""

new_arrows_type = """  private arrows: {
    mesh: THREE.Group;
    light?: THREE.PointLight;
    velocity: THREE.Vector3;
    gravityScale: number;
    life: number;
    maxDistance: number;
    distanceTraveled: number;
    damage: number;
    penetration: number;
    isCrit?: boolean;
    onHit?: (e: Enemy, dmg: number) => void;
  }[] = [];"""

assert old_arrows_type in text, "old_arrows_type not found"
text = text.replace(old_arrows_type, new_arrows_type, 1)

# 2. Update spawnArrow method
old_spawn_arrow = """  public spawnArrow(
    damage: number,
    penetration: number,
    isPowerShot: boolean,
    onHitEnemy?: (e: Enemy, dmg: number) => void
  ) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const spawnPos = this.camera.position.clone().addScaledVector(forward, 0.38);
    spawnPos.y -= 0.04;

    const arrowGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.56, 5),
      new THREE.MeshLambertMaterial({ color: 0x785338, flatShading: true })
    );
    shaft.rotation.x = Math.PI / 2;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.06, 4),
      new THREE.MeshLambertMaterial({ color: isPowerShot ? 0xfef08a : 0x94a3b8, flatShading: true })
    );
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.30;

    const fletchMat = new THREE.MeshLambertMaterial({
      color: isPowerShot ? 0xf59e0b : 0x1e293b,
      flatShading: true,
    });
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.026, 0.08), fletchMat);
      fletch.position.set(0, 0, 0.22);
      fletch.rotation.z = (i * Math.PI * 2) / 3;
      arrowGroup.add(fletch);
    }
    arrowGroup.add(shaft, head);
    arrowGroup.position.copy(spawnPos);
    arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward.clone().normalize());
    this.scene.add(arrowGroup);

    let light: THREE.PointLight | undefined;
    if (isPowerShot) {
      light = new THREE.PointLight(0xf59e0b, 1.4, 2.8);
      light.position.copy(spawnPos);
      this.scene.add(light);
    }

    this.arrows.push({
      mesh: arrowGroup,
      light,
      dir: forward.normalize(),
      speed: isPowerShot ? 26.0 : 19.0,
      life: 2.2,
      damage,
      penetration,
      isCrit: isPowerShot,
      onHit: onHitEnemy,
    });

    this.bowReleaseTwang = 0.25;
  }"""

new_spawn_arrow = """  public spawnArrow(
    velocity: THREE.Vector3,
    gravityScale: number,
    damage: number,
    penetration: number,
    isCrit: boolean,
    onHitEnemy?: (e: Enemy, dmg: number) => void
  ) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const spawnPos = this.camera.position.clone().addScaledVector(forward, 0.38);
    spawnPos.y -= 0.04;

    const arrowGroup = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.56, 5),
      new THREE.MeshLambertMaterial({ color: 0x785338, flatShading: true })
    );
    shaft.rotation.x = Math.PI / 2;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.06, 4),
      new THREE.MeshLambertMaterial({ color: isCrit ? 0xfef08a : 0x94a3b8, flatShading: true })
    );
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.30;

    const fletchMat = new THREE.MeshLambertMaterial({
      color: isCrit ? 0xf59e0b : 0x1e293b,
      flatShading: true,
    });
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.026, 0.08), fletchMat);
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
      velocity: velocity.clone(),
      gravityScale,
      life: 10.0,
      maxDistance: 300.0,
      distanceTraveled: 0,
      damage,
      penetration,
      isCrit,
      onHit: onHitEnemy,
    });

    this.bowReleaseTwang = 0.25;
  }"""

assert old_spawn_arrow in text, "old_spawn_arrow not found"
text = text.replace(old_spawn_arrow, new_spawn_arrow, 1)

# 3. Update arrow update loop in render()
old_arrow_loop = """    // Update 3D Flying Arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      a.dir.y -= 1.9 * dt;
      a.mesh.position.addScaledVector(a.dir, a.speed * dt);
      a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), a.dir.clone().normalize());
      if (a.light) {
        a.light.position.copy(a.mesh.position);
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
        a.life = 0;
      } else if (this.mapGrid && this.mapGrid.length > 0) {
        const mx = Math.floor(a.mesh.position.x);
        const my = Math.floor(a.mesh.position.z);
        if (my >= 0 && my < this.mapGrid.length && mx >= 0 && mx < this.mapGrid[0].length) {
          const tile = this.mapGrid[my][mx];
          if (tile === 1 || tile === 8) {
            this.triggerHitSparks(a.mesh.position.x, a.mesh.position.z, false);
            a.life = 0;
          }
        }
      }

      if (a.life <= 0) {
        this.scene.remove(a.mesh);
        if (a.light) {
          this.scene.remove(a.light);
        }
        this.arrows.splice(i, 1);
      }
    }"""

new_arrow_loop = """    // Update 3D Flying Arrows (Skyrim physics: v.y -= g * gravityScale * dt, pos += v * dt)
    const g = 9.81;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      a.velocity.y -= g * a.gravityScale * dt;

      const step = a.velocity.clone().multiplyScalar(dt);
      a.mesh.position.add(step);
      a.distanceTraveled += step.length();

      if (a.velocity.lengthSq() > 0.001) {
        a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), a.velocity.clone().normalize());
      }
      if (a.light) {
        a.light.position.copy(a.mesh.position);
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
        a.life = 0;
      } else if (this.mapGrid && this.mapGrid.length > 0) {
        const mx = Math.floor(a.mesh.position.x);
        const my = Math.floor(a.mesh.position.z);
        if (my >= 0 && my < this.mapGrid.length && mx >= 0 && mx < this.mapGrid[0].length) {
          const tile = this.mapGrid[my][mx];
          if (tile === 1 || tile === 8) {
            this.triggerHitSparks(a.mesh.position.x, a.mesh.position.z, false);
            a.life = 0;
          }
        }
      }

      if (a.life <= 0 || a.distanceTraveled >= a.maxDistance) {
        this.scene.remove(a.mesh);
        if (a.light) {
          this.scene.remove(a.light);
        }
        this.arrows.splice(i, 1);
      }
    }"""

assert old_arrow_loop in text, "old_arrow_loop not found"
text = text.replace(old_arrow_loop, new_arrow_loop, 1)

with open('src/game/lowpoly3d.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('lowpoly3d.ts updated with Skyrim arrow physics!')
