const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);

const UNIT_TYPES = {
  runner: { cost: 50, hp: 80, damage: 14, speed: 58, range: 34, cooldown: 1.2, rate: .65, color: '#fff0bd', label: '날쌘냥' },
  tank: { cost: 120, hp: 360, damage: 22, speed: 25, range: 38, cooldown: 3.2, rate: 1.1, color: '#c8e7ff', label: '방패냥' },
  fighter: { cost: 200, hp: 210, damage: 72, speed: 37, range: 48, cooldown: 4.2, rate: 1.25, color: '#ffc3a7', label: '검객냥' },
  mage: { cost: 350, hp: 140, damage: 58, speed: 24, range: 145, cooldown: 6, rate: 1.55, color: '#e3c8ff', label: '별빛냥', ranged: true }
  ,ninja: { cost: 280, hp: 155, damage: 46, speed: 76, range: 42, cooldown: 4.8, rate: .42, color: '#c8c5df', label: '닌자냥', icon: '忍', desc: '초고속 연타', rarity: '레어' }
  ,dragon: { cost: 520, hp: 330, damage: 115, speed: 22, range: 185, cooldown: 8, rate: 1.8, color: '#b7efcb', label: '용냥', icon: '龍', desc: '초장거리 포격', rarity: '슈퍼 레어', ranged: true }
  ,gunner: { cost: 420, hp: 190, damage: 82, speed: 31, range: 125, cooldown: 6.5, rate: .85, color: '#ffe69a', label: '기관냥', icon: '✹', desc: '빠른 원거리', rarity: '레어', ranged: true }
  ,titan: { cost: 700, hp: 1050, damage: 168, speed: 15, range: 55, cooldown: 12, rate: 1.7, color: '#ffb0b0', label: '거신냥', icon: '大', desc: '압도적인 체력', rarity: '슈퍼 레어' }
  ,boxer: { cost: 90, hp: 125, damage: 20, speed: 45, range: 35, cooldown: 2, rate: .55, color: '#f1e5c6', label: '복서냥', icon: '拳', desc: '가벼운 연속 공격', rarity: '노멀' }
  ,chef: { cost: 240, hp: 260, damage: 54, speed: 30, range: 62, cooldown: 4.5, rate: .9, color: '#d9f0ef', label: '요리사냥', icon: '♨', desc: '균형 잡힌 공격', rarity: 'EX' }
  ,cosmic: { cost: 950, hp: 620, damage: 250, speed: 27, range: 220, cooldown: 15, rate: 2.1, color: '#a8d8ff', label: '은하냥', icon: '☄', desc: '은하의 초장거리 공격', rarity: '울트라 슈퍼 레어', ranged: true }
  ,emperor: { cost: 1400, hp: 1800, damage: 440, speed: 20, range: 250, cooldown: 22, rate: 2.3, color: '#ffdb73', label: '황제냥', icon: '♛', desc: '전설의 절대 공격', rarity: '레전드 레어', ranged: true }
  ,farmer: { cost: 75, hp: 105, damage: 18, speed: 38, range: 38, cooldown: 1.8, rate: .62, color: '#d8e6af', label: '농부냥', icon: '♧', desc: '성실한 근접 공격', rarity: '노멀' }
  ,sleepy: { cost: 110, hp: 180, damage: 26, speed: 18, range: 42, cooldown: 2.8, rate: 1, color: '#ddd7ee', label: '잠꾸러기냥', icon: 'Z', desc: '느리지만 튼튼함', rarity: '노멀' }
  ,pirate: { cost: 260, hp: 225, damage: 63, speed: 34, range: 75, cooldown: 5, rate: 1, color: '#d7c0a8', label: '해적냥', icon: '☠', desc: '중거리 대포 공격', rarity: 'EX', ranged: true }
  ,medic: { cost: 290, hp: 310, damage: 48, speed: 28, range: 55, cooldown: 5.5, rate: .85, color: '#f7dce4', label: '의무냥', icon: '+', desc: '튼튼한 지원 전투', rarity: 'EX' }
  ,samurai: { cost: 390, hp: 340, damage: 105, speed: 42, range: 52, cooldown: 7, rate: 1.1, color: '#b9c7dd', label: '사무라이냥', icon: '刀', desc: '날카로운 일격', rarity: '레어' }
  ,rocket: { cost: 460, hp: 180, damage: 95, speed: 30, range: 165, cooldown: 7.5, rate: 1.35, color: '#ffc99d', label: '로켓냥', icon: '▲', desc: '강력한 원거리 포격', rarity: '레어', ranged: true }
  ,phantom: { cost: 680, hp: 370, damage: 185, speed: 58, range: 70, cooldown: 10, rate: .95, color: '#c6b3e8', label: '유령냥', icon: '◈', desc: '빠르고 강한 기습', rarity: '슈퍼 레어' }
  ,paladin: { cost: 760, hp: 1250, damage: 145, speed: 20, range: 68, cooldown: 13, rate: 1.45, color: '#e8e2bd', label: '성기사냥', icon: '♜', desc: '철벽의 수호자', rarity: '슈퍼 레어' }
  ,phoenix: { cost: 1100, hp: 780, damage: 310, speed: 45, range: 195, cooldown: 17, rate: 1.65, color: '#ffad77', label: '불사조냥', icon: '♨', desc: '불꽃 초장거리 공격', rarity: '울트라 슈퍼 레어', ranged: true }
  ,chronos: { cost: 1550, hp: 1550, damage: 520, speed: 26, range: 280, cooldown: 24, rate: 2, color: '#9ee8e3', label: '시간신냥', icon: '⌛', desc: '시간을 초월한 포격', rarity: '레전드 레어', ranged: true }
};
const ENEMY_TYPES = {
  pup: { hp: 95, damage: 13, speed: 34, range: 34, rate: .8, reward: 28, color: '#d9a66f' },
  boar: { hp: 340, damage: 34, speed: 22, range: 40, rate: 1.2, reward: 80, color: '#9c6970' },
  bird: { hp: 145, damage: 24, speed: 48, range: 58, rate: .9, reward: 48, color: '#93b7d4' },
  snake: { hp: 230, damage: 30, speed: 42, range: 72, rate: .72, reward: 62, color: '#82b56c' },
  gorilla: { hp: 620, damage: 68, speed: 27, range: 48, rate: 1.05, reward: 125, color: '#695c58' },
  rhino: { hp: 1200, damage: 115, speed: 18, range: 55, rate: 1.35, reward: 210, color: '#87939b' },
  ghost: { hp: 760, damage: 92, speed: 38, range: 120, rate: 1.15, reward: 175, color: '#b69ad4', ranged: true },
  mech: { hp: 1800, damage: 155, speed: 20, range: 95, rate: 1.25, reward: 300, color: '#65758d' },
  demon: { hp: 3100, damage: 260, speed: 16, range: 145, rate: 1.55, reward: 520, color: '#672f58', ranged: true }
};
const ENEMY_STAGE_POOLS = [
  ['pup'],['pup','bird'],['pup','bird','snake'],['bird','snake','boar'],['snake','boar','gorilla'],
  ['boar','gorilla','ghost'],['gorilla','rhino','ghost'],['rhino','ghost','mech'],['ghost','mech','demon'],['rhino','mech','demon']
];
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
const GACHA_POOLS = {
  '노멀':['boxer','farmer','sleepy'], 'EX':['chef','pirate','medic'], '레어':['ninja','gunner','samurai','rocket'], '슈퍼 레어':['dragon','titan','phantom','paladin'], '울트라 슈퍼 레어':['cosmic','phoenix'], '레전드 레어':['emperor','chronos']
};
const GACHA_RATES = [
  {rarity:'노멀',rate:50},{rarity:'EX',rate:25},{rarity:'레어',rate:9},{rarity:'슈퍼 레어',rate:10.7},{rarity:'울트라 슈퍼 레어',rate:5},{rarity:'레전드 레어',rate:.3}
];
const GACHA_UNITS = Object.values(GACHA_POOLS).flat();
const SAVE_KEY = 'cat-fortress-save-v2';

let progress = loadProgress();
let selectedStage = Math.min(progress.highestStage, 9);

let game = null, animationId = null, lastTime = 0, audio = null, soundOn = true;
let unitButtons = [];

function createGame() {
  const settings = STAGES[selectedStage];
  return { running:true, time:0, money:150, maxMoney:1000, income:34, workerLevel:1, playerHp:2500, playerMaxHp:2500, enemyHp:settings.enemyHp, enemyMaxHp:settings.enemyHp, enemyTimer:1.8, enemySpawn:settings.spawn, enemyScale:settings.scale, spawnCount:0, units:[], enemies:[], particles:[], projectiles:[], cooldowns:Object.fromEntries(progress.owned.map(type=>[type,0])), training:Object.fromEntries(progress.owned.map(type=>[type,0])), shake:0, result:null };
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
$('#exit-battle').addEventListener('click', exitBattle);

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
function openGacha(){renderCollection();$('#gacha-result').textContent='전설의 고양이에게 도전해 보세요!';$('#draw-button').disabled=progress.gold<300;$('#gacha-dialog').showModal();}
function rollGacha(randomValue=Math.random()){
  const roll=Math.min(999,Math.floor(randomValue*1000));
  let cursor=0,rarity=GACHA_RATES[GACHA_RATES.length-1].rarity;
  for(const item of GACHA_RATES){cursor+=Math.round(item.rate*10);if(roll<cursor){rarity=item.rarity;break;}}
  const pool=GACHA_POOLS[rarity];return pool[Math.floor(Math.random()*pool.length)];
}
function drawGacha(){
  if(progress.gold<300)return;progress.gold-=300;const type=rollGacha(),isNew=!progress.owned.includes(type);if(isNew){progress.owned.push(type);progress.levels[type]=1;}else progress.levels[type]=(progress.levels[type]||1)+1;
  const capsule=$('#capsule');capsule.classList.add('drawing');$('#draw-button').disabled=true;playJingle([392,494,587,784],.09);
  setTimeout(()=>{capsule.classList.remove('drawing');$('#gacha-result').innerHTML=`<strong>${UNIT_TYPES[type].rarity} · ${UNIT_TYPES[type].label}</strong><br>${isNew?'새 캐릭터 획득!':`중복 획득! Lv.${progress.levels[type]} 강화`}`;saveProgress();$('#draw-button').disabled=progress.gold<300;},700);
}

function startBattle() {
  initAudio(); game=createGame(); $('#stage-label').textContent=`STAGE ${selectedStage+1}`; $('#start-overlay').classList.add('hidden'); $('#battle-message').classList.add('hidden'); $('#exit-battle').classList.remove('hidden'); $('#training-panel').classList.remove('hidden'); renderTraining(); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); playJingle([392,523,659]);
}
function exitBattle(){
  if(!game?.running)return;
  if(!window.confirm('현재 전투를 포기하고 인트로로 돌아갈까요?\n사용한 물고기와 전투 강화는 사라집니다.'))return;
  game.running=false;cancelAnimationFrame(animationId);game=null;$('#exit-battle').classList.add('hidden');$('#training-panel').classList.add('hidden');$('#battle-message').classList.add('hidden');$('#start-overlay').classList.remove('hidden');renderMeta();playTone(220,.2,'triangle',.06);
}
function loop(now) {
  const dt=Math.min((now-lastTime)/1000,.04); lastTime=now; if(game?.running) update(dt); draw(); updateUI(); if(game?.running) animationId=requestAnimationFrame(loop);
}
function update(dt) {
  game.time+=dt; game.money=Math.min(game.maxMoney,game.money+game.income*dt); game.enemyTimer-=dt;
  Object.keys(game.cooldowns).forEach(k=>game.cooldowns[k]=Math.max(0,game.cooldowns[k]-dt));
  if(game.enemyTimer<=0){ spawnEnemy(); game.enemyTimer=game.enemySpawn*(.82+Math.random()*.4)*Math.max(.62,1-game.time/360); }
  updateArmy(game.units,game.enemies,1,dt); updateArmy(game.enemies,game.units,-1,dt);
  game.projectiles.forEach(p=>{ p.x+=p.speed*dt; p.life-=dt; const targets=p.targetSide==='cat'?game.units:game.enemies;const target=targets.find(e=>e.id===p.targetId); if(target&&Math.abs(target.x-p.x)<18){ damage(target,p.damage,p.x,p.y); p.life=0; }});
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
function shoot(unit,target){ game.projectiles.push({x:unit.x,y:unit.y-35,speed:target.x>=unit.x?230:-230,targetId:target.id,targetSide:target.side,damage:unit.damage,life:1.5,color:unit.side==='cat'?'#f7dcff':'#ff7b8d'}); playTone(unit.side==='cat'?700:180,.08,'sine',.04); }
function damage(target,amount,x,y){ target.hp-=amount; target.hit=.12; burst(x,y,target.side==='cat'?'#fff0bd':'#ff9d76'); playHit(.035); }
function removeDead(){
  game.enemies=game.enemies.filter(e=>{if(e.hp>0)return true;game.money=Math.min(game.maxMoney,game.money+e.reward);burst(e.x,e.y,'#ffd447',10);return false;});
  game.units=game.units.filter(e=>{if(e.hp>0)return true;burst(e.x,e.y,'#dff6ff',8);return false;});
}
function summon(type){ if(!game?.running)return;const u=UNIT_TYPES[type],level=progress.levels[type]||1,training=game.training[type]||0,boost=(1+(level-1)*.08)*(1+training*.15);if(game.money<u.cost||game.cooldowns[type]>0)return;game.money-=u.cost;game.cooldowns[type]=u.cooldown;game.units.push({...u,unitType:type,id:crypto.randomUUID(),side:'cat',x:82+Math.random()*8,y:groundY(),attack:.25,hp:Math.round(u.hp*boost),maxHp:Math.round(u.hp*boost),damage:Math.round(u.damage*boost)});playTone(440,.1,'triangle',.08); }
function spawnEnemy(){
  const pool=ENEMY_STAGE_POOLS[selectedStage];game.spawnCount++;
  let type=pool[Math.floor(Math.random()*pool.length)];
  if(selectedStage>=4&&game.spawnCount%10===0)type=pool[pool.length-1];
  const e=ENEMY_TYPES[type],waveBoost=1+Math.min(.65,game.time/240);
  game.enemies.push({...e,id:crypto.randomUUID(),side:'enemy',kind:type,x:(canvas.viewWidth||800)-82,y:groundY(),attack:.4,hp:Math.round(e.hp*game.enemyScale*waveBoost),maxHp:Math.round(e.hp*game.enemyScale*waveBoost),damage:Math.round(e.damage*game.enemyScale*waveBoost)});
}
function upgradeWorker(){ if(!game?.running||game.workerLevel>=8)return;const cost=workerCost();if(game.money<cost)return;game.money-=cost;game.workerLevel++;game.income+=15;game.maxMoney+=250;playJingle([523,659]); }
function workerCost(){return 150+(game?.workerLevel||1)*100;}
function trainingCost(type){const level=game?.training[type]||0;return Math.round((80+UNIT_TYPES[type].cost*.5)*Math.pow(1.55,level)/10)*10;}
function renderTraining(){
  if(!game)return;$('#upgrade-deck').innerHTML=progress.owned.map(type=>`<button class="upgrade-button" data-upgrade="${type}" type="button"><strong>${UNIT_TYPES[type].label} +${game.training[type]}</strong><span>${game.training[type]>=5?'MAX':`${trainingCost(type)} 🐟`}</span></button>`).join('');
  document.querySelectorAll('.upgrade-button').forEach(button=>button.onclick=()=>upgradeUnit(button.dataset.upgrade));
}
function upgradeUnit(type){
  if(!game?.running||game.training[type]>=5)return;const cost=trainingCost(type);if(game.money<cost)return;game.money-=cost;game.training[type]++;
  game.units.filter(unit=>unit.unitType===type).forEach(unit=>{const oldMax=unit.maxHp;unit.maxHp=Math.round(unit.maxHp*1.15);unit.hp=Math.round(unit.hp+unit.maxHp-oldMax);unit.damage=Math.round(unit.damage*1.15);});
  renderTraining();playJingle([440,554,659],.07);
}
function finish(win){
  game.running=false;game.result=win;$('#exit-battle').classList.add('hidden');$('#training-panel').classList.add('hidden');let reward=0;
  if(win){reward=STAGES[selectedStage].reward;progress.gold+=reward;if(!progress.cleared.includes(selectedStage))progress.cleared.push(selectedStage);progress.highestStage=Math.max(progress.highestStage,Math.min(9,selectedStage+1));saveProgress();}
  const box=$('#battle-message');box.innerHTML=`<span>${win?'승리!':'패배...'}</span>${win?`<small>+${reward} 골드 🪙</small>`:''}<button class="main-button" id="retry-button">스테이지 선택</button>`;box.classList.remove('hidden');
  $('#retry-button').onclick=()=>{$('#battle-message').classList.add('hidden');$('#start-overlay').classList.remove('hidden');renderMeta();};playJingle(win?[523,659,784,1047]:[330,247,196],.18);
}
function groundY(){return (canvas.viewHeight||400)*.77;}

function draw(){ const w=canvas.viewWidth||800,h=canvas.viewHeight||400;ctx.clearRect(0,0,w,h);ctx.save();if(game?.shake)ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake);drawBackground(w,h);drawBase(55,groundY(),true,game?.playerHp??2500);drawBase(w-55,groundY(),false,game?.enemyHp??2500);if(game){game.units.forEach(drawUnit);game.enemies.forEach(drawEnemy);game.projectiles.forEach(drawProjectile);game.particles.forEach(drawParticle);}ctx.restore(); }
function drawBackground(w,h){const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#78c9ed');sky.addColorStop(.7,'#dff4de');sky.addColorStop(.71,'#76ad55');sky.addColorStop(1,'#436b35');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(255,255,255,.65)';for(let i=0;i<4;i++){const x=(i*287+(game?.time||0)*-3)% (w+180)-60,y=45+(i%2)*42;ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.arc(x+27,y+5,31,0,Math.PI*2);ctx.arc(x+58,y,21,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#527e46';for(let x=0;x<w;x+=55){ctx.beginPath();ctx.arc(x,groundY()+10,42,Math.PI,0);ctx.fill();}}
function drawBase(x,y,cat,hp){ctx.save();ctx.translate(x,y);ctx.fillStyle=cat?'#e9e3cc':'#443b55';ctx.strokeStyle='#151827';ctx.lineWidth=4;ctx.fillRect(-38,-88,76,88);ctx.strokeRect(-38,-88,76,88);ctx.fillStyle=cat?'#ffd447':'#ef476f';ctx.beginPath();ctx.moveTo(-47,-88);ctx.lineTo(0,-125);ctx.lineTo(47,-88);ctx.fill();ctx.stroke();ctx.fillStyle='#17192a';ctx.fillRect(-12,-35,24,35);ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(cat?'ฅ':'☠',0,-56);if(hp<=0){ctx.rotate(.12);ctx.globalAlpha=.5;}ctx.restore();}
function drawUnit(u){
  ctx.save();ctx.translate(u.x,u.y);if(u.hit)ctx.globalAlpha=.55;const big=['titan','emperor','paladin','chronos'].includes(u.unitType),size=big?26:21;
  ctx.fillStyle=u.color;ctx.strokeStyle='#17192a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-size-4,size,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-size*.8,-size-17);ctx.lineTo(-size*.55,-size-34);ctx.lineTo(-3,-size-21);ctx.moveTo(size*.8,-size-17);ctx.lineTo(size*.55,-size-34);ctx.lineTo(3,-size-21);ctx.fill();ctx.stroke();
  ctx.fillStyle='#17192a';ctx.beginPath();ctx.arc(-7,-size-6,2.5,0,7);ctx.arc(7,-size-6,2.5,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,-size+2,5,0,Math.PI);ctx.stroke();
  drawUnitGear(u.unitType,size);healthMini(u);ctx.restore();
}
function drawUnitGear(type,size){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#22263a';ctx.fillStyle='#4b526d';ctx.lineWidth=4;
  const sword=(color='#e8edf5')=>{ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(15,-30);ctx.lineTo(33,-67);ctx.stroke();ctx.strokeStyle='#7b502f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(11,-36);ctx.lineTo(23,-30);ctx.stroke();};
  const gun=(long=false)=>{ctx.fillStyle='#303745';ctx.fillRect(10,-42,long?35:27,11);ctx.fillRect(15,-31,9,16);ctx.fillStyle='#9ba5b7';ctx.fillRect(long?43:35,-40,13,5);};
  switch(type){
    case 'runner':ctx.strokeStyle='#ef476f';ctx.beginPath();ctx.moveTo(-24,-8);ctx.lineTo(-36,1);ctx.moveTo(22,-8);ctx.lineTo(35,1);ctx.stroke();break;
    case 'tank':ctx.fillStyle='#76acd0';ctx.fillRect(12,-55,17,53);ctx.strokeRect(12,-55,17,53);break;
    case 'fighter':sword();break;
    case 'mage':ctx.fillStyle='#865ac0';ctx.beginPath();ctx.moveTo(-22,-47);ctx.lineTo(0,-78);ctx.lineTo(20,-47);ctx.fill();ctx.fillStyle='#f3d66b';ctx.beginPath();ctx.arc(25,-58,8,0,7);ctx.fill();break;
    case 'ninja':ctx.fillStyle='#303044';ctx.fillRect(-20,-42,40,13);ctx.strokeStyle='#ccd1da';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,-22);ctx.lineTo(35,-45);ctx.moveTo(28,-22);ctx.lineTo(12,-45);ctx.stroke();break;
    case 'dragon':ctx.fillStyle='#4fa46f';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-22+i*18,-48);ctx.lineTo(-13+i*18,-67);ctx.lineTo(-5+i*18,-47);ctx.fill();}ctx.strokeStyle='#e95c52';ctx.beginPath();ctx.moveTo(22,-24);ctx.lineTo(42,-31);ctx.stroke();break;
    case 'gunner':gun(true);ctx.fillStyle='#6d7657';ctx.fillRect(-20,-55,40,10);break;
    case 'titan':ctx.strokeStyle='#8c3f3f';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-38,-27);ctx.moveTo(25,-5);ctx.lineTo(38,-27);ctx.stroke();break;
    case 'boxer':ctx.fillStyle='#e44f55';ctx.beginPath();ctx.arc(-25,-19,10,0,7);ctx.arc(25,-19,10,0,7);ctx.fill();break;
    case 'chef':ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-12,-58,12,0,7);ctx.arc(0,-64,14,0,7);ctx.arc(13,-58,12,0,7);ctx.fill();ctx.strokeStyle='#555';ctx.beginPath();ctx.arc(28,-18,13,0,Math.PI);ctx.stroke();break;
    case 'cosmic':ctx.strokeStyle='#4d7ac7';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-27,36,12,-.2,0,7);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(25,-60,5,0,7);ctx.fill();break;
    case 'emperor':ctx.fillStyle='#e1a91f';ctx.beginPath();ctx.moveTo(-22,-51);ctx.lineTo(-17,-73);ctx.lineTo(-4,-57);ctx.lineTo(7,-76);ctx.lineTo(19,-55);ctx.lineTo(23,-49);ctx.fill();ctx.stroke();sword('#ffd85c');break;
    case 'farmer':ctx.fillStyle='#b98b3e';ctx.fillRect(-27,-54,54,9);ctx.fillRect(-18,-64,36,12);ctx.strokeStyle='#6b4b27';ctx.beginPath();ctx.moveTo(27,-7);ctx.lineTo(35,-63);ctx.moveTo(30,-53);ctx.lineTo(45,-47);ctx.stroke();break;
    case 'sleepy':ctx.fillStyle='#8d83af';ctx.fillRect(-24,-4,48,18);ctx.fillStyle='#fff';ctx.font='bold 16px sans-serif';ctx.fillText('Z',23,-60);break;
    case 'pirate':ctx.fillStyle='#9b292f';ctx.beginPath();ctx.moveTo(-26,-50);ctx.lineTo(0,-72);ctx.lineTo(28,-50);ctx.fill();ctx.fillStyle='#222';ctx.fillRect(-17,-38,14,5);gun();break;
    case 'medic':ctx.fillStyle='#fff';ctx.fillRect(-19,-60,38,15);ctx.fillStyle='#e85568';ctx.fillRect(-4,-62,8,19);ctx.fillRect(-10,-56,20,7);break;
    case 'samurai':ctx.fillStyle='#444d62';ctx.beginPath();ctx.moveTo(-25,-49);ctx.lineTo(0,-68);ctx.lineTo(25,-49);ctx.fill();sword('#d9edf5');break;
    case 'rocket':ctx.fillStyle='#626979';ctx.fillRect(10,-48,43,14);ctx.fillStyle='#e35b43';ctx.beginPath();ctx.moveTo(53,-48);ctx.lineTo(65,-41);ctx.lineTo(53,-34);ctx.fill();break;
    case 'phantom':ctx.globalAlpha=.5;ctx.fillStyle='#794fa0';ctx.beginPath();ctx.arc(0,-25,34,0,7);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#d9c5ff';ctx.fillRect(-10,-65,20,5);break;
    case 'paladin':ctx.fillStyle='#d8d2a9';ctx.fillRect(-24,-57,48,12);ctx.fillStyle='#9f9a7a';ctx.fillRect(13,-45,20,42);sword();break;
    case 'phoenix':ctx.fillStyle='#ef5b35';ctx.beginPath();ctx.moveTo(-18,-42);ctx.lineTo(-42,-60);ctx.lineTo(-30,-28);ctx.lineTo(-48,-16);ctx.lineTo(-17,-20);ctx.fill();break;
    case 'chronos':ctx.strokeStyle='#2e8e91';ctx.lineWidth=4;ctx.beginPath();ctx.arc(25,-42,14,0,7);ctx.moveTo(25,-42);ctx.lineTo(25,-52);ctx.moveTo(25,-42);ctx.lineTo(34,-38);ctx.stroke();break;
  }ctx.restore();
}
function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);if(e.hit)ctx.globalAlpha=.5;ctx.fillStyle=e.color;ctx.strokeStyle='#2b1b27';ctx.lineWidth=3;
  const sizes={boar:28,gorilla:30,rhino:33,mech:31,demon:35},size=sizes[e.kind]||20;
  if(e.kind==='snake'){ctx.lineWidth=14;ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(-28,-5);ctx.bezierCurveTo(-18,-42,5,-3,22,-35);ctx.stroke();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(18,-40,3,0,7);ctx.fill();}
  else if(e.kind==='bird'){ctx.beginPath();ctx.arc(0,-24,size,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-12,-27);ctx.lineTo(-40,-43);ctx.lineTo(-25,-13);ctx.fill();ctx.stroke();}
  else if(e.kind==='ghost'){ctx.globalAlpha*=.7;ctx.beginPath();ctx.arc(0,-35,size+7,Math.PI,0);ctx.lineTo(size+7,-4);ctx.lineTo(18,-12);ctx.lineTo(8,-4);ctx.lineTo(-4,-12);ctx.lineTo(-16,-4);ctx.lineTo(-size-7,-12);ctx.closePath();ctx.fill();ctx.stroke();}
  else{ctx.beginPath();ctx.arc(0,-size,size,0,7);ctx.fill();ctx.stroke();if(e.kind==='rhino'){ctx.fillStyle='#eee';ctx.beginPath();ctx.moveTo(-32,-38);ctx.lineTo(-55,-50);ctx.lineTo(-30,-24);ctx.fill();}if(e.kind==='mech'){ctx.fillStyle='#e45b58';ctx.beginPath();ctx.arc(-8,-37,5,0,7);ctx.fill();ctx.fillStyle='#333';ctx.fillRect(-28,-8,12,13);ctx.fillRect(16,-8,12,13);}if(e.kind==='demon'){ctx.fillStyle='#241524';ctx.beginPath();ctx.moveTo(-25,-53);ctx.lineTo(-38,-79);ctx.lineTo(-8,-60);ctx.moveTo(25,-53);ctx.lineTo(38,-79);ctx.lineTo(8,-60);ctx.fill();}}
  ctx.fillStyle='#2b1b27';ctx.beginPath();ctx.arc(-7,-size-3,3,0,7);ctx.arc(7,-size-3,3,0,7);ctx.fill();
  if(e.kind==='boar'){ctx.fillStyle='#eee';ctx.fillRect(-29,-25,8,18);ctx.fillRect(21,-25,8,18);}if(e.kind==='gorilla'){ctx.strokeStyle='#3b302e';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-22,-15);ctx.lineTo(-38,-2);ctx.moveTo(22,-15);ctx.lineTo(38,-2);ctx.stroke();}
  healthMini(e);ctx.restore();
}
function healthMini(u){if(u.hp>=u.maxHp)return;ctx.fillStyle='#141525';ctx.fillRect(-22,4,44,5);ctx.fillStyle=u.side==='cat'?'#55d6be':'#ef476f';ctx.fillRect(-22,4,44*Math.max(0,u.hp/u.maxHp),5);}
function drawProjectile(p){ctx.fillStyle=p.color||'#f7dcff';ctx.shadowColor=p.color||'#b46cff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,7,0,7);ctx.fill();ctx.shadowBlur=0;}
function burst(x,y,color,count=5){for(let i=0;i<count;i++)game.particles.push({x,y:y-28,vx:(Math.random()-.5)*100,vy:-30-Math.random()*90,life:.35+Math.random()*.35,color});}
function drawParticle(p){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);ctx.globalAlpha=1;}

function updateUI(){if(!game)return;$('#money').textContent=Math.floor(game.money);$('#max-money').textContent=game.maxMoney;$('#money-bar').style.width=`${game.money/game.maxMoney*100}%`;$('#worker-level').textContent=game.workerLevel;$('#worker-cost').textContent=game.workerLevel>=8?'MAX':`${workerCost()} 🐟`;$('#worker-button').disabled=!game.running||game.workerLevel>=8||game.money<workerCost();$('#battle-time').textContent=`${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;setHealth('player',game.playerHp,game.playerMaxHp);setHealth('enemy',game.enemyHp,game.enemyMaxHp);unitButtons.forEach(b=>{const type=b.dataset.unit,u=UNIT_TYPES[type],cd=game.cooldowns[type]||0;b.disabled=!game.running||game.money<u.cost||cd>0;b.querySelector('.cooldown').style.height=`${cd/u.cooldown*100}%`;});document.querySelectorAll('.upgrade-button').forEach(b=>{const type=b.dataset.upgrade;b.disabled=!game.running||game.training[type]>=5||game.money<trainingCost(type);});}
function setHealth(side,hp,max){$(`#${side}-health-bar`).style.width=`${Math.max(0,hp/max*100)}%`;$(`#${side}-health-text`).textContent=`${Math.max(0,Math.ceil(hp)).toLocaleString()} / ${max.toLocaleString()}`;}

function initAudio(){if(!soundOn)return;if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A();}if(audio?.state==='suspended')audio.resume();}
function playTone(freq,duration=.1,type='square',volume=.06,delay=0){if(!soundOn)return;initAudio();if(!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.02);}
function playHit(volume){playTone(90,.07,'sawtooth',volume);}
function playJingle(notes,gap=.11){notes.forEach((n,i)=>playTone(n,.18,'triangle',.09,i*gap));}

renderMeta();resizeCanvas();draw();
