const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);

const UNIT_TYPES = {
  runner: { cost: 50, hp: 80, damage: 14, speed: 58, range: 34, cooldown: 1.2, rate: .65, color: '#fff0bd', label: '날쌘냥' },
  tank: { cost: 120, hp: 360, damage: 22, speed: 25, range: 38, cooldown: 3.2, rate: 1.1, color: '#c8e7ff', label: '방패냥' },
  fighter: { cost: 200, hp: 210, damage: 72, speed: 37, range: 48, cooldown: 4.2, rate: 1.25, color: '#ffc3a7', label: '검객냥' },
  mage: { cost: 350, hp: 140, damage: 58, speed: 24, range: 145, cooldown: 6, rate: 1.55, color: '#e3c8ff', label: '별빛냥', ranged: true }
};
const ENEMY_TYPES = {
  pup: { hp: 95, damage: 13, speed: 34, range: 34, rate: .8, reward: 28, color: '#d9a66f' },
  boar: { hp: 340, damage: 34, speed: 22, range: 40, rate: 1.2, reward: 80, color: '#9c6970' },
  bird: { hp: 145, damage: 24, speed: 48, range: 58, rate: .9, reward: 48, color: '#93b7d4' }
};
const DIFFICULTY = {
  easy: { enemyHp: 1900, spawn: 3.1, scale: .85 }, normal: { enemyHp: 2500, spawn: 2.5, scale: 1 }, hard: { enemyHp: 3400, spawn: 1.85, scale: 1.28 }
};

let game = null, animationId = null, lastTime = 0, audio = null, soundOn = true;
const unitButtons = [...document.querySelectorAll('.unit-card')];

function createGame() {
  const settings = DIFFICULTY[$('#difficulty').value];
  return { running:true, time:0, money:150, maxMoney:1000, income:34, workerLevel:1, playerHp:2500, playerMaxHp:2500, enemyHp:settings.enemyHp, enemyMaxHp:settings.enemyHp, enemyTimer:1.8, enemySpawn:settings.spawn, enemyScale:settings.scale, units:[], enemies:[], particles:[], projectiles:[], cooldowns:{ runner:0,tank:0,fighter:0,mage:0 }, shake:0, result:null };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0); canvas.viewWidth=rect.width; canvas.viewHeight=rect.height;
}
new ResizeObserver(resizeCanvas).observe(canvas);

$('#start-button').addEventListener('click', startBattle);
$('#worker-button').addEventListener('click', upgradeWorker);
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#close-help').addEventListener('click', () => $('#help-dialog').close());
$('#sound-button').addEventListener('click', () => { soundOn=!soundOn; $('#sound-button').textContent=soundOn?'🔊':'🔇'; $('#sound-button').ariaLabel=soundOn?'소리 끄기':'소리 켜기'; if(soundOn) initAudio(); });
unitButtons.forEach((button) => button.addEventListener('click', () => summon(button.dataset.unit)));

function startBattle() {
  initAudio(); game=createGame(); $('#start-overlay').classList.add('hidden'); $('#battle-message').classList.add('hidden'); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); playJingle([392,523,659]);
}
function loop(now) {
  const dt=Math.min((now-lastTime)/1000,.04); lastTime=now; if(game?.running) update(dt); draw(); updateUI(); if(game?.running) animationId=requestAnimationFrame(loop);
}
function update(dt) {
  game.time+=dt; game.money=Math.min(game.maxMoney,game.money+game.income*dt); game.enemyTimer-=dt;
  Object.keys(game.cooldowns).forEach(k=>game.cooldowns[k]=Math.max(0,game.cooldowns[k]-dt));
  if(game.enemyTimer<=0){ spawnEnemy(); game.enemyTimer=game.enemySpawn*(.82+Math.random()*.4)*Math.max(.62,1-game.time/360); }
  updateArmy(game.units,game.enemies,1,dt); updateArmy(game.enemies,game.units,-1,dt);
  game.projectiles.forEach(p=>{ p.x+=p.speed*dt; p.life-=dt; const target=game.enemies.find(e=>e.id===p.targetId); if(target&&Math.abs(target.x-p.x)<18){ damage(target,p.damage,p.x,p.y); p.life=0; }});
  game.projectiles=game.projectiles.filter(p=>p.life>0);
  game.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=80*dt;p.life-=dt;}); game.particles=game.particles.filter(p=>p.life>0); game.shake=Math.max(0,game.shake-dt*12);
  removeDead(); if(game.playerHp<=0) finish(false); if(game.enemyHp<=0) finish(true);
}
function updateArmy(army,opponents,direction,dt) {
  const width=canvas.viewWidth||800;
  army.forEach(unit=>{
    unit.attack-=dt; unit.hit=Math.max(0,(unit.hit||0)-dt); const target=findTarget(unit,opponents,direction);
    const baseX=direction===1?width-70:70; const baseInRange=Math.abs(baseX-unit.x)<=unit.range;
    if(target||baseInRange){
      if(unit.attack<=0){ unit.attack=unit.rate; unit.flash=.12; if(target){ if(unit.ranged) shoot(unit,target); else damage(target,unit.damage,unit.x,unit.y); } else { if(direction===1) game.enemyHp-=unit.damage; else game.playerHp-=unit.damage; burst(baseX,unit.y,direction===1?'#ef476f':'#55d6be'); game.shake=3; playHit(.08); } }
    } else unit.x+=unit.speed*direction*dt;
    unit.flash=Math.max(0,(unit.flash||0)-dt);
  });
}
function findTarget(unit,opponents,direction){ return opponents.filter(e=>direction===1?e.x>=unit.x:e.x<=unit.x).sort((a,b)=>Math.abs(a.x-unit.x)-Math.abs(b.x-unit.x)).find(e=>Math.abs(e.x-unit.x)<=unit.range); }
function shoot(unit,target){ game.projectiles.push({x:unit.x,y:unit.y-35,speed:230,targetId:target.id,damage:unit.damage,life:1.5}); playTone(700,.08,'sine',.04); }
function damage(target,amount,x,y){ target.hp-=amount; target.hit=.12; burst(x,y,target.side==='cat'?'#fff0bd':'#ff9d76'); playHit(.035); }
function removeDead(){
  game.enemies=game.enemies.filter(e=>{if(e.hp>0)return true;game.money=Math.min(game.maxMoney,game.money+e.reward);burst(e.x,e.y,'#ffd447',10);return false;});
  game.units=game.units.filter(e=>{if(e.hp>0)return true;burst(e.x,e.y,'#dff6ff',8);return false;});
}
function summon(type){ if(!game?.running)return;const u=UNIT_TYPES[type];if(game.money<u.cost||game.cooldowns[type]>0)return;game.money-=u.cost;game.cooldowns[type]=u.cooldown;game.units.push({...u,id:crypto.randomUUID(),side:'cat',x:82+Math.random()*8,y:groundY(),attack:.25,hp:u.hp,maxHp:u.hp});playTone(440,.1,'triangle',.08); }
function spawnEnemy(){ const roll=Math.random();const type=game.time>28&&roll>.72?'boar':game.time>12&&roll>.45?'bird':'pup';const e=ENEMY_TYPES[type];game.enemies.push({...e,id:crypto.randomUUID(),side:'enemy',kind:type,x:(canvas.viewWidth||800)-82,y:groundY(),attack:.4,hp:e.hp*game.enemyScale,maxHp:e.hp*game.enemyScale,damage:e.damage*game.enemyScale}); }
function upgradeWorker(){ if(!game?.running||game.workerLevel>=8)return;const cost=workerCost();if(game.money<cost)return;game.money-=cost;game.workerLevel++;game.income+=15;game.maxMoney+=250;playJingle([523,659]); }
function workerCost(){return 150+(game?.workerLevel||1)*100;}
function finish(win){ game.running=false;game.result=win;const box=$('#battle-message');box.innerHTML=`<span>${win?'승리!':'패배...'}</span><button class="main-button" id="retry-button">다시 출격</button>`;box.classList.remove('hidden');$('#retry-button').onclick=()=>{$('#battle-message').classList.add('hidden');$('#start-overlay').classList.remove('hidden');};playJingle(win?[523,659,784,1047]:[330,247,196],.18); }
function groundY(){return (canvas.viewHeight||400)*.77;}

function draw(){ const w=canvas.viewWidth||800,h=canvas.viewHeight||400;ctx.clearRect(0,0,w,h);ctx.save();if(game?.shake)ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake);drawBackground(w,h);drawBase(55,groundY(),true,game?.playerHp??2500);drawBase(w-55,groundY(),false,game?.enemyHp??2500);if(game){game.units.forEach(drawUnit);game.enemies.forEach(drawEnemy);game.projectiles.forEach(drawProjectile);game.particles.forEach(drawParticle);}ctx.restore(); }
function drawBackground(w,h){const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#78c9ed');sky.addColorStop(.7,'#dff4de');sky.addColorStop(.71,'#76ad55');sky.addColorStop(1,'#436b35');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(255,255,255,.65)';for(let i=0;i<4;i++){const x=(i*287+(game?.time||0)*-3)% (w+180)-60,y=45+(i%2)*42;ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.arc(x+27,y+5,31,0,Math.PI*2);ctx.arc(x+58,y,21,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#527e46';for(let x=0;x<w;x+=55){ctx.beginPath();ctx.arc(x,groundY()+10,42,Math.PI,0);ctx.fill();}}
function drawBase(x,y,cat,hp){ctx.save();ctx.translate(x,y);ctx.fillStyle=cat?'#e9e3cc':'#443b55';ctx.strokeStyle='#151827';ctx.lineWidth=4;ctx.fillRect(-38,-88,76,88);ctx.strokeRect(-38,-88,76,88);ctx.fillStyle=cat?'#ffd447':'#ef476f';ctx.beginPath();ctx.moveTo(-47,-88);ctx.lineTo(0,-125);ctx.lineTo(47,-88);ctx.fill();ctx.stroke();ctx.fillStyle='#17192a';ctx.fillRect(-12,-35,24,35);ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(cat?'ฅ':'☠',0,-56);if(hp<=0){ctx.rotate(.12);ctx.globalAlpha=.5;}ctx.restore();}
function drawUnit(u){ctx.save();ctx.translate(u.x,u.y);if(u.hit)ctx.globalAlpha=.55;ctx.fillStyle=u.color;ctx.strokeStyle='#17192a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-25,21,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-17,-40);ctx.lineTo(-12,-57);ctx.lineTo(-2,-44);ctx.moveTo(17,-40);ctx.lineTo(12,-57);ctx.lineTo(2,-44);ctx.fill();ctx.stroke();ctx.fillStyle='#17192a';ctx.beginPath();ctx.arc(-7,-27,2.5,0,7);ctx.arc(7,-27,2.5,0,7);ctx.fill();ctx.strokeStyle='#17192a';ctx.beginPath();ctx.arc(0,-19,5,0,Math.PI);ctx.stroke();if(u.label==='방패냥'){ctx.fillStyle='#7cb9df';ctx.fillRect(12,-52,12,45);}if(u.label==='검객냥'){ctx.strokeStyle='#eee';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(15,-44);ctx.lineTo(30,-70);ctx.stroke();}if(u.label==='별빛냥'){ctx.fillStyle='#a16fd4';ctx.beginPath();ctx.arc(18,-52,8,0,7);ctx.fill();}healthMini(u);ctx.restore();}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);if(e.hit)ctx.globalAlpha=.5;ctx.fillStyle=e.color;ctx.strokeStyle='#2b1b27';ctx.lineWidth=3;const size=e.kind==='boar'?28:20;ctx.beginPath();ctx.arc(0,-size,size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#2b1b27';ctx.beginPath();ctx.arc(-7,-size-3,3,0,7);ctx.arc(7,-size-3,3,0,7);ctx.fill();if(e.kind==='boar'){ctx.fillStyle='#eee';ctx.fillRect(-29,-25,8,18);ctx.fillRect(21,-25,8,18);}if(e.kind==='bird'){ctx.beginPath();ctx.moveTo(-15,-30);ctx.lineTo(-36,-43);ctx.lineTo(-22,-18);ctx.fill();}healthMini(e);ctx.restore();}
function healthMini(u){if(u.hp>=u.maxHp)return;ctx.fillStyle='#141525';ctx.fillRect(-22,4,44,5);ctx.fillStyle=u.side==='cat'?'#55d6be':'#ef476f';ctx.fillRect(-22,4,44*Math.max(0,u.hp/u.maxHp),5);}
function drawProjectile(p){ctx.fillStyle='#f7dcff';ctx.shadowColor='#b46cff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,7,0,7);ctx.fill();ctx.shadowBlur=0;}
function burst(x,y,color,count=5){for(let i=0;i<count;i++)game.particles.push({x,y:y-28,vx:(Math.random()-.5)*100,vy:-30-Math.random()*90,life:.35+Math.random()*.35,color});}
function drawParticle(p){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);ctx.globalAlpha=1;}

function updateUI(){if(!game)return;$('#money').textContent=Math.floor(game.money);$('#max-money').textContent=game.maxMoney;$('#money-bar').style.width=`${game.money/game.maxMoney*100}%`;$('#worker-level').textContent=game.workerLevel;$('#worker-cost').textContent=game.workerLevel>=8?'MAX':`${workerCost()} 🐟`;$('#worker-button').disabled=!game.running||game.workerLevel>=8||game.money<workerCost();$('#battle-time').textContent=`${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;setHealth('player',game.playerHp,game.playerMaxHp);setHealth('enemy',game.enemyHp,game.enemyMaxHp);unitButtons.forEach(b=>{const type=b.dataset.unit,u=UNIT_TYPES[type],cd=game.cooldowns[type];b.disabled=!game.running||game.money<u.cost||cd>0;b.querySelector('.cooldown').style.height=`${cd/u.cooldown*100}%`;});}
function setHealth(side,hp,max){$(`#${side}-health-bar`).style.width=`${Math.max(0,hp/max*100)}%`;$(`#${side}-health-text`).textContent=`${Math.max(0,Math.ceil(hp)).toLocaleString()} / ${max.toLocaleString()}`;}

function initAudio(){if(!soundOn)return;if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A();}if(audio?.state==='suspended')audio.resume();}
function playTone(freq,duration=.1,type='square',volume=.06,delay=0){if(!soundOn)return;initAudio();if(!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.02);}
function playHit(volume){playTone(90,.07,'sawtooth',volume);}
function playJingle(notes,gap=.11){notes.forEach((n,i)=>playTone(n,.18,'triangle',.09,i*gap));}

resizeCanvas(); draw();
