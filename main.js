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
      }catch {
        console.log("Cannot load the Image :" + path + i +".png");
      }
    }
    return imgs;
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
        this.xVelocity = 200; //px per second
        this.yVelocity = 0; //px per second
        this.jumpVelocity = -this.game.gravity/2;

        //inputs
        this.isJumping = false;
    }
    update(dt){
        // horizontal movement
        let left = this.game.globalInputs.leftPressed?1:0;
        let right = this.game.globalInputs.rightPressed?1:0;
        this.direction = right-left;

        this.x = this.x + this.xVelocity*dt*this.direction;

        //gravity handel
        this.yVelocity += this.game.gravity*dt;
        this.y = this.y + this.yVelocity*dt;

        //collision handel
        //bottom collision
        if(this.bottom()>this.game.canvasH){
            this.y = this.game.canvasH - this.h;
        }
        //jump
        this.isJumping = this.game.globalInputs.jumpPressed;
        if(this.isJumping && !this.game.globalInputs.jumpHandeled){
            this.game.globalInputs.jumpHandeled = true;
            this.yVelocity = this.jumpVelocity;
        }

    }
    render(ctx){
        ctx.fillStyle = "cyan";
        ctx.fillRect(this.x,this.y,this.w,this.h);
    }
}

class GameInputs {
    constructor(){
        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpPressed = false;
        this.jumpHandeled = false;
        this.enterPressed = false;
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
        this.init();
    }
    init(){
        //game inputs
        this.globalInputs = new GameInputs();
        this.bindInputs();

        this.loadAssets();

        //environment dependencies
        this.gravity = 600; //px per sec square
        //entities
        this.player = new Player(this,20,20,25,50);

        //main loop dependencies
        this.nowMs = performance.now();
        this.prevMs = this.nowMs;
        this.deltaTime = 0;
        this.gameloop();
    }
    bindInputs(){
        window.addEventListener("keydown", (e) => {
        switch(e.key){
            case "a":
                this.globalInputs.leftPressed = true;
                break;
            case "d":
                this.globalInputs.rightPressed = true;
                break;
            case "w":
                this.globalInputs.jumpPressed = true;
                break;

            case "Enter":
                this.globalInputs.enterPressed = true;
                break;
            }
        });

        window.addEventListener("keyup", (e) => {
        switch(e.key){
            case "a":
                this.globalInputs.leftPressed = false;
                break;
            case "d":
                this.globalInputs.rightPressed = false;
                break;
            case "w":
                this.globalInputs.jumpPressed = false;
                this.globalInputs.jumpHandeled = false;
                break;

            case "Enter":
                this.globalInputs.enterPressed = false;
                break;
            }
        });
    }
    loadAssets(){
        
    }
    gameloop(){
        //delta time calculation
        this.nowMs = performance.now();
        this.deltaTime = (this.nowMs - this.prevMs) / 1000;
        this.prevMs = this.nowMs;

        this.update(this.deltaTime);
        this.render(this.ctx);

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
    }
}


const game = new Game();