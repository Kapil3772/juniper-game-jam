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
    RUN : "RUN"
};
class Animation {
    constructor(imgArray,animCompletionTime,loop){
        this.imgs = imgArray;
        this.looping = loop;
        this.frames = this.imgs.length;
        this.animCompletionTime = animCompletionTime;
        this.frameTime = this.animCompletionTime/this.frames; //seconds
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

        //inputs and states
        this.isJumping = false;
        this.isFalling = false;
        this.isRunning = false;
        this.onAir = false;
    }
    update(dt){
        // horizontal movement
        let left = this.game.globalInputs.leftPressed?1:0;
        let right = this.game.globalInputs.rightPressed?1:0;
        console.log(right);
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

        //gravity handel
        this.yVelocity += this.game.gravity*dt;
        this.y = this.y + this.yVelocity*dt;

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

        this.updateAnimationState(dt);

    }
    updateAnimationState(dt){
        //change state
        if(this.isJumping){
            this.newAnimState = PlayerAnimState.JUMP;
        }else if(this.isFalling){
            this.newAnimState = PlayerAnimState.FALL;
        }else if(this.isRunning){
            this.newAnimState = PlayerAnimState.RUN;
        }else if(this.direction!=0){
            this.newAnimState = PlayerAnimState.WALK;
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
                ctx.translate(this.x + this.img.width, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(this.img, 0, 0);
                ctx.restore();
            } else {
                ctx.drawImage(this.img, this.x, this.y);
            }
            ctx.strokeStyle = "cyan";
            ctx.strokeRect(this.x,this.y,this.w,this.h);
        }else{
            ctx.fillStyle = "cyan";
            ctx.fillRect(this.x,this.y,this.w,this.h);
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

        await this.loadAssets();

        //environment dependencies
        this.gravity = 600; //px per sec square
        //entities
        this.player = new Player(this,20,20,64,64);

        //main loop dependencies
        this.nowMs = performance.now();
        this.prevMs = this.nowMs;
        this.deltaTime = 0;
        this.gameloop();
    }
    bindInputs(){
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
        this.assets = {
            "playerIdle" : new Animation(this.playerIdle,0.5,true),
            "playerWalk" : new Animation(this.playerWalk,0.65,true),
            "playerJump" : new Animation(this.playerJump,0.65,true),
            "playerFall" : new Animation(this.playerFall,0.65,true),
            "playerRun" : new Animation(this.playerRun,0.65,true)
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

        //rendering vCtx into ctx
        this.ctx.clearRect(0,0,250,250);
        this.ctx.drawImage(this.vCanvas,0,0,this.vCanvasW*2,this.vCanvasH*2);
    }
}


const game = new Game();