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
    FIRE : "FIRE"
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
    constructor(imgArray,animCompletionTime,loop,playerWidth,playerHeight){
        this.imgs = imgArray;
        this.looping = loop;
        this.frames = this.imgs.length;
        this.animCompletionTime = animCompletionTime;
        this.frameTime = this.animCompletionTime/this.frames; //seconds
        this.xOffset = playerWidth/2 - this.imgs[0].width/2;
        this.yOffset = playerHeight - this.imgs[0].height;
    }
}

class AnimationPlayer {
    constructor(){
        this.animation = null;
        this.animTime = 0;
        this.frameTime = 0;
        this.frameIndex = 0;
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

        //physics ddependencies
        this.tileCollisionHandeler = new TileCollisionHandeler(this,32,32);
    }
    update(dt){
        // horizontal movement
        let left = this.game.globalInputs.leftPressed?1:0;
        let right = this.game.globalInputs.rightPressed?1:0;
        this.direction = right-left;
        if(this.direction !=0){
            this.flip = this.direction==1?true:false;
        }
        if(this.game.globalInputs.shiftPressed && this.direction!=0){
            this.isRunning = true;
            this.runningSpeedFactor = 2;
        }else{
            this.isRunning = false;
            this.runningSpeedFactor = 1;
        }

        this.x = this.x + this.xVelocity*dt*this.runningSpeedFactor*this.direction;
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
                this.attackHandeled = false;
                this.isAttacking = false;
                this.attackTimer = 0;
            }
        }
        if(this.game.globalInputs.attackPressed && !this.attackHandeled){
            this.attackHandeled = true;
            this.isAttacking = true;
            this.attackTimer = this.game.assets.playerFire.animCompletionTime;
        }
        this.updateAnimationState(dt);

        this.prevX = this.x;
        this.prevY = this.y;
    }
    updateAnimationState(dt){
        //change state
        if(this.isJumping){
            this.newAnimState = PlayerAnimState.JUMP;
            if(this.isAiming){
                this.newAnimState=PlayerAnimState.JUMP_AIM;
            }
        }else if(this.isFalling){
            this.newAnimState = PlayerAnimState.FALL;
            if(this.isAiming){
                this.newAnimState=PlayerAnimState.FALL_AIM;
            }
        }else if(this.isRunning){
            this.newAnimState = PlayerAnimState.RUN;
            if(this.isAiming){
                this.newAnimState=PlayerAnimState.RUN_AIM;
            }
        }else if(this.direction!=0){
            this.newAnimState = PlayerAnimState.WALK;
            if(this.isAiming){
                this.newAnimState=PlayerAnimState.WALK_AIM;
            }
        }else if(this.isAttacking){
            this.newAnimState = PlayerAnimState.FIRE;
        }else if(this.isAiming){
            this.newAnimState = PlayerAnimState.IDLE_AIM;
        }else{
            this.newAnimState = PlayerAnimState.IDLE;
        }

        if(this.newAnimState!=this.currentAnimState){
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
        this.canvasW = 500;
        this.canvasH = 500;
        this.canvas.width = this.canvasW;
        this.canvas.height = this.canvasH;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;

        this.vCanvas = document.createElement("canvas");
        this.vCanvasW = 250;
        this.vCanvasH = 250;
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
        this.assets = {
            "playerIdle" : new Animation(this.playerIdle,0.5,true,this.playerW,this.playerH),
            "playerWalk" : new Animation(this.playerWalk,0.65,true,this.playerW,this.playerH),
            "playerJump" : new Animation(this.playerJump,0.65,true,this.playerW,this.playerH),
            "playerFall" : new Animation(this.playerFall,0.65,true,this.playerW,this.playerH),
            "playerRun" : new Animation(this.playerRun,0.65,true,this.playerW,this.playerH),
            "playerAimIdle" : new Animation(this.playerAimIdle,0.5,true,this.playerW,this.playerH),
            "playerFire" : new Animation(this.playerFire,0.5,false,this.playerW,this.playerH),
            "playerWalkAim" : new Animation(this.playerWalkAim,0.65,true,this.playerW,this.playerH),
            "playerRunAim" : new Animation(this.playerRunAim,0.65,true,this.playerW,this.playerH),
            "playerJumpAim" : new Animation(this.playerJumpAim,0.65,true,this.playerW,this.playerH),
            "playerFallAim" : new Animation(this.playerFallAim,0.65,true,this.playerW,this.playerH),
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