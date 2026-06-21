class Rect {
  constructor(x,y,w,h){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  top(){
    return this.y;
  }
  bottom(){
    return this.y + this.h;
  }
  right(){
    return this.x + this.w;
  }
  left(){
    return this.x;
  }
  centerX(){
    return this.x + (this.w / 2.0);
  }
  centerY(){
    return this.y + (this.h / 2.0);
  }
}

class PhysicsRect extends Rect {
  constructor(x,y,w,h){
    super(x,y,w,h);
    this.prevX = x;
    this.prevY = y;
  }
  intersects(rect){
    return this.right() > rect.left() && this.bottom() > rect.top() &&
    this.left() < rect.right() && this.top() < rect.bottom();
  }
  intersectsPoint(x,y){
    return this.right() > x && this.left() < x && y > this.top() && y < this.bottom();
  }
}
class GameImage {
    loadImage(path){
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
  }
  async loadImagesFromFolder(path,count){
    const imgs = [];
    for(let i=0; i<count; i++){
      try{
        const img = await this.loadImage(path + i +".png");
        imgs.push(img);
      }catch(error) {
        console.log("Cannot load the Image :" + path + i +".png, \nError:- "+error);
      }
    }
    return imgs;
  }
}

const PlayerAnimState = {
    IDLE : "IDLE",
    WALK : "WALK",
    JUMP : "JUMP",
    FALL : "FALL",
    RUN : "RUN",
    IDLE_AIM : "IDLE_AIM",
    WALK_AIM : "WALK_AIM",
    RUN_AIM : "RUN_AIM",
    JUMP_AIM : "JUMP_AIM",
    FALL_AIM : "FALL_AIM",
    FIRE : "FIRE",
    WALK_FIRE : "WALK_FIRE",
    RUN_FIRE : "RUN_FIRE",
    JUMP_FIRE : "JUMP_FIRE",
    FALL_FIRE : "FALL_FIRE"
};

class Tile extends PhysicsRect {
    constructor(x,y,w,h,img){
        super(x,y,w,h);
        this.img = img;
    }
    update(dt){}
    render(ctx){
        ctx.strokeStyle = "cyan";
        ctx.strokeRect(this.x,this.y,this.w,this.h);
    }
}

class TileMap {
    constructor(tileW,tileH){
        this.tileW = tileW;
        this.tileH = tileH;
        this.ongridTiles = new Map();
        this.offGridTiles = new Map();
        for(let i = 0; i<9; i++){
            this.ongridTiles.set(""+i+",6",new Tile(0 + (i*32),6*32,32,32));
        }
        this.onScreenTiles = [];
    }
    render(ctx){
        for (const tile of this.ongridTiles.values()) {
            tile.render(ctx);
        }
    }
}
class Animation {
    constructor(imgArray,animCompletionTime,loop,entityWidth,entityHeight){
        this.imgs = imgArray;
        this.looping = loop;
        this.frames = this.imgs.length;
        this.animCompletionTime = animCompletionTime;
        this.frameTime = this.animCompletionTime/this.frames; //seconds
        this.xOffset = entityWidth/2 - this.imgs[0].width/2;
        this.yOffset = entityHeight - this.imgs[0].height;
    }
}

class AnimationPlayer {
    constructor(){
        this.animation = null;
        this.animTime = 0;
        this.frameTime = 0;
        this.frameIndex = 0;
        this.done = false
    }
    update(dt){
        this.animTime += dt;
        this.frameTime += dt;
        if(this.frameTime >= this.animation.frameTime){
            this.frameTime -= this.animation.frameTime;
            if(this.animation.looping){
                this.frameIndex = (this.frameIndex + 1)% this.animation.frames;
            }else{
                this.frameIndex = Math.min(this.frameIndex+1,this.animation.frames-1);
                this.done = true;
            }
        }
    }
    getCurrentFrame(){
        return this.animation.imgs[this.frameIndex];
    }
    setAnimation(anim){
        this.reset();
        this.animation = anim;
    }
    reset(){
        this.animTime = 0;
        this.frameTime = 0;
        this.frameIndex = 0;
    }
}

class TileCollisionHandeler {
    constructor(entity,tileW,tileH){
        this.entity = entity;
        this.tileW = tileW;
        this.tileH = tileH;
        this.physicsRectAround = [];
    }
    resolveHorizontalCollision(){
        for(const tile of this.physicsRectAround){
            if(tile.intersects(this.entity)){
                //horisontal resolve
                if(this.entity.direction==1){
                    this.entity.x = tile.left() - this.entity.w;
                    console.log(tile.x+","+tile.y+"resolved to right");
                }else if(this.entity.direction==-1){
                    this.entity.x = tile.right();
                    console.log(tile.x+","+tile.y+"resolved to left");
                }
            }
        }
    }
    resolveVerticalCollision(){
        for(const tile of this.physicsRectAround){
            if(tile.intersects(this.entity)){
                //vertical resolve
                if(this.entity.yVelocity>0){
                    this.entity.y = tile.top() - this.entity.h;
                    this.entity.yVelocity = 0;
                }else if(this.entity.yVelocity<0){
                    this.entity.y = tile.bottom();
                    this.entity.yVelocity = 0;
                }
            }
        }
    }
    updatePhysicsTilesAround(){
        this.physicsRectAround = [];
        let gridLeft = Math.floor(this.entity.left()/this.tileW);
        let gridRight = Math.ceil(this.entity.right()/this.tileW);
        let gridTop = Math.floor(this.entity.top()/this.tileH);
        let gridBottom = Math.ceil(this.entity.bottom()/this.tileH);
        for(let i=gridLeft; i<=gridRight; i++){
            for(let j=gridTop; j<=gridBottom; j++){
                const tile = this.entity.game.tileMap.ongridTiles.get(`${i},${j}`);
                if(tile!=null){
                    this.physicsRectAround.push(tile);
                }
            }
        }
    }
}

class Bullet extends PhysicsRect {
    constructor(entity,x,y,w,h,direction,anim){
        super(x,y,w,h);
        this.entity = entity;
        this.direction = direction;
        this.xVelocity = 800; //px per second
        this.bulletAnim = anim;
        this.bulletAnimPlayer = new AnimationPlayer();
        this.bulletAnimPlayer.animation = this.bulletAnim;
    }
    update(dt){
        this.x += this.xVelocity * dt * this.direction;
        this.bulletAnimPlayer.update(dt);
    }
    render(ctx){
        const img = this.bulletAnimPlayer.getCurrentFrame();
        ctx.drawImage(img,this.x+this.bulletAnim.xOffset,this.y+this.bulletAnim.yOffset);
        //ctx.strokeStyle = "red";
        //ctx.strokeRect(this.x,this.y,this.w,this.h);
    }
}

class BulletHandeler {
    constructor(entity){
        this.entity = entity;
        this.bullets = [];
    }
    update(dt){
        for(const bullet of this.bullets){
            bullet.update(dt);
        }
    }
    render(ctx){
        for(const bullet of this.bullets){
            bullet.render(ctx);
        }
    }
    addBullet(){
        let direction = this.entity.flip?1:-1;
        const anim = this.entity.game.assets.bullet;
        this.bullets.push(new Bullet(this.entity,this.entity.centerX(),this.entity.centerY()-15,anim.imgs[0].width,anim.imgs[0].height/4,direction,anim));
    }
}
class Player extends PhysicsRect{
    constructor(game,x,y,w,h){
        super(x,y,w,h);
        this.game = game;
        this.init();
    }
    init(){
        this.direction = null;
        this.xVelocity = 47; //px per second
        this.yVelocity = 0; //px per second
        this.jumpVelocity = -this.game.gravity/2.2;
        this.runningSpeedFactor = 1;
        this.gunRecoilFactor = 1; // making movement speed slower

        //visuals
        this.img = this.game.playerIdle[2];
        this.currentAnimState = PlayerAnimState.IDLE;
        this.newAnimState = null;
        this.animationPlayer = new AnimationPlayer();
        this.animationPlayer.setAnimation(this.game.assets.playerIdle);
        this.flip = false;

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
        this.tileCollisionHandeler = new TileCollisionHandeler(this,32,32);

        //attack dependencies
        this.bulletHandeler = new BulletHandeler(this);
    }
    update(dt){
        // horizontal movement
        let left = this.game.globalInputs.leftPressed?1:0;
        let right = this.game.globalInputs.rightPressed?1:0;
        this.direction = right-left;
        if(this.direction !=0){
            this.flip = this.direction==1?true:false; //true means player is facing right
        }
        if(this.game.globalInputs.shiftPressed && this.direction!=0){
            this.isRunning = true;
            this.runningSpeedFactor = 2;
        }else{
            this.isRunning = false;
            this.runningSpeedFactor = 1;
        }

        this.x = this.x + this.xVelocity*dt*this.runningSpeedFactor*this.gunRecoilFactor*this.direction;
        this.tileCollisionHandeler.updatePhysicsTilesAround();
        this.tileCollisionHandeler.resolveHorizontalCollision();
        //gravity handel
        this.yVelocity += this.game.gravity*dt;
        this.y = this.y + this.yVelocity*dt;
        this.tileCollisionHandeler.updatePhysicsTilesAround();
        this.tileCollisionHandeler.resolveVerticalCollision();
        //collision handel
        
        //bottom collision
        if(this.bottom()>this.game.vCanvasH){
            this.y = this.game.vCanvasH - this.h;
            this.yVelocity = 0;
        }
        //jump
        this.onAir = this.yVelocity!=0?true:false;
        this.isJumping = this.yVelocity<0?true:false;
        this.isFalling = this.yVelocity>0?true:false;

        if(this.game.globalInputs.jumpPressed && !this.game.globalInputs.jumpHandeled){
            this.game.globalInputs.jumpHandeled = true;
            this.yVelocity = this.jumpVelocity;
        }

        this.isAiming = this.game.globalInputs.aimPressed?true:false;
        if(this.isAttacking){
            this.attackTimer-=dt;
            if(this.attackTimer<=0){
                this.isAttacking = false;
                this.attackTimerStarted = false;
                this.attackTimer = 0;
                this.gunRecoilFactor = 1;
                this.holdAnimation = false;
            }
        }
        if(this.game.globalInputs.attackPressed && !this.attackHandeled){
            this.attackHandeled = true;
            this.isAttacking = true;
            if(!this.attackTimerStarted){
                this.attackTimer = this.game.assets.playerFire.animCompletionTime;
                this.attackTimerStarted = true;
                this.gunRecoilFactor = this.isRunning?0.5:0.8;
                this.bulletHandeler.addBullet();
            }
        }
        this.bulletHandeler.update(dt);
        this.updateAnimationState(dt);

        this.prevX = this.x;
        this.prevY = this.y;
    }
    updateAnimationState(dt){
        //change state
        if(this.isJumping){
            this.newAnimState = PlayerAnimState.JUMP;
            if(this.isAttacking){
                if(this.currentAnimState==PlayerAnimState.WALK_FIRE || this.currentAnimState==PlayerAnimState.FIRE||this.currentAnimState==PlayerAnimState.RUN_FIRE){
                    this.newAnimState=this.currentAnimState;
                }else{
                    this.newAnimState=PlayerAnimState.JUMP_FIRE;
                }
            }else if(this.isAiming){
                this.newAnimState=PlayerAnimState.JUMP_AIM;
            }
        }else if(this.isFalling){
            this.newAnimState = PlayerAnimState.FALL;
            if(this.isAttacking){
                if(this.currentAnimState==PlayerAnimState.JUMP_FIRE){
                    this.newAnimState=PlayerAnimState.JUMP_FIRE;
                }else{
                    this.newAnimState=PlayerAnimState.FALL_FIRE;
                }
            }else if(this.isAiming){
                this.newAnimState=PlayerAnimState.FALL_AIM;
            }
        }else if(this.isRunning){
            this.newAnimState = PlayerAnimState.RUN;
            if(this.isAttacking){
                if(this.currentAnimState==PlayerAnimState.FALL_FIRE){
                    this.newAnimState=PlayerAnimState.RUN;
                }else{
                    this.newAnimState=PlayerAnimState.RUN_FIRE;
                }
            }else if(this.isAiming){
                this.newAnimState=PlayerAnimState.RUN_AIM;
            }
        }else if(this.direction!=0){
            this.newAnimState = PlayerAnimState.WALK;
            if(this.isAttacking && !this.holdAnimation){
                if(this.currentAnimState==PlayerAnimState.FALL_FIRE){
                    this.newAnimState=PlayerAnimState.WALK;
                }else{
                    this.newAnimState=PlayerAnimState.WALK_FIRE;
                }
            }else if(this.isAiming){
                this.newAnimState=PlayerAnimState.WALK_AIM;
            }
        }else{
            this.newAnimState = PlayerAnimState.IDLE;
            if(this.isAttacking){
                if(this.currentAnimState==PlayerAnimState.FALL_FIRE || this.currentAnimState==PlayerAnimState.JUMP_FIRE){
                    this.newAnimState=PlayerAnimState.IDLE;
                }else{
                    this.newAnimState = PlayerAnimState.FIRE;
                    this.holdAnimation = true;
                }
            }else if(this.isAiming){
                this.newAnimState = PlayerAnimState.IDLE_AIM;
            }
        }

        if(this.newAnimState!=this.currentAnimState){
            console.log(this.newAnimState);
            this.currentAnimState = this.newAnimState;
            switch(this.currentAnimState){
                case(PlayerAnimState.JUMP):
                    this.animationPlayer.setAnimation(this.game.assets.playerJump);
                    break;
                case(PlayerAnimState.FALL):
                    this.animationPlayer.setAnimation(this.game.assets.playerFall);
                    break;
                case(PlayerAnimState.RUN):
                    this.animationPlayer.setAnimation(this.game.assets.playerRun);
                    break;
                case(PlayerAnimState.WALK):
                    this.animationPlayer.setAnimation(this.game.assets.playerWalk);
                    break;
                case(PlayerAnimState.IDLE):
                    this.animationPlayer.setAnimation(this.game.assets.playerIdle);
                    break;
                case(PlayerAnimState.IDLE_AIM):
                    this.animationPlayer.setAnimation(this.game.assets.playerAimIdle);
                    break;
                case(PlayerAnimState.WALK_AIM):
                    this.animationPlayer.setAnimation(this.game.assets.playerWalkAim);
                    break;
                case(PlayerAnimState.RUN_AIM):
                    this.animationPlayer.setAnimation(this.game.assets.playerRunAim);
                    break;
                case(PlayerAnimState.JUMP_AIM):
                    this.animationPlayer.setAnimation(this.game.assets.playerJumpAim);
                    break;
                case(PlayerAnimState.FALL_AIM):
                    this.animationPlayer.setAnimation(this.game.assets.playerFallAim);
                    break;
                case(PlayerAnimState.FIRE):
                    this.animationPlayer.setAnimation(this.game.assets.playerFire);
                    break;
                case(PlayerAnimState.JUMP_FIRE):
                    this.animationPlayer.setAnimation(this.game.assets.playerJumpFire);
                    break;
                case(PlayerAnimState.FALL_FIRE):
                    this.animationPlayer.setAnimation(this.game.assets.playerFallFire);
                    break;
                case(PlayerAnimState.RUN_FIRE):
                    this.animationPlayer.setAnimation(this.game.assets.playerRunFire);
                case(PlayerAnimState.WALK_FIRE):
                    this.animationPlayer.setAnimation(this.game.assets.playerWalkFire);
                    break;
                    break;
                default:
                    break;
            }
        }
        
        this.animationPlayer.update(dt);
    }
    render(ctx){
        this.img = this.animationPlayer.getCurrentFrame();
        if(this.img!=null){
            if (this.flip) {
                ctx.save();
                ctx.translate(this.x + this.img.width + this.animationPlayer.animation.xOffset, this.y + this.animationPlayer.animation.yOffset);
                ctx.scale(-1, 1);
                ctx.drawImage(this.img, 0, 0);
                ctx.restore();
            } else {
                ctx.drawImage(this.img, this.x + this.animationPlayer.animation.xOffset, this.y + this.animationPlayer.animation.yOffset);
            }
            //Actual Physical debug rect
            ctx.strokeStyle = "cyan";
            ctx.strokeRect(this.x,this.y,this.w,this.h);
            //Image debug rect
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.x + this.animationPlayer.animation.xOffset, this.y + this.animationPlayer.animation.yOffset,this.img.width,this.img.height);
        }else{
            ctx.fillStyle = "cyan";
            ctx.fillRect(this.x,this.y,this.w,this.h);
        }
        ctx.fillStyle = "red";
        for(const tile of this.tileCollisionHandeler.physicsRectAround){
            ctx.fillRect(tile.x,tile.y,tile.w,tile.h);
        }
        this.bulletHandeler.render(ctx);
        
    }
}

class GameInputs {
    constructor(){
        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpPressed = false;
        this.jumpHandeled = false;
        this.enterPressed = false;
        this.shiftPressed = false;
        this.attackPressed = false;
        this.aimPressed = false;
    }
}

class Game {
    constructor(){
        this.canvas = document.getElementById("game");
        this.canvasW = 1080;
        this.canvasH = 720;
        this.canvas.width = this.canvasW;
        this.canvas.height = this.canvasH;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;

        this.vCanvas = document.createElement("canvas");
        this.vCanvasW = this.canvasW/2;
        this.vCanvasH = this.canvasH/2;
        this.vCanvas.width = this.vCanvasW;
        this.vCanvas.height = this.vCanvasH;
        this.vCtx = this.vCanvas.getContext("2d");
        this.vCtx.imageSmoothingEnabled = false;
        this.init();
    }
    async init(){
        //game inputs
        this.globalInputs = new GameInputs();
        this.bindInputs();
        this.playerW = 16;
        this.playerH = 42;
        await this.loadAssets();

        //environment dependencies
        this.gravity = 600; //px per sec square
        this.tileMap = new TileMap(32,32);


        //entities
        this.player = new Player(this,20,20,this.playerW,this.playerH);

        //main loop dependencies
        this.nowMs = performance.now();
        this.prevMs = this.nowMs;
        this.deltaTime = 0;
        this.gameloop();
    }
    bindInputs(){
        window.addEventListener("contextmenu", (e) => {e.preventDefault();});
        window.addEventListener("mousedown", (e) => {
            if(e.button===0){
                this.globalInputs.attackPressed = true;
            }else if(e.button ===2){
                this.globalInputs.aimPressed = true;
            }
        });
        window.addEventListener("mouseup", (e) => {
            if(e.button===0){
                this.globalInputs.attackPressed = false;
                this.player.attackHandeled = false;
            }else if(e.button ===2){
                this.globalInputs.aimPressed = false;
            }
        });
        window.addEventListener("keydown", (e) => {
        switch(e.code){
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
        switch(e.code){
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
    async loadAssets(){
        this.loader = new GameImage();
        this.playerIdle = await this.loader.loadImagesFromFolder("assets/male/idle/",5);
        this.playerWalk = await this.loader.loadImagesFromFolder("assets/male/walk/",8);
        this.playerJump = await this.loader.loadImagesFromFolder("assets/male/jump/",5);
        this.playerFall = await this.loader.loadImagesFromFolder("assets/male/fall/",5);
        this.playerRun = await this.loader.loadImagesFromFolder("assets/male/run/",8);
        this.playerAimIdle = await this.loader.loadImagesFromFolder("assets/male/aimIdle/",5);
        this.playerFire = await this.loader.loadImagesFromFolder("assets/male/fire/",5);
        this.playerWalkAim = await this.loader.loadImagesFromFolder("assets/male/walkAim/",8);
        this.playerJumpAim = await this.loader.loadImagesFromFolder("assets/male/jumpAim/",5);
        this.playerRunAim = await this.loader.loadImagesFromFolder("assets/male/runAim/",8);
        this.playerFallAim = await this.loader.loadImagesFromFolder("assets/male/fallAim/",5);
        this.playerWalkFire = await this.loader.loadImagesFromFolder("assets/male/walkFire/",8);
        this.playerJumpFire = await this.loader.loadImagesFromFolder("assets/male/jumpFire/",5);
        this.playerFallFire = await this.loader.loadImagesFromFolder("assets/male/fallFire/",5);
        this.playerRunFire = await this.loader.loadImagesFromFolder("assets/male/runFire/",8);
        this.bullet = await this.loader.loadImagesFromFolder("assets/bullet/",5);
        this.assets = {
            "playerIdle" : new Animation(this.playerIdle,0.5,true,this.playerW,this.playerH),
            "playerWalk" : new Animation(this.playerWalk,0.65,true,this.playerW,this.playerH),
            "playerJump" : new Animation(this.playerJump,0.65,true,this.playerW,this.playerH),
            "playerFall" : new Animation(this.playerFall,0.65,true,this.playerW,this.playerH),
            "playerRun" : new Animation(this.playerRun,0.65,true,this.playerW,this.playerH),
            "playerAimIdle" : new Animation(this.playerAimIdle,0.5,true,this.playerW,this.playerH),
            "playerWalkAim" : new Animation(this.playerWalkAim,0.65,true,this.playerW,this.playerH),
            "playerRunAim" : new Animation(this.playerRunAim,0.65,true,this.playerW,this.playerH),
            "playerJumpAim" : new Animation(this.playerJumpAim,0.65,true,this.playerW,this.playerH),
            "playerFallAim" : new Animation(this.playerFallAim,0.65,true,this.playerW,this.playerH),
            "playerFire" : new Animation(this.playerFire,0.5,false,this.playerW,this.playerH),
            "playerRunFire" : new Animation(this.playerRunFire,0.8,false,this.playerW,this.playerH),
            "playerWalkFire" : new Animation(this.playerWalkFire,0.8,false,this.playerW,this.playerH),
            "playerJumpFire" : new Animation(this.playerJumpFire,0.65,false,this.playerW,this.playerH),
            "playerFallFire" : new Animation(this.playerFallFire,0.5,false,this.playerW,this.playerH),
            "bullet" : new Animation(this.bullet,0.5,true,this.bullet[0].width/2 + 10,this.bullet[0].height/2 + 2),
        }
    }
    gameloop(){
        //delta time calculation
        this.nowMs = performance.now();
        this.deltaTime = (this.nowMs - this.prevMs) / 1000;
        this.prevMs = this.nowMs;

        this.update(this.deltaTime);
        this.render(this.vCtx);

        requestAnimationFrame(() => this.gameloop());
    }
    update(dt){
        this.player.update(dt);
    }
    render(ctx){
        ctx.clearRect(0,0,this.canvasW,this.canvasH);
        ctx.fillStyle = "black";
        ctx.fillRect(0,0,this.canvasW,this.canvasH);
        this.player.render(ctx);
        this,this.tileMap.render(ctx);

        //rendering vCtx into ctx
        this.ctx.clearRect(0,0,250,250);
        this.ctx.fillStyle = "grey";
        this.ctx.fillRect(0,0,this.canvasW,this.canvasH);
        this.ctx.drawImage(this.vCanvas,0,0,this.canvasW,this.canvasH);
    }
}

const game = new Game();