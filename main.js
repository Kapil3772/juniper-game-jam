class Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  top() {
    return this.y;
  }
  bottom() {
    return this.y + this.h;
  }
  right() {
    return this.x + this.w;
  }
  left() {
    return this.x;
  }
  centerX() {
    return this.x + this.w / 2.0;
  }
  centerY() {
    return this.y + this.h / 2.0;
  }
}
class PhysicsRect extends Rect {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.prevX = x;
    this.prevY = y;
    this.gridX = 0;
    this.gridY = 0;
  }
  intersects(rect) {
    return (
      this.right() > rect.left() &&
      this.bottom() > rect.top() &&
      this.left() < rect.right() &&
      this.top() < rect.bottom()
    );
  }
  intersectsPoint(x, y) {
    return (
      this.right() > x && this.left() < x && y > this.top() && y < this.bottom()
    );
  }
}
class GameSound {
  loadSound(path) {}
}
class GameImage {
  loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = path;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }
  async loadImagesFromFolder(path, count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        this.loadImage(path + i + ".png").catch((err) => {
          console.log("Cannot load: " + path + i + ".png");
          return null;
        }),
      );
    }
    return (await Promise.all(promises)).filter(Boolean);
  }
}

class ProgressBar extends Rect {
  constructor(entity, x, y, w, h, baseProgress = 0) {
    super(x, y, w, h);
    this.entity = entity;
    this.baseProgress = baseProgress;
    this.currentProgress = this.baseProgress;
    this.progressColor = "green";
    this.maxProgress = 1;
    this.increasedProgress = this.baseProgress;
    this.progressVelocity = this.maxProgress; // x width completes per sec
    this.isDone = false;
    this.progressInfo = null;
  }
  update(dt) {
    this.currentProgress += this.progressVelocity * dt;
    this.currentProgress = Math.min(
      this.currentProgress,
      this.increasedProgress,
    );
    if (this.currentProgress == this.maxProgress && !this.isDone) {
      this.isDone = true;
    }
  }
  render(ctx) {
    ctx.fillStyle = this.progressColor;
    const fillW = (this.w / this.maxProgress) * this.currentProgress;
    ctx.fillRect(this.x, this.y, fillW, this.h);
    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    // info render
    if (this.progressInfo != null) {
      ctx.fillStyle = "white";
      ctx.font = "20 px bold";
      ctx.fillText(this.progressInfo, this.x, this.y - 10);
    }
  }
  incrementProgress(progress) {
    this.increasedProgress = Math.min(progress, this.maxProgress);
  }
  changeProgressInfo(info) {
    this.progressInfo = info;
  }
}
class BloodParticle {
  constructor(x, y, camera) {
    this.x = x;
    this.y = y;
    this.camera = camera;

    this.vx = (Math.random() - 0.5) * 300;
    this.vy = (Math.random() - 0.5) * 250;

    this.lifeTimer = 3;
    this.size = 1 + Math.random() * 3;
    this.w = this.size;
    this.h = this.size;
    this.dead = false;

    this.onGround = false;
    this.onGroundLifeTimer = 7;
    this.decayTransitionAlpha = 1;
    this.decayAlphaVelocity = 0.33; //1 unit per sec
    this.decayTransitionStarted = false;
  }

  update(dt) {
    this.lifeTimer -= dt;
    if (this.lifeTimer <= 0 && !this.onGround) {
      this.dead = true;
    }

    if (this.onGround) {
      this.onGroundLifeTimer -= dt;
      if (this.onGroundLifeTimer <= 0) {
        this.decayTransitionStarted = true;
      }
    } else {
      this.vy += 700 * dt; // gravity

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    if (this.decayTransitionStarted) {
      this.decayTransitionAlpha = Math.max(
        this.decayTransitionAlpha - this.decayAlphaVelocity * dt,
        0,
      );
      if (this.decayTransitionAlpha <= 0) {
        this.dead = true;
      }
    }
  }

  render(ctx) {
    ctx.fillStyle = "rgba(160, 0, 0," + this.decayTransitionAlpha + ")";
    ctx.fillRect(
      this.x + this.camera.camOffsetX,
      this.y + this.camera.camOffsetY,
      this.w,
      this.h,
    );
  }
}
class ParticleManager {
  constructor(game) {
    this.game = game;
    this.bloodParticles = [];
  }
  update(dt) {
    for (const particle of this.bloodParticles) {
      particle.update(dt);
      let gx = Math.floor(particle.x / this.game.currentMode.tileMap.tileW);
      let gy = Math.floor(particle.y / this.game.currentMode.tileMap.tileH);
      if (!particle.onGround) {
        if (this.game.currentMode.tileMap.checkForPhysicsTile(gx, gy)) {
          const tile = this.game.currentMode.tileMap.getOngridTile(gx, gy);
          particle.onGround = true;
          particle.y = tile.top();
          particle.x += (Math.random() - 0.5) * particle.w * 0.5;
          particle.w = particle.w * (2 + Math.random());
          particle.h = particle.h * (0.3 + Math.random() * 0.15);
        }
      }
      if (particle.dead) {
        this.removeBloodParticle(particle);
      }
    }
  }
  render(ctx) {
    for (const particle of this.bloodParticles) {
      particle.render(ctx);
    }
  }
  addBloodParticle(x, y) {
    this.bloodParticles.push(
      new BloodParticle(x, y, this.game.currentMode.camera),
    );
  }
  removeBloodParticle(particle) {
    let id = this.bloodParticles.indexOf(particle);
    this.bloodParticles.splice(id, 1);
  }
}

const EntityType = {
  ROBBER: "ROBBER",
  PLAYER: "PLAYER",
};

const PlayerAnimState = {
  IDLE: "IDLE",
  WALK: "WALK",
  JUMP: "JUMP",
  FALL: "FALL",
  RUN: "RUN",
  IDLE_AIM: "IDLE_AIM",
  WALK_AIM: "WALK_AIM",
  RUN_AIM: "RUN_AIM",
  JUMP_AIM: "JUMP_AIM",
  FALL_AIM: "FALL_AIM",
  FIRE: "FIRE",
  WALK_FIRE: "WALK_FIRE",
  RUN_FIRE: "RUN_FIRE",
  JUMP_FIRE: "JUMP_FIRE",
  FALL_FIRE: "FALL_FIRE",
  HURT: "HURT",
};

class Tile extends PhysicsRect {
  constructor(x, y, w, h, camera, img) {
    super(x, y, w, h);
    this.camera = camera;
    this.img = img;
  }
  update(dt) {}
  render(ctx) {
    if (this.img != null) {
      ctx.drawImage(
        this.img,
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    } else {
      ctx.strokeStyle = "cyan";
      ctx.strokeRect(
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    }
  }
}
class Decor extends PhysicsRect {
  constructor(x, y, w, h, camera, img) {
    super(x, y, w, h);
    this.camera = camera;
    this.img = img;
  }
  update(dt) {}
  render(ctx) {
    if (this.img != null) {
      ctx.drawImage(
        this.img,
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    } else {
      ctx.strokeStyle = "red";
      ctx.strokeRect(
        this.x + this.camera.camOffsetX,
        this.y + this.camera.camOffsetY,
        this.w,
        this.h,
      );
    }
  }
}
class TileMap {
  constructor(game, tileW, tileH, camera, path = null) {
    this.game = game;
    this.camera = camera;
    this.tileW = tileW;
    this.tileH = tileH;
    this.ongridTilesData = null;
    this.offGridTilesData = null;
    this.onGridTiles = new Map();
    this.offGridTiles = new Map();
    // for (let i = 0; i < 20; i++) {
    //   this.onGridTiles.set(
    //     "" + i + ",6",
    //     new Tile(0 + i * 32, 6 * 32, 32, 32, this.camera, null),
    //   );
    // }
    this.onScreenTiles = [];
    this.visibleLeft = 0;
    this.visibleRight = 0;
    this.visibleTop = 0;
    this.visibleBottom = 0;

    if (path != null) {
      //this.loadTileMap(path);
      this.loadTileMap2(path);
    }
  }
  async loadTileMap(path) {
    const res = await fetch(path);
    const data = await res.json();
    this.tileW = data.tileW;
    this.tileH = data.tileH;
    const onGridTilesData = data.onGridTiles;
    const offGridTilesData = data.offGridTiles || [];
    for (const tile of onGridTilesData) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType][tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
      }
      this.onGridTiles.set(
        tile.gridX + "," + tile.gridY,
        new Tile(
          tile.gridX * this.tileW,
          tile.gridY * this.tileH,
          this.tileW,
          this.tileH,
          this.game.currentMode.camera,
          img,
        ),
      );
    }
    //this.tileSize = data.tile_size || 16;
  }
  async loadTileMap2(path) {
    const res = await fetch(path);
    const data = await res.json();

    this.tileW = data.tileW;
    this.tileH = data.tileH;
    const onGridTilesData = data.tileMap;
    const offGridTilesData = data.offGridTiles || [];
    const spawnners = data.spawnners;

    for (const tile of Object.values(onGridTilesData)) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType]?.[tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
      }
      if (tileType == "decor") {
        this.offGridTiles.set(
          tile.pos[0] + "," + tile.pos[1],
          new Decor(
            tile.pos[0] * this.tileW,
            tile.pos[1] * this.tileH,
            img.width * 2,
            img.height * 2,
            this.game.currentMode.camera,
            img,
          ),
        );
      } else {
        this.onGridTiles.set(
          tile.pos[0] + "," + tile.pos[1],
          new Tile(
            tile.pos[0] * this.tileW,
            tile.pos[1] * this.tileH,
            this.tileW,
            this.tileH,
            this.game.currentMode.camera,
            img,
          ),
        );
      }
    }
    for (const tile of Object.values(offGridTilesData)) {
      const tileType = tile.type;
      const tileVariant = tile.variant;
      const img = this.game.tileVariantRegistry[tileType]?.[tileVariant];
      if (!img) {
        console.log(
          "Couldn't find tile " +
            tileType +
            "variant " +
            tileVariant +
            "in the registry",
        );
        continue;
      }
      this.offGridTiles.set(
        tile.pos[0] + "," + tile.pos[1],
        new Decor(
          tile.pos[0] * 2,
          tile.pos[1] * 2,
          img.width * 2,
          img.height * 2,
          this.game.currentMode.camera,
          img,
        ),
      );
    }
    for (const entity of Object.values(spawnners)) {
      if (entity.type == "robber") {
        this.game.currentMode.enemies.push(
          new Robber(
            this.game,
            entity.pos[0]*2,
            entity.pos[1]*2,
            this.game.currentMode.playerW,
            this.game.currentMode.playerH,
          ),
        );
      }
    }
    //this.tileSize = data.tile_size || 16;
  }
  extract(idPair, keep = false) {
    const matches = [];

    this.offGridTiles = this.offGridTiles.filter((tile) => {
      if (
        idPair.some((pair) => pair[0] === tile.type && pair[1] === tile.variant)
      ) {
        matches.push({ ...tile, pos: [tile.pos[0] * 2, tile.pos[1] * 2] });
        return keep; // keep = false → remove it
      }
      return true; // keep tiles that don't match
    });

    for (let loc in this.tilemap) {
      const tile = this.tilemap[loc];
      if (
        idPair.some((pair) => pair[0] === tile.type && pair[1] === tile.variant)
      ) {
        const copiedTile = { ...tile, pos: [...tile.pos] };
        copiedTile.pos[0] *= this.tileSize;
        copiedTile.pos[1] *= this.tileSize;
        matches.push(copiedTile);

        if (!keep) {
          delete this.tilemap[loc];
        }
      }
    }

    return matches;
  }

  update(dt) {
    this.updateOnScreenTile();
  }
  renderTiles(ctx) {
    for (const tile of this.onScreenTiles.values()) {
      tile.render(ctx);
    }
  }
  renderDecors(ctx) {
    for (const decor of this.offGridTiles.values()) {
      decor.render(ctx);
    }
  }
  checkForPhysicsTile(gridx, gridy) {
    return this.onGridTiles.has(gridx + "," + gridy);
  }
  updateOnScreenTile() {
    this.onScreenTiles = [];
    this.visibleLeft = Math.floor(
      (this.camera.x - this.game.vCanvasW / 2) / this.tileW,
    );
    this.visibleRight = Math.ceil(
      (this.camera.x + this.game.vCanvasW / 2) / this.tileW,
    );
    this.visibleTop = Math.floor(
      (this.camera.y - this.game.vCanvasH / 2) / this.tileH,
    );
    this.visibleBottom = Math.ceil(
      (this.camera.y + this.game.vCanvasH / 2) / this.tileH,
    );
    for (let i = this.visibleLeft; i <= this.visibleRight; i++) {
      for (let j = this.visibleTop; j <= this.visibleBottom; j++) {
        const tile = this.onGridTiles.get(i+","+j);
        if (tile) {
          this.onScreenTiles.push(tile);
        }
      }
    }
  }
  getOngridTile(x, y) {
    return this.onGridTiles.get(x + "," + y);
  }
}
class Animation {
  constructor(imgArray, animCompletionTime, loop, entityWidth, entityHeight) {
    this.imgs = imgArray;
    this.looping = loop;
    this.frames = this.imgs.length;
    this.animCompletionTime = animCompletionTime;
    this.frameTime = this.animCompletionTime / this.frames; //seconds
    this.xOffset = entityWidth / 2 - this.imgs[0].width / 2;
    this.yOffset = entityHeight - this.imgs[0].height;
  }
}

class AnimationPlayer {
  constructor() {
    this.animation = null;
    this.animTime = 0;
    this.frameTime = 0;
    this.frameIndex = 0;
    this.done = false;
  }
  update(dt) {
    this.animTime += dt;
    this.frameTime += dt;
    if (this.frameTime >= this.animation.frameTime) {
      this.frameTime -= this.animation.frameTime;
      if (this.animation.looping) {
        this.frameIndex = (this.frameIndex + 1) % this.animation.frames;
      } else {
        this.frameIndex = Math.min(
          this.frameIndex + 1,
          this.animation.frames - 1,
        );
        this.done = true;
      }
    }
  }
  getCurrentFrame() {
    return this.animation.imgs[this.frameIndex];
  }
  setAnimation(anim) {
    this.reset();
    this.animation = anim;
  }
  reset() {
    this.animTime = 0;
    this.frameTime = 0;
    this.frameIndex = 0;
  }
}

class TileCollisionHandeler {
  constructor(entity, tileW, tileH) {
    this.entity = entity;
    this.tileW = tileW;
    this.tileH = tileH;
    this.physicsRectAround = [];
  }
  resolveHorizontalCollision() {
    for (const tile of this.physicsRectAround) {
      if (tile.intersects(this.entity)) {
        //horisontal resolve
        if (this.entity.direction == 1) {
          this.entity.x = tile.left() - this.entity.w;
          console.log(tile.x + "," + tile.y + "resolved to right");
        } else if (this.entity.direction == -1) {
          this.entity.x = tile.right();
          console.log(tile.x + "," + tile.y + "resolved to left");
        }
      }
    }
  }
  resolveVerticalCollision() {
    for (const tile of this.physicsRectAround) {
      if (tile.intersects(this.entity)) {
        //vertical resolve
        if (this.entity.yVelocity > 0) {
          this.entity.y = tile.top() - this.entity.h;
          this.entity.yVelocity = 0;
        } else if (this.entity.yVelocity < 0) {
          this.entity.y = tile.bottom();
          this.entity.yVelocity = 0;
        }
      }
    }
  }
  updatePhysicsTilesAround() {
    this.physicsRectAround = [];
    let gridLeft = Math.floor(this.entity.left() / this.tileW);
    let gridRight = Math.ceil(this.entity.right() / this.tileW);
    let gridTop = Math.floor(this.entity.top() / this.tileH);
    let gridBottom = Math.ceil(this.entity.bottom() / this.tileH);
    for (let i = gridLeft; i <= gridRight; i++) {
      for (let j = gridTop; j <= gridBottom; j++) {
        const tile = this.entity.game.currentMode.tileMap.onGridTiles.get(
          `${i},${j}`,
        );
        if (tile != null) {
          this.physicsRectAround.push(tile);
        }
      }
    }
  }
}

class Bullet extends PhysicsRect {
  constructor(entity, x, y, w, h, direction, anim) {
    super(x, y, w, h);
    this.entity = entity;
    this.direction = direction;
    this.xVelocity = 800; //px per second
    this.bulletAnim = anim;
    this.bulletAnimPlayer = new AnimationPlayer();
    this.bulletAnimPlayer.animation = this.bulletAnim;
    this.damageApplied = false;
    this.baseDamage = 20;
  }
  update(dt) {
    this.x += this.xVelocity * dt * this.direction;
    this.bulletAnimPlayer.update(dt);
  }
  render(ctx) {
    const img = this.bulletAnimPlayer.getCurrentFrame();
    ctx.drawImage(
      img,
      this.x +
        this.bulletAnim.xOffset +
        this.entity.game.currentMode.camera.camOffsetX,
      this.y +
        this.bulletAnim.yOffset +
        this.entity.game.currentMode.camera.camOffsetY,
    );
    //ctx.strokeStyle = "red";
    //ctx.strokeRect(this.x,this.y,this.w,this.h);
  }
}

class BulletHandeler {
  constructor(entity) {
    this.entity = entity;
    this.bullets = [];
  }
  update(dt) {
    for (const bullet of this.bullets) {
      bullet.update(dt);
      //bullet goes out of bound
      if (!bullet.intersects(this.entity.game.gameRenderingRect)) {
        this.removeBullet(bullet);
      }
      if (this.entity.entityType == EntityType.PLAYER) {
        if (bullet.intersects(this.entity.game.currentMode.robber)) {
          if (!bullet.damageApplied) {
            bullet.damageApplied = true;
            this.entity.game.currentMode.robber.takeDamage(bullet.baseDamage);
            for (let i = 0; i < 25; i++) {
              this.entity.game.currentMode.particleManager.addBloodParticle(
                this.entity.game.currentMode.robber.centerX(),
                this.entity.game.currentMode.robber.centerY() -
                  this.entity.game.currentMode.robber.h * 0.2,
              );
            }
          }
          this.removeBullet(bullet);
        }
      } else if (this.entity.entityType == EntityType.ROBBER) {
        if (bullet.intersects(this.entity.game.currentMode.player)) {
          if (!bullet.damageApplied) {
            bullet.damageApplied = true;
            this.entity.game.currentMode.player.takeDamage();
            for (let i = 0; i < 25; i++) {
              this.entity.game.currentMode.particleManager.addBloodParticle(
                this.entity.game.currentMode.player.centerX(),
                this.entity.game.currentMode.player.centerY() -
                  this.entity.game.currentMode.player.h * 0.2,
              );
            }
          }
          this.removeBullet(bullet);
        }
      }
      //bullet collides with Physics Rect
    }
  }
  render(ctx) {
    for (const bullet of this.bullets) {
      bullet.render(ctx);
    }
  }
  addBullet() {
    let direction = this.entity.flip ? 1 : -1;
    const anim = this.entity.game.assets.bullet;
    this.bullets.push(
      new Bullet(
        this.entity,
        this.entity.centerX(),
        this.entity.centerY() - 15,
        anim.imgs[0].width,
        anim.imgs[0].height / 4,
        direction,
        anim,
      ),
    );
  }
  removeBullet(bullet) {
    let id = this.bullets.indexOf(bullet);
    this.bullets.splice(id, 1);
  }
}

class Player extends PhysicsRect {
  constructor(game, x, y, w, h) {
    super(x, y, w, h);
    this.game = game;
    this.init();
  }
  init() {
    this.entityType = EntityType.PLAYER;
    this.direction = null;
    this.xVelocity = 47; //px per second
    this.yVelocity = 0; //px per second
    this.maxFallVelocity = 900; //px per sec
    this.jumpVelocity = -this.game.currentMode.gravity / 2.2;
    this.runningSpeedFactor = 1;
    this.gunRecoilFactor = 1; // making movement speed slower

    //health dependencies
    this.baseHealth = 100;

    //visuals
    this.img = null;
    this.currentAnimState = PlayerAnimState.IDLE;
    this.newAnimState = null;
    this.animationPlayer = new AnimationPlayer();
    this.animationPlayer.setAnimation(this.game.assets.playerIdle);
    console.log(this.animationPlayer.animation);
    this.flip = false;

    //special effects
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    this.flashColor = "red";
    this.flashColorSwapTime = 0.05;
    this.flashColorSwapTimer = this.flashColorSwapTime; //secs

    //inputs, states and timers
    this.isJumping = false;
    this.isFalling = false;
    this.isRunning = false;
    this.onAir = false;
    this.isAiming = false;
    this.attackHandeled = false;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackTimerStarted = false;
    this.holdAnimation = false;
    this.recoilSlowEffectTimer = 0.2; //sec

    //physics ddependencies
    this.tileCollisionHandeler = new TileCollisionHandeler(this, 32, 32);

    //attack dependencies
    this.bulletHandeler = new BulletHandeler(this);
    this.takingDamage = false;
    this.takingDamageTimer = 0;
  }
  update(dt) {
    // horizontal movement
    let left = this.game.globalInputs.leftPressed ? 1 : 0;
    let right = this.game.globalInputs.rightPressed ? 1 : 0;
    this.direction = right - left;
    if (this.direction != 0) {
      this.flip = this.direction == 1 ? true : false; //true means player is facing right
    }
    if (this.game.globalInputs.shiftPressed && this.direction != 0) {
      this.isRunning = true;
      this.runningSpeedFactor = 2.1;
    } else {
      this.isRunning = false;
      this.runningSpeedFactor = 1;
    }

    this.x =
      this.x +
      this.xVelocity *
        dt *
        this.runningSpeedFactor *
        this.gunRecoilFactor *
        this.direction;

    this.tileCollisionHandeler.updatePhysicsTilesAround();
    this.tileCollisionHandeler.resolveHorizontalCollision();
    //gravity handel
    this.yVelocity += this.game.currentMode.gravity * dt;
    this.y = this.y + this.yVelocity * dt;
    this.yVelocity = Math.min(this.yVelocity, this.maxFallVelocity);
    this.tileCollisionHandeler.updatePhysicsTilesAround();
    this.tileCollisionHandeler.resolveVerticalCollision();
    //collision handel

    //bottom collision
    // if (this.bottom() > this.game.vCanvasH) {
    //   this.y = this.game.vCanvasH - this.h;
    //   this.yVelocity = 0;
    // }
    //jump
    this.onAir = this.yVelocity != 0 ? true : false;
    this.isJumping = this.yVelocity < 0 ? true : false;
    this.isFalling = this.yVelocity > 0 ? true : false;

    if (
      this.game.globalInputs.jumpPressed &&
      !this.game.globalInputs.jumpHandeled
    ) {
      this.game.globalInputs.jumpHandeled = true;
      this.yVelocity = this.jumpVelocity;
    }

    this.isAiming = this.game.globalInputs.aimPressed ? true : false;
    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackTimerStarted = false;
        this.attackTimer = 0;
        this.gunRecoilFactor = 1;
        this.holdAnimation = false;
      }
    }
    if (this.game.globalInputs.attackPressed && !this.attackHandeled) {
      this.attackHandeled = true;
      this.isAttacking = true;
      if (!this.attackTimerStarted) {
        this.attackTimer = this.game.assets.playerFire.animCompletionTime;
        this.attackTimerStarted = true;
        this.gunRecoilFactor = this.isRunning ? 0.5 : 0.8;
        this.bulletHandeler.addBullet();
      }
    }
    this.bulletHandeler.update(dt);

    if (this.takingDamage) {
      this.takingDamageTimer -= dt;
      if (this.takingDamageTimer <= 0) {
        this.takingDamage = false;
      }
      this.flashColorSwapTimer -= dt;
      if (this.flashColorSwapTimer <= 0) {
        this.flashColorSwapTimer = this.flashColorSwapTime;
        if (this.flashColor == "red") {
          this.flashColor = "white";
        } else {
          this.flashColor = "red";
        }
      }
    }

    this.updateAnimationState(dt);

    this.prevX = this.x;
    this.prevY = this.y;
  }
  updateAnimationState(dt) {
    //change state
    if (this.takingDamage) {
      this.newAnimState = PlayerAnimState.HURT;
    } else if (this.isJumping) {
      this.newAnimState = PlayerAnimState.JUMP;
      if (this.isAttacking) {
        if (
          this.currentAnimState == PlayerAnimState.WALK_FIRE ||
          this.currentAnimState == PlayerAnimState.FIRE ||
          this.currentAnimState == PlayerAnimState.RUN_FIRE
        ) {
          this.newAnimState = this.currentAnimState;
        } else {
          this.newAnimState = PlayerAnimState.JUMP_FIRE;
        }
      } else if (this.isAiming) {
        this.newAnimState = PlayerAnimState.JUMP_AIM;
      }
    } else if (this.isFalling) {
      this.newAnimState = PlayerAnimState.FALL;
      if (this.isAttacking) {
        if (this.currentAnimState == PlayerAnimState.JUMP_FIRE) {
          this.newAnimState = PlayerAnimState.JUMP_FIRE;
        } else {
          this.newAnimState = PlayerAnimState.FALL_FIRE;
        }
      } else if (this.isAiming) {
        this.newAnimState = PlayerAnimState.FALL_AIM;
      }
    } else if (this.isRunning) {
      this.newAnimState = PlayerAnimState.RUN;
      if (this.isAttacking) {
        if (this.currentAnimState == PlayerAnimState.FALL_FIRE) {
          this.newAnimState = PlayerAnimState.RUN;
        } else {
          this.newAnimState = PlayerAnimState.RUN_FIRE;
        }
      } else if (this.isAiming) {
        this.newAnimState = PlayerAnimState.RUN_AIM;
      }
    } else if (this.direction != 0) {
      this.newAnimState = PlayerAnimState.WALK;
      if (this.isAttacking && !this.holdAnimation) {
        if (this.currentAnimState == PlayerAnimState.FALL_FIRE) {
          this.newAnimState = PlayerAnimState.WALK;
        } else {
          this.newAnimState = PlayerAnimState.WALK_FIRE;
        }
      } else if (this.isAiming) {
        this.newAnimState = PlayerAnimState.WALK_AIM;
      }
    } else {
      this.newAnimState = PlayerAnimState.IDLE;
      if (this.isAttacking) {
        if (
          this.currentAnimState == PlayerAnimState.FALL_FIRE ||
          this.currentAnimState == PlayerAnimState.JUMP_FIRE
        ) {
          this.newAnimState = PlayerAnimState.IDLE;
        } else {
          this.newAnimState = PlayerAnimState.FIRE;
          this.holdAnimation = true;
        }
      } else if (this.isAiming) {
        this.newAnimState = PlayerAnimState.IDLE_AIM;
      }
    }

    if (this.newAnimState != this.currentAnimState) {
      this.currentAnimState = this.newAnimState;
      switch (this.currentAnimState) {
        case PlayerAnimState.JUMP:
          this.animationPlayer.setAnimation(this.game.assets.playerJump);
          break;
        case PlayerAnimState.FALL:
          this.animationPlayer.setAnimation(this.game.assets.playerFall);
          break;
        case PlayerAnimState.RUN:
          this.animationPlayer.setAnimation(this.game.assets.playerRun);
          break;
        case PlayerAnimState.WALK:
          this.animationPlayer.setAnimation(this.game.assets.playerWalk);
          break;
        case PlayerAnimState.IDLE:
          this.animationPlayer.setAnimation(this.game.assets.playerIdle);
          break;
        case PlayerAnimState.IDLE_AIM:
          this.animationPlayer.setAnimation(this.game.assets.playerAimIdle);
          break;
        case PlayerAnimState.WALK_AIM:
          this.animationPlayer.setAnimation(this.game.assets.playerWalkAim);
          break;
        case PlayerAnimState.RUN_AIM:
          this.animationPlayer.setAnimation(this.game.assets.playerRunAim);
          break;
        case PlayerAnimState.JUMP_AIM:
          this.animationPlayer.setAnimation(this.game.assets.playerJumpAim);
          break;
        case PlayerAnimState.FALL_AIM:
          this.animationPlayer.setAnimation(this.game.assets.playerFallAim);
          break;
        case PlayerAnimState.FIRE:
          this.animationPlayer.setAnimation(this.game.assets.playerFire);
          break;
        case PlayerAnimState.JUMP_FIRE:
          this.animationPlayer.setAnimation(this.game.assets.playerJumpFire);
          break;
        case PlayerAnimState.FALL_FIRE:
          this.animationPlayer.setAnimation(this.game.assets.playerFallFire);
          break;
        case PlayerAnimState.RUN_FIRE:
          this.animationPlayer.setAnimation(this.game.assets.playerRunFire);
        case PlayerAnimState.WALK_FIRE:
          this.animationPlayer.setAnimation(this.game.assets.playerWalkFire);
          break;
        default:
          break;
      }
    }

    this.animationPlayer.update(dt);
  }
  takeDamage() {
    this.takingDamage = true;
    this.takingDamageTimer = 0.2;
  }
  render(ctx) {
    this.img = this.animationPlayer.getCurrentFrame();
    const drawX =
      this.x +
      this.animationPlayer.animation.xOffset +
      this.game.currentMode.camera.camOffsetX;
    const drawY =
      this.y +
      this.animationPlayer.animation.yOffset +
      this.game.currentMode.camera.camOffsetY;
    if (this.img != null) {
      if (this.takingDamage) {
        if (this.flip) {
          ctx.save();
          ctx.translate(drawX + this.img.width, drawY);
          ctx.scale(-1, 1);
          this.renderHurtFlash(ctx, this.img, 0, 0, this.flashColor);
          ctx.restore();
        } else {
          this.renderHurtFlash(ctx, this.img, drawX, drawY, this.flashColor);
        }
      } else if (this.flip) {
        ctx.save();
        ctx.translate(drawX + this.img.width, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(this.img, drawX, drawY);
      }
      //Actual Physical debug rect
      ctx.strokeStyle = "cyan";
      ctx.strokeRect(
        this.x + this.game.currentMode.camera.camOffsetX,
        this.y + this.game.currentMode.camera.camOffsetY,
        this.w,
        this.h,
      );
      //Image debug rect
      // ctx.strokeStyle = "red";
      // ctx.strokeRect(this.x + this.animationPlayer.animation.xOffset, this.y + this.animationPlayer.animation.yOffset,this.img.width,this.img.height);
    } else {
      ctx.fillStyle = "cyan";
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    this.bulletHandeler.render(ctx);
  }
  renderHurtFlash(ctx, img, x, y, flashColor) {
    this.offscreenCanvas.width = img.width;
    this.offscreenCanvas.height = img.height;
    this.offscreenCtx.clearRect(0, 0, img.width, img.height);
    this.offscreenCtx.drawImage(img, 0, 0);

    this.offscreenCtx.globalCompositeOperation = "source-in";
    this.offscreenCtx.fillStyle = flashColor;
    this.offscreenCtx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(this.offscreenCanvas, x, y);
  }
}
class Character extends PhysicsRect {
  constructor(game, x, y, w, h) {
    super(x, y, w, h);
    this.game = game;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.init();
  }
  init() {
    //special effects
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    this.flashColor = "red";

    //visuals
    this.img = null;
    this.currentAnimState = null;
    this.newAnimState = null;
    this.animationPlayer = new AnimationPlayer();
    this.flip = false;
    //physics ddependencies
    this.tileCollisionHandeler = new TileCollisionHandeler(this, 32, 32);
    this.direction = 0;
  }
  applyGravity(dt) {
    this.yVelocity += this.game.currentMode.gravity * dt;
    this.y = this.y + this.yVelocity * dt;
  }
  render(ctx) {
    this.img = this.animationPlayer.getCurrentFrame();
    const drawX =
      this.x +
      this.animationPlayer.animation.xOffset +
      this.game.currentMode.camera.camOffsetX;
    const drawY =
      this.y +
      this.animationPlayer.animation.yOffset +
      this.game.currentMode.camera.camOffsetY;
    if (this.img != null) {
      if (this.takingDamage) {
        if (this.flip) {
          ctx.save();
          ctx.translate(drawX + this.img.width, drawY);
          ctx.scale(-1, 1);
          this.renderHurtFlash(ctx, this.img, 0, 0, this.flashColor);
          ctx.restore();
        } else {
          this.renderHurtFlash(ctx, this.img, drawX, drawY, this.flashColor);
        }
      } else if (this.flip) {
        ctx.save();
        ctx.translate(drawX + this.img.width, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(this.img, drawX, drawY);
      }
      //Actual Physical debug rect
      ctx.strokeStyle = "cyan";
      ctx.strokeRect(
        this.x + this.game.currentMode.camera.camOffsetX,
        this.y + this.game.currentMode.camera.camOffsetY,
        this.w,
        this.h,
      );
      //Image debug rect
      // ctx.strokeStyle = "red";
      // ctx.strokeRect(this.x + this.animationPlayer.animation.xOffset, this.y + this.animationPlayer.animation.yOffset,this.img.width,this.img.height);
    } else {
      ctx.fillStyle = "cyan";
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }
  renderHurtFlash(ctx, img, x, y, flashColor) {
    this.offscreenCanvas.width = img.width;
    this.offscreenCanvas.height = img.height;
    this.offscreenCtx.clearRect(0, 0, img.width, img.height);
    this.offscreenCtx.drawImage(img, 0, 0);

    this.offscreenCtx.globalCompositeOperation = "source-in";
    this.offscreenCtx.fillStyle = flashColor;
    this.offscreenCtx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(this.offscreenCanvas, x, y);
  }
}

const CharacterAnimState = {
  ROBBER_IDLE: "ROBBER_IDLE",
  ROBBER_RUN: "ROBBER_RUN",
  ROBBER_FIRE: "ROBBER_FIRE",
  ROBBER_DEATH: "ROBBER_DEATH",
};

class HealthBarManager {
  constructor(entity, baseHealth) {
    this.entity = entity;
    this.baseHealth = baseHealth;
    this.healthBar = new Rect(0, 0, this.entity.w + 5, 3);
    this.camera = this.entity.game.currentMode.camera;
    this.baseWidth = this.healthBar.w;
  }
  update(dt) {
    this.healthBar.x = this.entity.centerX() - this.baseWidth / 2;
    this.healthBar.y = this.entity.top() - this.healthBar.h - 5;
    this.healthBar.w =
      (this.baseWidth / this.baseHealth) * this.entity.currentHealth;
  }
  render(ctx) {
    if (this.entity.takingDamage) {
      ctx.fillStyle = "white";
    } else {
      ctx.fillStyle = "red";
    }
    ctx.fillRect(
      this.healthBar.x + this.camera.camOffsetX,
      this.healthBar.y + this.camera.camOffsetY,
      this.healthBar.w,
      this.healthBar.h,
    );
    ctx.strokeStyle = "black";
    ctx.strokeRect(
      this.healthBar.x + this.camera.camOffsetX,
      this.healthBar.y + this.camera.camOffsetY,
      this.baseWidth,
      this.healthBar.h,
    );
  }
}
class Robber extends Character {
  constructor(game, x, y, w, h) {
    super(game, x, y, w, h);
    this.currentAnimState = CharacterAnimState.ROBBER_IDLE;
    this.animationPlayer.animation = this.game.assets.robberIdle;
    this.xVelocity = 47 * 2.1;
    this.direction = 1;
    this.isMoving = false;
    this.checkGridX = 0;
    this.checkGridY = 0;
    this.onAir = false;
    this.entityType = EntityType.ROBBER;
    //health
    let baseHealth = 100;
    this.healthBarManager = new HealthBarManager(this, baseHealth);
    this.currentHealth = this.healthBarManager.baseHealth;

    //timers
    this.movingTimer = 0;
    this.isIdle = false;
    this.idleTimer = 5;

    //attack dependencies
    this.playerDetectableRadius = 16; //14 grid block
    //temp code
    let detectW = 32 * this.playerDetectableRadius;
    this.detectRect = new Rect(this.x, this.y, detectW, this.h);
    this.playerDetected = false;
    this.isPatrolling = true;
    this.patrollResetTimer = 0;
    this.isFiring = false;
    this.firingCooldownTimer = 0;
    this.firingAnimTimer = 0;
    this.fireHandeled = false;

    this.bulletHandeler = new BulletHandeler(this);
    this.maxBullets = 4;
    this.bulletsInMag = this.maxBullets;
    this.runningToReload = false;
    this.runningToReloadTimer = 0;

    this.takingDamage = false;
    this.takingDamageTimer = 0;

    this.flashColorSwapTime = 0.05;
    this.flashColorSwapTimer = this.flashColorSwapTime; //secs
  }
  update(dt) {
    //horizontal movement
    this.x += this.xVelocity * this.direction * dt;

    this.onAir = this.yVelocity != 0 ? true : false;
    this.checkGridX = Math.floor(this.x / this.game.currentMode.tileMap.tileW);
    this.checkGridX += this.flip ? 1 : -1;
    this.checkGridY = Math.ceil(
      this.bottom() / this.game.currentMode.tileMap.tileH,
    );
    if (!this.onAir) {
      if (
        !this.game.currentMode.tileMap.checkForPhysicsTile(
          this.checkGridX,
          this.checkGridY,
        )
      ) {
        this.flip = !this.flip;
        this.direction = this.flip ? 1 : -1;
      }
    }
    this.patrollResetTimer = Math.max(this.patrollResetTimer - dt, 0);
    if (this.isPatrolling && this.patrollResetTimer <= 0) {
      if (this.isIdle) {
        this.direction = 0;
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
          this.isIdle = false;
          this.movingTimer = 2;
        }
      } else {
        this.direction = this.flip ? 1 : -1;
        this.movingTimer -= dt;
        if (this.movingTimer <= 0) {
          this.isIdle = true;
          this.idleTimer = 5;
        }
      }
    }

    this.updateGridPos();
    //vertical movement
    this.applyGravity(dt);
    this.tileCollisionHandeler.updatePhysicsTilesAround();
    this.tileCollisionHandeler.resolveVerticalCollision();
    this.updateGridPos();

    this.detectRect.x = this.x - this.detectRect.w / 2;
    this.detectRect.y = this.y;

    //Shooting logic
    if (this.game.currentMode.player.intersects(this.detectRect)) {
      this.playerDetected = true;
      this.isPatrolling = false;
    } else {
      if (this.playerDetected) {
        this.patrollResetTimer = 1;
      }
      this.playerDetected = false;
      this.isPatrolling = true;
    }

    if (this.fireHandeled) {
      this.firingCooldownTimer -= dt;
      this.firingAnimTimer -= dt;
      if (this.firingAnimTimer <= 0) {
        this.isFiring = false;
      }
      if (this.firingCooldownTimer <= 0) {
        this.fireHandeled = false;
        if (this.runningToReload) {
          this.flip = !this.flip;
          this.direction = this.flip ? 1 : -1;
        }
      }
    }
    if (this.playerDetected && !this.runningToReload) {
      this.direction = 0;
      this.flip =
        this.centerX() - this.game.currentMode.player.centerX() <= 0
          ? true
          : false;
      if (!this.fireHandeled && !this.runningToReload) {
        this.fireHandeled = true;
        this.isFiring = true;
        this.firingCooldownTimer =
          this.game.assets.robberFire.animCompletionTime * 3;
        this.firingAnimTimer = this.game.assets.robberFire.animCompletionTime;
        this.bulletHandeler.addBullet();
        this.bulletsInMag -= 1;
        if (this.bulletsInMag <= 0) {
          this.runningToReload = true;
          this.runningToReloadTimer = 4;
        }
      }
    }

    if (this.runningToReload) {
      this.runningToReloadTimer -= dt;
      if (this.runningToReloadTimer <= 0) {
        this.runningToReload = false;
        this.bulletsInMag = this.maxBullets;
      }
    }
    this.isMoving = this.direction != 0 ? true : false;
    this.bulletHandeler.update(dt);
    this.healthBarManager.update(dt);

    //taking damage logic
    if (this.takingDamage) {
      this.takingDamageTimer -= dt;
      if (this.takingDamageTimer <= 0) {
        this.takingDamage = false;
      }
      this.flashColorSwapTimer -= dt;
      if (this.flashColorSwapTimer <= 0) {
        this.flashColorSwapTimer = this.flashColorSwapTime;
        if (this.flashColor == "red") {
          this.flashColor = "white";
        } else {
          this.flashColor = "red";
        }
      }
    }
    this.updateAnimationState();
    this.animationPlayer.update(dt);
  }
  updateAnimationState() {
    if (this.isFiring) {
      this.newAnimState = CharacterAnimState.ROBBER_FIRE;
    } else if (this.isMoving) {
      this.newAnimState = CharacterAnimState.ROBBER_RUN;
    } else {
      this.newAnimState = CharacterAnimState.ROBBER_IDLE;
    }

    if (this.newAnimState != this.currentAnimState) {
      this.currentAnimState = this.newAnimState;
      switch (this.currentAnimState) {
        case CharacterAnimState.ROBBER_RUN:
          this.animationPlayer.setAnimation(this.game.assets.robberRun);
          break;
        case CharacterAnimState.ROBBER_IDLE:
          this.animationPlayer.setAnimation(this.game.assets.robberIdle);
          break;
        case CharacterAnimState.ROBBER_FIRE:
          this.animationPlayer.setAnimation(this.game.assets.robberFire);
          break;
        case CharacterAnimState.ROBBER_DEATH:
          this.animationPlayer.setAnimation(this.game.assets.robberDeath);
          break;
        default:
          break;
      }
    }
  }
  updateGridPos() {
    this.gridX = Math.floor(
      this.centerX() / this.game.currentMode.tileMap.tileW,
    );
    this.gridy = Math.floor(
      this.centerY() / this.game.currentMode.tileMap.tileH,
    );
  }
  takeDamage(damage) {
    this.takingDamage = true;
    this.takingDamageTimer = 0.2;
    this.currentHealth = Math.max(this.currentHealth - damage, 0);
  }
  render(ctx) {
    super.render(ctx);
    //checking tile render
    // ctx.fillStyle = "yellow";
    // ctx.fillRect(
    //   this.checkGridX * 32 + this.game.camera.camOffsetX,
    //   this.checkGridY * 32 + this.game.camera.camOffsetY,
    //   32,
    //   32,
    // );
    ctx.strokeRect(
      this.x + this.game.currentMode.camera.camOffsetX,
      this.y + this.game.currentMode.camera.camOffsetY,
      this.w,
      this.h,
    );
    //detect rect
    // ctx.strokeStyle = "red";
    // ctx.strokeRect(
    //   this.detectRect.x + this.game.camera.camOffsetX,
    //   this.detectRect.y + this.game.camera.camOffsetY,
    //   this.detectRect.w,
    //   this.detectRect.h,
    // );

    this.bulletHandeler.render(ctx);
    this.healthBarManager.render(ctx);
  }
}

class GameInputs {
  constructor() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.jumpPressed = false;
    this.jumpHandeled = false;
    this.enterPressed = false;
    this.shiftPressed = false;
    this.attackPressed = false;
    this.aimPressed = false;
    this.holdUpdate = false;
  }
  reset() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.jumpPressed = false;
    this.jumpHandeled = false;
    this.enterPressed = false;
    this.shiftPressed = false;
    this.attackPressed = false;
    this.aimPressed = false;
    this.holdUpdate = false;
  }
}

class Camera extends Rect {
  constructor(x, y, w, h, game, relativeEntity) {
    super(x, y, w, h);
    this.game = game;
    this.entity = relativeEntity; // entity where thr camera focuses
    this.camOffsetX = 0;
    this.camOffsetY = 0;
    this.xSmoothnessFactor = 4;
    this.ySmoothnessFactor = 4;
  }
  update(dt) {
    this.x += (this.entity.centerX() - this.x) * dt * this.xSmoothnessFactor;
    this.y +=
      (this.entity.centerY() - 30 - this.y) * dt * this.ySmoothnessFactor;
    this.camOffsetX = this.game.vCanvasW / 2 - this.x;
    this.camOffsetY = this.game.vCanvasH / 2 - this.y;

    this.game.gameRenderingRect.x = this.x - this.game.gameRenderingRect.w / 2;
    this.game.gameRenderingRect.y = this.y - this.game.gameRenderingRect.h / 2;
  }
  render(ctx) {
    // ctx.fillStyle = "green";
    // ctx.fillRect(this.x - this.w/2, this.y - this.h/2,this.w,this.h);
  }
}

class PopupCard extends Rect {
  constructor(game, x, y, w, h, cardData) {
    super(x, y, w, h);
    this.game = game;
    this.cardData = cardData;
    this.gap = 100; // gap betn 2 cards
    this.baseDisplacementX = this.w;
    this.displacementX = 0;
    this.animProgress = 0;
  }

  easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  update(dt) {
    this.animProgress = Math.min(1, this.animProgress + dt);
  }

  resetAnim() {
    this.animProgress = 0;
  }

  render(ctx, cardColor, isRight) {
    let gapW = this.gap / 2;
    if (isRight) {
      this.displacementX = 0;
    } else {
      this.displacementX = -this.baseDisplacementX;
      gapW *= -1;
    }

    const eased = this.easeOut(this.animProgress);
    const slideOffset = (1 - eased) * 220;

    const x = this.x + this.displacementX + gapW;
    const y = this.y - this.h / 2 + slideOffset;

    ctx.save();
    ctx.globalAlpha = eased;

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 2;

    // Main card background — tinted with slice color
    ctx.fillStyle = cardColor + "40";
    ctx.strokeStyle = cardColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, this.w, this.h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Color strip at top
    ctx.fillStyle = cardColor;
    ctx.beginPath();
    ctx.roundRect(x, y, this.w, 10, [14, 14, 0, 0]);
    ctx.fill();

    // ==========================
    // BUFF SECTION
    // ==========================

    const buffY = y + 22;

    ctx.fillStyle = "rgba(42,157,143,0.15)";
    ctx.fillRect(x + 10, buffY, this.w - 20, 80);

    ctx.fillStyle = "#2A9D8F";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("BUFF", x + 18, buffY + 18);

    ctx.fillStyle = "#e5ffb9";
    ctx.font = "bold 15px Arial";
    ctx.fillText(this.cardData.buffLabel, x + 18, buffY + 38);

    ctx.fillStyle = "rgb(108, 108, 108)";
    ctx.font = "12px Arial";
    ctx.fillText(this.cardData.buffDetail, x + 18, buffY + 57);

    // ==========================
    // DEBUFF SECTION
    // ==========================

    const debuffY = buffY + 92;

    ctx.fillStyle = "rgba(231,111,81,0.15)";
    ctx.fillRect(x + 10, debuffY, this.w - 20, 80);

    ctx.fillStyle = "#E76F51";
    ctx.font = "bold 11px Arial";
    ctx.fillText("DEBUFF", x + 18, debuffY + 18);

    ctx.fillStyle = "#ffbebe";
    ctx.font = "bold 15px Arial";
    ctx.fillText(this.cardData.debuffLabel, x + 18, debuffY + 38);

    ctx.fillStyle = "rgba(209, 209, 209, 0.74)";
    ctx.font = "12px Arial";
    ctx.fillText(this.cardData.debuffDetail, x + 18, debuffY + 57);

    // Rivets
    const rivets = [
      [x + 12, y + 20],
      [x + this.w - 12, y + 20],
      [x + 12, y + this.h - 12],
      [x + this.w - 12, y + this.h - 12],
    ];
    for (const [rx, ry] of rivets) {
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#D4AF37";
      ctx.fill();
      ctx.strokeStyle = "#5A4200";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
class Wheel {
  constructor(game, x, y, rad) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.rad = rad;
    this.angularVelocity = 0; //Radian per sec
    this.friction = -12; //Radian per sec
    this.angle = 0;
    this.spinVelocity = 55;
    this.partition = 6;
    this.unitPartAngle = (Math.PI * 2) / this.partition;
    this.wheelColours = ["#FF6B6B", "#4ECDC4", "#FFE66D"];

    //pointer
    this.lPointerIndex = null;
    this.rPointerIndex = null;
    this.lPointerAngle = 220; //deg
    this.rPointerAngle = 320;
    //spin
    this.spinHandeled = false;
    this.indexCalculated = false;
    this.spinCoolDownTimer = 0;
    this.spinCoolDownTime = 7;
    //effect
    this.animatingWinnerSection = false;
    this.animatingWinnerSectionTimer = 0;
    this.animatingWinnerSectionTime = 2; //sec
    this.brightening = true;
    this.maxAlpha = 0.5;
    this.alphaIndex = 0;
    this.alphaChangeVelocity = 1.35; //x alpha unit per sec
    //transition
    this.transitionProgress = 0;
    this.inTransition = true;
    this.baseTransitionDisplacement = 300;
    this.slideOffset = 0;
    //popup
    this.popups = [
      new PopupCard(
        this.game,
        this.x,
        this.y,
        180,
        250,
        this.game.cardData.data0,
      ),
      new PopupCard(
        this.game,
        this.x,
        this.y,
        180,
        250,
        this.game.cardData.data1,
      ),
      new PopupCard(
        this.game,
        this.x,
        this.y,
        180,
        250,
        this.game.cardData.data2,
      ),
    ];
  }
  easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  update(dt) {
    if (this.inTransition) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt * 0.7);
      const eased = this.easeOut(this.transitionProgress);
      this.slideOffset = (1 - eased) * this.baseTransitionDisplacement;
    } else {
      this.slideOffset = 0;
    }
    this.angle += this.angularVelocity * dt;
    this.angularVelocity = Math.max(
      this.angularVelocity + this.friction * dt,
      0,
    );
    //spin handel
    if (this.game.globalInputs.attackPressed && !this.spinHandeled) {
      this.spin();
      this.spinHandeled = true;
    }
    //index calculation
    if (
      this.spinHandeled &&
      this.angularVelocity <= 0 &&
      !this.indexCalculated
    ) {
      this.indexCalculated = true;
      this.calculateIndex();
      this.spinCoolDownTimer = this.spinCoolDownTime;
      if (!this.animatingWinnerSection) {
        this.animatingWinnerSection = true;
        this.animatingWinnerSectionTimer = this.animatingWinnerSectionTime;
      }
    }
    //spin cooldown handel
    if (this.indexCalculated) {
      this.spinCoolDownTimer -= dt;
      if (this.spinCoolDownTimer <= 0) {
        this.spinHandeled = false;
        this.indexCalculated = false;
        this.spinCoolDownTimer = 0;
      }
    }
    //winner section flash effect
    if (this.animatingWinnerSection) {
      this.animatingWinnerSectionTimer -= dt;
      if (this.animatingWinnerSectionTimer <= 0) {
        this.animatingWinnerSection = false;
      }
      if (this.brightening) {
        this.alphaIndex = Math.min(
          this.alphaIndex + this.alphaChangeVelocity * dt,
          this.maxAlpha,
        );
        if (this.alphaIndex >= this.maxAlpha) this.brightening = false;
      } else {
        this.alphaIndex = Math.max(
          this.alphaIndex - this.alphaChangeVelocity * dt,
          0,
        );
        if (this.alphaIndex <= 0) this.brightening = true;
      }
    }
    if (
      this.spinHandeled &&
      this.indexCalculated &&
      !this.animatingWinnerSection
    ) {
      this.popups[this.rPointerIndex % 3].update(dt);
      this.popups[this.lPointerIndex % 3].update(dt);
    }
  }
  spin() {
    this.angularVelocity = this.spinVelocity;
  }
  calculateIndex() {
    const wheelDeg =
      ((((this.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * 180) /
      Math.PI;

    this.lPointerIndex = Math.floor(
      ((this.lPointerAngle - wheelDeg + 360) % 360) / 60,
    );

    this.rPointerIndex = Math.floor(
      ((this.rPointerAngle - wheelDeg + 360) % 360) / 60,
    );
    // Reset slide-up animation for both cards
    this.popups[this.lPointerIndex % 3].resetAnim();
    this.popups[this.rPointerIndex % 3].resetAnim();
  }
  render(ctx) {
    ctx.save();

    ctx.translate(this.x, this.y + this.slideOffset);

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;

    ctx.rotate(this.angle);

    // Wheel slices

    for (let i = 0; i < this.partition; i++) {
      const angle = i * this.unitPartAngle;

      const colors = [
        "#E76F51", // coral
        "#2A9D8F", // teal
        "#E9C46A", // gold
      ];

      ctx.fillStyle = colors[i % colors.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.rad, angle, angle + this.unitPartAngle);
      ctx.closePath();

      ctx.fill();

      // Slice borders
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#222";
      ctx.stroke();
    }
    if (this.animatingWinnerSection) {
      this.renderWinnerSectionEffect(ctx);
    }

    // Outer golden rim

    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 0, this.rad, 0, Math.PI * 2);

    ctx.lineWidth = 12;
    ctx.strokeStyle = "#C9A227";
    ctx.stroke();

    // Inner rim

    ctx.beginPath();
    ctx.arc(0, 0, this.rad - 8, 0, Math.PI * 2);

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#FFE08A";
    ctx.stroke();

    // Decorative bolts

    for (let i = 0; i < this.partition; i++) {
      const a = i * this.unitPartAngle;

      const x = Math.cos(a) * (this.rad - 6);
      const y = Math.sin(a) * (this.rad - 6);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);

      ctx.fillStyle = "#D4AF37";
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#5A4200";
      ctx.stroke();
    }
    // Center knob

    const grad = ctx.createRadialGradient(-6, -6, 3, 0, 0, 35);

    grad.addColorStop(0, "#FFE9A8");
    grad.addColorStop(1, "#B8860B");

    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#5A4200";
    ctx.stroke();

    // Inner knob

    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);

    ctx.fillStyle = "#c5af65";
    ctx.fill();
    ctx.restore();

    //pointers
    this.renderPointer(ctx, this.lPointerAngle);
    this.renderPointer(ctx, this.rPointerAngle);

    if (
      this.spinHandeled &&
      this.indexCalculated &&
      !this.animatingWinnerSection
    ) {
      this.renderPopupCard(ctx, (this.rPointerIndex % 3) + 1, true);
      this.renderPopupCard(ctx, (this.lPointerIndex % 3) + 1, false);
    }
  }

  renderPopupCard(ctx, index, isRight) {
    this.popups[index - 1].render(ctx, this.wheelColours[index - 1], isRight);
  }
  renderPointer(ctx, degree) {
    const cx = this.x;
    const cy = this.y + this.slideOffset;

    const pointerDist = this.rad + 12;

    const rad = (degree * Math.PI) / 180;

    // Position on circle
    const x = cx + Math.cos(rad) * pointerDist;
    const y = cy + Math.sin(rad) * pointerDist;

    ctx.save();

    ctx.translate(x, y);

    // Point toward center automatically
    const angleToCenter = Math.atan2(cy - y, cx - x);

    // Triangle is drawn pointing up by default
    ctx.rotate(angleToCenter + Math.PI / 2);

    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    // Gold border
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-22, 12);
    ctx.lineTo(22, 12);
    ctx.closePath();

    ctx.fillStyle = "#D4AF37";
    ctx.fill();

    // Inner red
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-14, 6);
    ctx.lineTo(14, 6);
    ctx.closePath();

    ctx.fillStyle = "#D62828";
    ctx.fill();

    ctx.shadowBlur = 0;

    // Rivet
    ctx.beginPath();
    ctx.arc(0, 8, 6, 0, Math.PI * 2);

    ctx.fillStyle = "#B8860B";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#5A4200";
    ctx.stroke();

    ctx.restore();
  }

  renderWinnerSectionEffect(ctx) {
    ctx.fillStyle = `rgba(255,255,255,${this.alphaIndex})`;
    //right winner section
    //pointer part
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(
      0,
      0,
      this.rad,
      this.rPointerIndex * this.unitPartAngle,
      this.rPointerIndex * this.unitPartAngle + this.unitPartAngle,
    );
    ctx.fill();
    ctx.closePath();

    //pointer bottom part
    ctx.beginPath();
    ctx.moveTo(0, 0);
    let startAngle =
      ((this.rPointerIndex + 3) % this.partition) * this.unitPartAngle;
    ctx.arc(0, 0, this.rad, startAngle, startAngle + this.unitPartAngle);
    ctx.fill();
    ctx.closePath();

    //left winner section
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(
      0,
      0,
      this.rad,
      this.lPointerIndex * this.unitPartAngle,
      this.lPointerIndex * this.unitPartAngle + this.unitPartAngle,
    );
    ctx.fill();
    ctx.closePath();

    //pointer bottom
    ctx.beginPath();
    ctx.moveTo(0, 0);
    startAngle =
      ((this.lPointerIndex + 3) % this.partition) * this.unitPartAngle;
    ctx.arc(0, 0, this.rad, startAngle, startAngle + this.unitPartAngle);
    ctx.fill();
    ctx.closePath();
  }
}

const GameState = {
  LOADING_SCREEN: "LOADING_SCREEN",
  HOME_MENU: "HOME_MENU",
  PLATFORMER: "PLATFORMER",
};

class LoadingScreen {
  constructor(game, backGroundImg) {
    this.modeType = GameState.LOADING_SCREEN;
    this.game = game;
    this.loadingBar = new ProgressBar(
      this.game,
      0,
      0,
      this.game.vCanvasW * 0.6,
      20,
      0.02,
    );
    this.loadingBar.x = this.game.vCanvasW / 2 - this.loadingBar.w / 2;
    this.loadingBar.y = this.game.vCanvasH - this.loadingBar.h - 10;
    this.img = backGroundImg;
    this.inLoadingState = true;
  }
  update(dt) {
    this.loadingBar.update(dt);
    if (this.loadingBar.isDone) {
      console.log(this.game.currentMode);
      this.game.currentMode = new PlatformerMode(this.game);
      this.game.currentMode.init();
      console.log(this.game.currentMode);
    }
  }
  render(ctx) {
    this.loadingBar.render(ctx);
  }
  incrementProgress(progress, info = null) {
    this.loadingBar.incrementProgress(progress);
    if (info) {
      this.loadingBar.changeProgressInfo(info);
    }
  }
}

class EnemyHandeler {
  constructor(mode){
    this.mode = mode;
  }
  update(dt){
    for(const enemy of this.mode.enemies){
      enemy.update(dt);
    }
  }
  render(ctx){
    for(const enemy of this.mode.enemies){
      enemy.render(ctx);
    }
  }
}
class PlatformerMode {
  constructor(game) {
    this.game = game;
    this.initialRenderHoldTimer = 0.3; //sec
    this.renderOnHold = true;
  }
  init() {
    this.modeType = GameState.PLATFORMER;
    this.gravity = 600; //px per sec square
    //entities
    this.playerW = 16;
    this.playerH = 42;
    this.player = new Player(this.game, 20, 20, this.playerW, this.playerH);

    //camera
    this.camera = new Camera(
      this.player.centerX(),
      this.player.centerY(),
      10,
      10,
      this.game,
      this.player,
    );
    //tileMap
    this.tileMap = new TileMap(
      this.game,
      32,
      32,
      this.camera,
      "assets/tileMaps/0.json",
    );
    this.enemies = [];
    this.enemyHandeler = new EnemyHandeler(this);

    this.robber = new Robber(this.game, 70, 20, this.playerW, this.playerH);
    //Managers
    this.particleManager = new ParticleManager(this.game);

    //wheel
    this.wheel = new Wheel(
      this.game,
      this.game.vCanvasW / 2,
      this.game.vCanvasH / 2,
      this.game.vCanvasW * 0.19,
    );
  }
  update(dt) {
    if (this.renderOnHold) {
      this.initialRenderHoldTimer -= dt;
      if (this.initialRenderHoldTimer <= 0) {
        this.renderOnHold = false;
      }
    }
    this.player.update(dt);
    this.camera.update(dt);
    this.tileMap.update(dt);
    this.robber.update(dt);
    this.enemyHandeler.update(dt);
    this.particleManager.update(dt);
  }
  render(ctx) {
    if (this.renderOnHold) {
      return;
    }
    this.tileMap.renderDecors(ctx);
    this.tileMap.renderTiles(ctx);
    this.camera.render(ctx);
    this.robber.render(ctx);
    this.enemyHandeler.render(ctx);
    this.player.render(ctx);
    this.particleManager.render(ctx);
  }
}
class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.canvasW = 1080;
    this.canvasH = 720;
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.vCanvas = document.createElement("canvas");
    this.vCanvasW = this.canvasW / 2;
    this.vCanvasH = this.canvasH / 2;
    this.vCanvas.width = this.vCanvasW;
    this.vCanvas.height = this.vCanvasH;
    this.vCtx = this.vCanvas.getContext("2d");
    this.vCtx.imageSmoothingEnabled = false;
    this.init();
  }
  async init() {
    //game inputs
    this.gameRenderingRect = new Rect(
      -50,
      -50,
      this.vCanvasW + 100,
      this.vCanvasH + 100,
    );
    this.cameraSwapped = false;
    this.globalInputs = new GameInputs();
    this.bindInputs();

    this.currentMode = new LoadingScreen(this, null);
    this.currentMode.incrementProgress(0.2, "loading the img assets");
    //main loop dependenciesa
    this.nowMs = performance.now();
    this.prevMs = this.nowMs;
    this.deltaTime = 0;
    this.gameloop();

    //asset loading
    await this.loadAssets();

    //environment dependencies
    if (this.currentMode.modeType == GameState.LOADING_SCREEN) {
      this.currentMode.incrementProgress(1, "loading the world");
    }
  }
  bindInputs() {
    window.addEventListener("blur", () => {
      this.globalInputs.reset();
    });
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.globalInputs.attackPressed = true;
      } else if (e.button === 2) {
        this.globalInputs.aimPressed = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.globalInputs.attackPressed = false;
        this.currentMode.player.attackHandeled = false;
      } else if (e.button === 2) {
        this.globalInputs.aimPressed = false;
        this.cameraSwapped = false;
      }
    });
    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyA":
          this.globalInputs.leftPressed = true;
          break;
        case "KeyD":
          this.globalInputs.rightPressed = true;
          break;
        case "KeyW":
          this.globalInputs.jumpPressed = true;
          break;

        case "Enter":
          this.globalInputs.enterPressed = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.globalInputs.shiftPressed = true;
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "KeyA":
          this.globalInputs.leftPressed = false;
          break;
        case "KeyD":
          this.globalInputs.rightPressed = false;
          break;
        case "KeyW":
          this.globalInputs.jumpPressed = false;
          this.globalInputs.jumpHandeled = false;
          break;

        case "Enter":
          this.globalInputs.enterPressed = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.globalInputs.shiftPressed = false;
          break;
      }
    });
  }
  async loadAssets() {
    this.loader = new GameImage();
    const [
      playerIdle,
      playerWalk,
      playerJump,
      playerFall,
      playerRun,
      playerAimIdle,
      playerFire,
      playerWalkAim,
      playerJumpAim,
      playerRunAim,
      playerFallAim,
      playerWalkFire,
      playerJumpFire,
      playerFallFire,
      playerRunFire,
      playerHurt,
      bullet,
      robberIdle,
      robberRun,
      robberFire,
      robberDeath,
      grass,
      stone,
      decor,
      largeDecor,
    ] = await Promise.all([
      this.loader.loadImagesFromFolder("assets/male/idle/", 5),
      this.loader.loadImagesFromFolder("assets/male/walk/", 8),
      this.loader.loadImagesFromFolder("assets/male/jump/", 5),
      this.loader.loadImagesFromFolder("assets/male/fall/", 5),
      this.loader.loadImagesFromFolder("assets/male/run/", 8),
      this.loader.loadImagesFromFolder("assets/male/aimIdle/", 5),
      this.loader.loadImagesFromFolder("assets/male/fire/", 5),
      this.loader.loadImagesFromFolder("assets/male/walkAim/", 8),
      this.loader.loadImagesFromFolder("assets/male/jumpAim/", 5),
      this.loader.loadImagesFromFolder("assets/male/runAim/", 8),
      this.loader.loadImagesFromFolder("assets/male/fallAim/", 5),
      this.loader.loadImagesFromFolder("assets/male/walkFire/", 8),
      this.loader.loadImagesFromFolder("assets/male/jumpFire/", 5),
      this.loader.loadImagesFromFolder("assets/male/fallFire/", 5),
      this.loader.loadImagesFromFolder("assets/male/runFire/", 8),
      this.loader.loadImagesFromFolder("assets/male/hurt/", 3),
      this.loader.loadImagesFromFolder("assets/bullet/", 5),
      this.loader.loadImagesFromFolder("assets/robber/idle/", 5),
      this.loader.loadImagesFromFolder("assets/robber/run/", 8),
      this.loader.loadImagesFromFolder("assets/robber/fire/", 5),
      this.loader.loadImagesFromFolder("assets/robber/death/", 8),
      this.loader.loadImagesFromFolder("assets/tiles/grass/", 9),
      this.loader.loadImagesFromFolder("assets/tiles/stone/", 9),
      this.loader.loadImagesFromFolder("assets/tiles/decor/", 4),
      this.loader.loadImagesFromFolder("assets/tiles/largeDecor/", 3),
    ]);
    //images
    this.playerIdle = playerIdle;
    this.playerWalk = playerWalk;
    this.playerJump = playerJump;
    this.playerFall = playerFall;
    this.playerRun = playerRun;
    this.playerAimIdle = playerAimIdle;
    this.playerFire = playerFire;
    this.playerWalkAim = playerWalkAim;
    this.playerJumpAim = playerJumpAim;
    this.playerRunAim = playerRunAim;
    this.playerFallAim = playerFallAim;
    this.playerWalkFire = playerWalkFire;
    this.playerJumpFire = playerJumpFire;
    this.playerFallFire = playerFallFire;
    this.playerRunFire = playerRunFire;
    this.playerHurt = playerHurt;
    this.bullet = bullet;
    this.robberIdle = robberIdle;
    this.robberRun = robberRun;
    this.robberFire = robberFire;
    this.robberDeath = robberDeath;

    if (this.currentMode.modeType == GameState.LOADING_SCREEN) {
      this.currentMode.incrementProgress(0.6, "initializing player");
    }
    this.playerW = 16;
    this.playerH = 42;
    //Animations
    this.assets = {
      playerIdle: new Animation(
        this.playerIdle,
        0.5,
        true,
        this.playerW,
        this.playerH,
      ),
      playerWalk: new Animation(
        this.playerWalk,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerJump: new Animation(
        this.playerJump,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerFall: new Animation(
        this.playerFall,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerRun: new Animation(
        this.playerRun,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerAimIdle: new Animation(
        this.playerAimIdle,
        0.5,
        true,
        this.playerW,
        this.playerH,
      ),
      playerWalkAim: new Animation(
        this.playerWalkAim,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerRunAim: new Animation(
        this.playerRunAim,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerJumpAim: new Animation(
        this.playerJumpAim,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerFallAim: new Animation(
        this.playerFallAim,
        0.65,
        true,
        this.playerW,
        this.playerH,
      ),
      playerFire: new Animation(
        this.playerFire,
        0.5,
        false,
        this.playerW,
        this.playerH,
      ),
      playerRunFire: new Animation(
        this.playerRunFire,
        0.8,
        false,
        this.playerW,
        this.playerH,
      ),
      playerWalkFire: new Animation(
        this.playerWalkFire,
        0.8,
        false,
        this.playerW,
        this.playerH,
      ),
      playerJumpFire: new Animation(
        this.playerJumpFire,
        0.65,
        false,
        this.playerW,
        this.playerH,
      ),
      playerFallFire: new Animation(
        this.playerFallFire,
        0.5,
        false,
        this.playerW,
        this.playerH,
      ),
      playerHurt: new Animation(
        this.playerHurt,
        0.3,
        false,
        this.playerW,
        this.playerH,
      ),
      bullet: new Animation(
        this.bullet,
        0.5,
        true,
        this.bullet[0].width / 2 + 10,
        this.bullet[0].height / 2 + 2,
      ),
      robberIdle: new Animation(
        this.robberIdle,
        0.5,
        true,
        this.playerW,
        this.playerH,
      ),
      robberRun: new Animation(
        this.robberRun,
        0.7,
        true,
        this.playerW,
        this.playerH,
      ),
      robberFire: new Animation(
        this.robberFire,
        0.5,
        false,
        this.playerW,
        this.playerH,
      ),
      robberDeath: new Animation(
        this.robberDeath,
        0.5,
        false,
        this.playerW,
        this.playerH,
      ),
    };
    this.cardData = {
      data0: {
        buffLabel: "nooo",
        buffDetail: "You gain 2X speed",
        debuffLabel: "Stronger Enemies",
        debuffDetail: "Enemy health get 2x more",
      },
      data1: {
        buffLabel: "Speed",
        buffDetail: "You gain 2X speed",
        debuffLabel: "Stronger Enemies",
        debuffDetail: "Enemy health get 2x more",
      },
      data2: {
        buffLabel: "Speed",
        buffDetail: "You gain 2X speed",
        debuffLabel: "Stronger Enemies",
        debuffDetail: "Enemy health get 2x more",
      },
    };
    this.tileVariantRegistry = {
      grass: grass,
      stone: stone,
      decor: decor,
      largeDecor: largeDecor,
    };
  }
  gameloop() {
    //delta time calculation
    this.nowMs = performance.now();
    this.deltaTime = (this.nowMs - this.prevMs) / 1000;
    this.deltaTime = Math.min(this.deltaTime, 0.05);
    this.prevMs = this.nowMs;

    this.update(this.deltaTime);
    this.render(this.vCtx);

    requestAnimationFrame(() => this.gameloop());
  }
  update(dt) {
    this.currentMode.update(dt);
    // if (this.globalInputs.aimPressed && !this.cameraSwapped) {
    //   this.cameraSwapped = true;
    //   if (this.camera.entity.entityType == EntityType.ROBBER) {
    //     this.camera.entity = this.player;
    //   } else {
    //     this.camera.entity = this.robber;
    //   }
    // }
  }
  render(ctx) {
    ctx.clearRect(0, 0, this.vCanvasW, this.vCanvasH);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.vCanvasW, this.vCanvasH);

    this.currentMode.render(ctx);

    //rendering vCtx into ctx
    this.ctx.clearRect(0, 0, 250, 250);
    this.ctx.fillStyle = "grey";
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    this.ctx.drawImage(this.vCanvas, 0, 0, this.canvasW, this.canvasH);
  }
}

const game = new Game();
