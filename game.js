const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);

const UNIT_TYPES = {
  runner: { cost: 50, hp: 80, damage: 14, speed: 58, range: 34, cooldown: 1.2, rate: .65, color: '#fff0bd', label: '날쌘냥' },
  tank: { cost: 120, hp: 360, damage: 22, speed: 25, range: 38, cooldown: 3.2, rate: 1.1, color: '#c8e7ff', label: '방패냥' },
  fighter: { cost: 200, hp: 210, damage: 72, speed: 37, range: 48, cooldown: 4.2, rate: 1.25, color: '#ffc3a7', label: '검객냥' },
  mage: { cost: 350, hp: 140, damage: 58, speed: 24, range: 145, cooldown: 6, rate: 1.55, color: '#e3c8ff', label: '별빛냥', ranged: true }
  ,ninja: { cost: 280, hp: 155, damage: 46, speed: 76, range: 42, cooldown: 4.8, rate: .42, color: '#c8c5df', label: '닌자냥', icon: '忍', desc: '초고속 연타', rarity: '레어' }
  ,dragon: { cost: 520, hp: 330, damage: 115, speed: 22, range: 185, cooldown: 8, rate: 1.8, color: '#b7efcb', label: '용냥', icon: '龍', desc: '초장거리 포격', rarity: '슈퍼레어', ranged: true }
  ,gunner: { cost: 420, hp: 190, damage: 82, speed: 31, range: 125, cooldown: 6.5, rate: .85, color: '#ffe69a', label: '기관냥', icon: '✹', desc: '빠른 원거리', rarity: '레어', ranged: true }
  ,titan: { cost: 700, hp: 1050, damage: 168, speed: 15, range: 55, cooldown: 12, rate: 1.7, color: '#ffb0b0', label: '거신냥', icon: '大', desc: '압도적인 체력', rarity: '슈퍼레어' }
};
const ENEMY_TYPES = {
  pup: { hp: 95, damage: 13, speed: 34, range: 34, rate: .8, reward: 28, color: '#d9a66f' },
  boar: { hp: 340, damage: 34, speed: 22, range: 40, rate: 1.2, reward: 80, color: '#9c6970' },
  bird: { hp: 145, damage: 24, speed: 48, range: 58, rate: .9, reward: 48, color: '#93b7d4' }
};
const STAGES = [
  { name:'햇살 초원', enemyHp:1700, spawn:3.2, scale:.78, reward:100 },
  { name:'바람 언덕', enemyHp:2100, spawn:2.9, scale:.88, reward:140 },
  { name:'붉은 협곡', enemyHp:2500, spawn:2.65, scale:1, reward:190 },
  { name:'달빛 늪지', enemyHp:3000, spawn:2.4, scale:1.12, reward:250 },
  { name:'강철 도시', enemyHp:3600, spawn:2.18, scale:1.25, reward:320 },
  { name:'얼음 성벽', enemyHp:4300, spawn:2, scale:1.4, reward:410 },
  { name:'화염 분지', enemyHp:5100, spawn:1.82, scale:1.58, reward:510 },
  { name:'폭풍 요새', enemyHp:6100, spawn:1.65, scale:1.78, reward:630 },
  { name:'황혼 왕국', enemyHp:7300, spawn:1.48, scale:2.02, reward:780 },
  { name:'별의 최후', enemyHp:9000, spawn:1.3, scale:2.3, reward:1000 }
];
const BASIC_UNITS = ['runner','tank','fighter','mage'];
const GACHA_UNITS = ['ninja','dragon','gunner','titan'];
const SAVE_KEY = 'cat-fortress-save-v2';

let progress = loadProgress();
let selectedStage = Math.min(progress.highestStage, 9);

let game = null, animationId = null, lastTime = 0, audio = null, soundOn = true;
let unitButtons = [];

function createGame() {
  const settings = STAGES[selectedStage];
  return { running:true, time:0, money:150, maxMoney:1000, income:34, workerLevel:1, playerHp:2500, playerMaxHp:2500, enemyHp:settings.enemyHp, enemyMaxHp:settings.enemyHp, enemyTimer:1.8, enemySpawn:settings.spawn, enemyScale:settings.scale, units:[], enemies:[], particles:[], projectiles:[], cooldowns:Object.fromEntries(progress.owned.map(type=>[type,0])), shake:0, result:null };
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
$('#gacha-button').addEventListener('click', openGacha);
$('#close-gacha').addEventListener('click', () => $('#gacha-dialog').close());
$('#draw-button').addEventListener('click', drawGacha);

function loadProgress(){
  const fallback={gold:0,highestStage:0,cleared:[],owned:[...BASIC_UNITS],levels:{runner:1,tank:1,fighter:1,mage:1}};
  try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if(!saved)return fallback;return {...fallback,...saved,owned:[...new Set([...BASIC_UNITS,...(saved.owned||[])])],levels:{...fallback.levels,...(saved.levels||{})}};}catch{return fallback;}
}
function saveProgress(){localStorage.setItem(SAVE_KEY,JSON.stringify(progress));renderMeta();}
function renderMeta(){
  $('#gold').textContent=progress.gold.toLocaleString();
  $('#stage-picker').innerHTML=STAGES.map((s,i)=>`<button class="stage-button ${i===selectedStage?'selected':''}" data-stage="${i}" ${i>progress.highestStage?'disabled':''}>${i+1}${progress.cleared.includes(i)?' ✓':''}</button>`).join('');
  document.querySelectorAll('.stage-button').forEach(b=>b.onclick=()=>{selectedStage=Number(b.dataset.stage);renderMeta();});
  const stage=STAGES[selectedStage];$('#stage-description').textContent=`${selectedStage+1}. ${stage.name} · 승리 보상 ${stage.reward} 골드`;$('#stage-label').textContent=`STAGE ${selectedStage+1}`;
  renderDeck();renderCollection();
}
function renderDeck(){
  $('#unit-deck').innerHTML=progress.owned.map(type=>{const u=UNIT_TYPES[type],icon=u.icon||({runner:'ฅ',tank:'◉',fighter:'⚔',mage:'✦'}[type]);return `<button class="unit-card" data-unit="${type}" type="button"><span class="unit-portrait ${type}">${icon}</span><strong>${u.label} <sup>Lv.${progress.levels[type]||1}</sup></strong><small>${u.desc||({runner:'빠른 돌격',tank:'높은 체력',fighter:'강한 공격',mage:'원거리 공격'}[type])}</small><em>${u.cost} 🐟</em><i class="cooldown"></i></button>`;}).join('');
  unitButtons=[...document.querySelectorAll('.unit-card')];unitButtons.forEach(b=>b.addEventListener('click',()=>summon(b.dataset.unit)));
}
function renderCollection(){if(!$('#collection'))return;$('#collection').innerHTML=GACHA_UNITS.map(type=>`<span class="${progress.owned.includes(type)?'owned':''}">${progress.owned.includes(type)?UNIT_TYPES[type].label:'???'}<br>${progress.owned.includes(type)?`Lv.${progress.levels[type]}`:UNIT_TYPES[type].rarity}</span>`).join('');}
function openGacha(){renderCollection();$('#gacha-result').textContent='새 캐릭터 4종이 기다리고 있어요!';$('#draw-button').disabled=progress.gold<300;$('#gacha-dialog').showModal();}
function drawGacha(){
  if(progress.gold<300)return;progress.gold-=300;const type=GACHA_UNITS[Math.floor(Math.random()*GACHA_UNITS.length)],isNew=!progress.owned.includes(type);if(isNew){progress.owned.push(type);progress.levels[type]=1;}else progress.levels[type]=(progress.levels[type]||1)+1;
  const capsule=$('#capsule');capsule.classList.add('drawing');$('#draw-button').disabled=true;playJingle([392,494,587,784],.09);
  setTimeout(()=>{capsule.classList.remove('drawing');$('#gacha-result').innerHTML=`<strong>${UNIT_TYPES[type].rarity} · ${UNIT_TYPES[type].label}</strong><br>${isNew?'새 캐릭터 획득!':`중복 획득! Lv.${progress.levels[type]} 강화`}`;saveProgress();$('#draw-button').disabled=progress.gold<300;},700);
}

function startBattle() {
  initAudio(); game=createGame(); $('#stage-label').textContent=`STAGE ${selectedStage+1}`; $('#start-overlay').classList.add('hidden'); $('#battle-message').classList.add('hidden'); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); playJingle([392,523,659]);
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
function summon(type){ if(!game?.running)return;const u=UNIT_TYPES[type],level=progress.levels[type]||1,boost=1+(level-1)*.08;if(game.money<u.cost||game.cooldowns[type]>0)return;game.money-=u.cost;game.cooldowns[type]=u.cooldown;game.units.push({...u,id:crypto.randomUUID(),side:'cat',x:82+Math.random()*8,y:groundY(),attack:.25,hp:Math.round(u.hp*boost),maxHp:Math.round(u.hp*boost),damage:Math.round(u.damage*boost)});playTone(440,.1,'triangle',.08); }
function spawnEnemy(){ const roll=Math.random();const type=game.time>28&&roll>.72?'boar':game.time>12&&roll>.45?'bird':'pup';const e=ENEMY_TYPES[type];game.enemies.push({...e,id:crypto.randomUUID(),side:'enemy',kind:type,x:(canvas.viewWidth||800)-82,y:groundY(),attack:.4,hp:e.hp*game.enemyScale,maxHp:e.hp*game.enemyScale,damage:e.damage*game.enemyScale}); }
function upgradeWorker(){ if(!game?.running||game.workerLevel>=8)return;const cost=workerCost();if(game.money<cost)return;game.money-=cost;game.workerLevel++;game.income+=15;game.maxMoney+=250;playJingle([523,659]); }
function workerCost(){return 150+(game?.workerLevel||1)*100;}
function finish(win){
  game.running=false;game.result=win;let reward=0;
  if(win){reward=STAGES[selectedStage].reward;progress.gold+=reward;if(!progress.cleared.includes(selectedStage))progress.cleared.push(selectedStage);progress.highestStage=Math.max(progress.highestStage,Math.min(9,selectedStage+1));saveProgress();}
  const box=$('#battle-message');box.innerHTML=`<span>${win?'승리!':'패배...'}</span>${win?`<small>+${reward} 골드 🪙</small>`:''}<button class="main-button" id="retry-button">스테이지 선택</button>`;box.classList.remove('hidden');
  $('#retry-button').onclick=()=>{$('#battle-message').classList.add('hidden');$('#start-overlay').classList.remove('hidden');renderMeta();};playJingle(win?[523,659,784,1047]:[330,247,196],.18);
}
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

function updateUI(){if(!game)return;$('#money').textContent=Math.floor(game.money);$('#max-money').textContent=game.maxMoney;$('#money-bar').style.width=`${game.money/game.maxMoney*100}%`;$('#worker-level').textContent=game.workerLevel;$('#worker-cost').textContent=game.workerLevel>=8?'MAX':`${workerCost()} 🐟`;$('#worker-button').disabled=!game.running||game.workerLevel>=8||game.money<workerCost();$('#battle-time').textContent=`${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;setHealth('player',game.playerHp,game.playerMaxHp);setHealth('enemy',game.enemyHp,game.enemyMaxHp);unitButtons.forEach(b=>{const type=b.dataset.unit,u=UNIT_TYPES[type],cd=game.cooldowns[type]||0;b.disabled=!game.running||game.money<u.cost||cd>0;b.querySelector('.cooldown').style.height=`${cd/u.cooldown*100}%`;});}
function setHealth(side,hp,max){$(`#${side}-health-bar`).style.width=`${Math.max(0,hp/max*100)}%`;$(`#${side}-health-text`).textContent=`${Math.max(0,Math.ceil(hp)).toLocaleString()} / ${max.toLocaleString()}`;}

function initAudio(){if(!soundOn)return;if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A();}if(audio?.state==='suspended')audio.resume();}
function playTone(freq,duration=.1,type='square',volume=.06,delay=0){if(!soundOn)return;initAudio();if(!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.02);}
function playHit(volume){playTone(90,.07,'sawtooth',volume);}
function playJingle(notes,gap=.11){notes.forEach((n,i)=>playTone(n,.18,'triangle',.09,i*gap));}

renderMeta();resizeCanvas();draw();
