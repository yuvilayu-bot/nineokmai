
const screens={
  select:document.getElementById('select'),
  game:document.getElementById('game'),
  over:document.getElementById('over')
};

const ratios={"1": 0.412292817679558, "2": 0.4284712482468443, "3": 0.4160224877020379, "4": 0.4182076813655761};
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
const cards=[...document.querySelectorAll('.card')];
const nameEl=document.getElementById('name');
const scoreEl=document.getElementById('score');
const finalEl=document.getElementById('final');
const fallen=document.getElementById('fallen');

const bg=new Image();
bg.src='assets/bg.jpg';

const bushImg=new Image();
bushImg.src='assets/bush.png';

const playerImgs=[1,2,3,4].map(n=>{
  const img=new Image();
  img.src=`assets/player${n}.png`;
  return img;
});

let selected=0;
let running=false;
let score=0;
let speed=6;
let player;
let bushes=[];
let lastSpawn=0;
let lastTime=0;
let bgOffset=0;
let raf=0;

function show(id){
  Object.entries(screens).forEach(([key,el])=>el.classList.toggle('active',key===id));
}

function fitCanvas(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.floor(innerWidth*dpr);
  canvas.height=Math.floor(innerHeight*dpr);
  canvas.style.width=innerWidth+'px';
  canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',fitCanvas);
fitCanvas();

cards.forEach(card=>{
  card.addEventListener('click',()=>{
    selected=Number(card.dataset.i);
    cards.forEach(c=>c.classList.toggle('selected',c===card));
  });
});

const aboutOverlay=document.getElementById('aboutOverlay');
document.getElementById('aboutButton').addEventListener('click',()=>{
  aboutOverlay.classList.add('visible');
  aboutOverlay.setAttribute('aria-hidden','false');
});
document.getElementById('aboutClose').addEventListener('click',closeAbout);
aboutOverlay.addEventListener('pointerdown',e=>{
  if(e.target===aboutOverlay)closeAbout();
});
function closeAbout(){
  aboutOverlay.classList.remove('visible');
  aboutOverlay.setAttribute('aria-hidden','true');
}

document.getElementById('start').addEventListener('click',()=>{
  nameEl.textContent=`PLAYER ${selected+1}`;
  show('game');
  resetGame();
  startGame();
});

function resetGame(){
  cancelAnimationFrame(raf);
  running=false;
  score=0;
  speed=6;
  bushes=[];
  lastSpawn=0;
  lastTime=0;
  bgOffset=0;

  const naturalRatio=ratios[selected+1];
  const h=Math.max(135,Math.min(220,innerHeight*.22));
  const w=h*naturalRatio;

  player={
    x:innerWidth*.12,
    y:innerHeight*.74,
    w,
    h,
    vy:0,
    onGround:true
  };
  scoreEl.textContent='000000';
}

function startGame(){
  running=true;
  lastTime=performance.now();
  raf=requestAnimationFrame(loop);
}

function jump(){
  if(!running)return;
  if(player.onGround){
    player.vy=-16;
    player.onGround=false;
  }
}

document.getElementById('jump').addEventListener('click',jump);
canvas.addEventListener('pointerdown',jump);
document.addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'){
    e.preventDefault();
    jump();
  }
});

document.getElementById('back').addEventListener('click',()=>{
  cancelAnimationFrame(raf);
  running=false;
  show('select');
});

document.getElementById('again').addEventListener('click',()=>{
  show('game');
  resetGame();
  startGame();
});

document.getElementById('quit').addEventListener('click',()=>show('select'));

function spawnBush(){
  const size=Math.max(74,Math.min(112,innerWidth*.085));
  bushes.push({
    x:innerWidth+size,
    y:innerHeight*.765-size*.75,
    w:size,
    h:size,
    scale:.9+Math.random()*.18
  });
}

function collide(a,b){
  return a.x<b.x+b.w &&
         a.x+a.w>b.x &&
         a.y<b.y+b.h &&
         a.y+a.h>b.y;
}

function endGame(){
  running=false;
  fallen.src=`assets/player${selected+1}.png`;
  finalEl.textContent=String(Math.floor(score)).padStart(6,'0');
  show('over');
}



function drawCloud(x,y,s){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);
  ctx.fillStyle='rgba(255,255,255,.72)';
  ctx.beginPath();
  ctx.arc(0,18,24,0,Math.PI*2);
  ctx.arc(28,6,32,0,Math.PI*2);
  ctx.arc(63,19,25,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawRollingGrass(offset,groundY){
  const hillWidth=220;
  const hillHeight=18;
  const phase=((offset%hillWidth)+hillWidth)%hillWidth;

  ctx.fillStyle='#40905A';
  ctx.beginPath();
  ctx.moveTo(0,innerHeight);

  // Alternates between flat ground and small rounded hills.
  let x=-phase-hillWidth;
  ctx.lineTo(x,groundY);
  while(x<innerWidth+hillWidth){
    ctx.lineTo(x+55,groundY); // flat section
    ctx.quadraticCurveTo(
      x+110,groundY-hillHeight,
      x+165,groundY
    ); // small hill
    ctx.lineTo(x+hillWidth,groundY); // flat section
    x+=hillWidth;
  }

  ctx.lineTo(innerWidth,innerHeight);
  ctx.closePath();
  ctx.fill();

  // Subtle moving grass marks for stronger motion.
  ctx.strokeStyle='rgba(34,113,67,.48)';
  ctx.lineWidth=2;
  const spacing=30;
  for(let gx=(offset%spacing)-spacing;gx<innerWidth+spacing;gx+=spacing){
    ctx.beginPath();
    ctx.moveTo(gx,groundY+14);
    ctx.quadraticCurveTo(gx+4,groundY+2,gx+8,groundY-4);
    ctx.moveTo(gx+9,groundY+14);
    ctx.quadraticCurveTo(gx+12,groundY+3,gx+16,groundY-2);
    ctx.stroke();
  }
}

function drawBackground(dt){
  const groundY=innerHeight*.765;
  const ratio=bg.width/bg.height;
  const drawH=innerHeight;
  const drawW=drawH*ratio;

  // Base background: nearly static.
  bgOffset-=speed*.04*dt;
  if(bgOffset<=-drawW)bgOffset+=drawW;

  for(let x=bgOffset-drawW;x<innerWidth+drawW;x+=drawW){
    ctx.drawImage(bg,x,0,drawW,drawH);
  }

  // Clouds — slowest layer.
  const cloudOffset=(score*.13)%(innerWidth+260);
  drawCloud(innerWidth-cloudOffset,innerHeight*.17,1);
  drawCloud(innerWidth*.48-cloudOffset*.45,innerHeight*.28,.72);
  drawCloud(innerWidth*1.35-cloudOffset*.7,innerHeight*.11,.85);

  // Curved grass — fastest layer.
  drawRollingGrass(-(score*1.75),groundY);
}

function drawPlayer(dt){
  const groundY=innerHeight*.765;
  const groundPlayerY=groundY-player.h*.96;

  player.vy+=.86*dt;
  player.y+=player.vy*dt;

  if(player.y>=groundPlayerY){
    player.y=groundPlayerY;
    player.vy=0;
    player.onGround=true;
  }

  const bob=player.onGround?Math.sin(score*.22)*2.6:0;
  const angle=player.onGround?Math.sin(score*.18)*.018:0;

  ctx.save();
  ctx.translate(player.x+player.w/2,player.y+player.h/2+bob);
  ctx.rotate(angle);
  ctx.drawImage(playerImgs[selected],-player.w/2,-player.h/2,player.w,player.h);
  ctx.restore();
}

function drawBushes(dt){
  bushes.forEach(b=>{
    b.x-=speed*dt;
    const w=b.w*b.scale;
    const h=b.h*b.scale;
    ctx.drawImage(bushImg,b.x,b.y,w,h);
  });
  bushes=bushes.filter(b=>b.x+b.w>0);
}

function checkCollision(){
  const playerBox={
    x:player.x+player.w*.28,
    y:player.y+player.h*.18,
    w:player.w*.44,
    h:player.h*.74
  };

  for(const b of bushes){
    const bushBox={
      x:b.x+b.w*.14,
      y:b.y+b.h*.18,
      w:b.w*.72,
      h:b.h*.76
    };
    if(collide(playerBox,bushBox)){
      endGame();
      break;
    }
  }
}

function loop(now){
  if(!running)return;

  const dt=Math.min(32,now-lastTime)/16.67;
  lastTime=now;

  ctx.clearRect(0,0,innerWidth,innerHeight);

  score+=.58*dt;
  speed=Math.min(13,6+score/320);
  scoreEl.textContent=String(Math.floor(score)).padStart(6,'0');

  drawBackground(dt);
  drawBushes(dt);
  drawPlayer(dt);

  if(now-lastSpawn>Math.max(820,1600-speed*44)){
    spawnBush();
    lastSpawn=now+Math.random()*430;
  }

  checkCollision();
  if(running)raf=requestAnimationFrame(loop);
}
