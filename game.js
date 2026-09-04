const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);
const CHARACTER_SPRITES = {
  runner:'runner.png', farmer:'farmer.png', tank:'tank.png', fighter:'fighter.png', boxer:'boxer.png', samurai:'samurai.png',
  chef:'chef.png', mage:'mage.png', medic:'medic.png', sleepy:'sleepy.png', pirate:'pirate.png',
  ninja:'ninja.png', dragon:'dragon.png', gunner:'gunner.png', titan:'titan.png', rocket:'rocket.png',
  phantom:'phantom.png', paladin:'paladin.png', phoenix:'phoenix.png', cosmic:'cosmic.png',
  emperor:'emperor.png', chronos:'chronos.png'
};
const spriteImages = Object.fromEntries(Object.entries(CHARACTER_SPRITES).map(([type,file]) => {
  const image = new Image(); image.src = `assets/characters/${file}`; return [type,image];
}));

const UNIT_TYPES = {
  runner: { cost: 50, hp: 80, damage: 14, speed: 58, range: 34, cooldown: 1.2, rate: .65, color: '#fff0bd', label: '날쌘냥', rarity:'기본' },
  tank: { cost: 120, hp: 360, damage: 22, speed: 25, range: 38, cooldown: 3.2, rate: 1.1, color: '#c8e7ff', label: '방패냥', rarity:'기본' },
  fighter: { cost: 200, hp: 210, damage: 72, speed: 37, range: 48, cooldown: 4.2, rate: 1.25, color: '#ffc3a7', label: '검객냥', rarity:'기본' },
  mage: { cost: 350, hp: 140, damage: 58, speed: 24, range: 145, cooldown: 6, rate: 1.55, color: '#e3c8ff', label: '별빛냥', rarity:'기본', ranged: true }
  ,ninja: { cost: 380, hp: 190, damage: 62, speed: 76, range: 42, cooldown: 5.2, rate: .42, color: '#c8c5df', label: '닌자냥', icon: '忍', desc: '초고속 연타', rarity: '레어' }
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
  ,medic: { cost: 290, hp: 280, damage: 0, heal: 95, speed: 32, range: 175, cooldown: 5.5, rate: 1.25, color: '#f7dce4', label: '의무냥', icon: '+', desc: '고등급 아군 우선 치료', rarity: 'EX', healer: true }
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
  demon: { hp: 3100, damage: 260, speed: 16, range: 145, rate: 1.55, reward: 520, color: '#672f58', ranged: true },
  wolf: { hp: 520, damage: 58, speed: 62, range: 42, rate: .72, reward: 105, color: '#65708b' },
  crab: { hp: 1450, damage: 105, speed: 14, range: 48, rate: 1.4, reward: 245, color: '#d95b53' },
  bat: { hp: 680, damage: 88, speed: 54, range: 105, rate: 1.05, reward: 155, color: '#514272', ranged: true },
  golem: { hp: 2400, damage: 185, speed: 12, range: 62, rate: 1.6, reward: 390, color: '#8d765f' },
  sorcerer: { hp: 1250, damage: 145, speed: 24, range: 175, rate: 1.4, reward: 280, color: '#4853a0', ranged: true },
  overlord: { hp: 5200, damage: 210, speed: 11, range: 135, rate: 1.5, reward: 1800, color: '#381448', ranged: true, boss: true, label:'마왕' },
  godOverlord: { hp: 8500, damage: 280, speed: 9, range: 165, rate: 1.4, reward: 3000, color: '#151b5c', ranged: true, boss: true, label:'신왕 제로스' }
};
const BOSS_STAGES = {9:'overlord',19:'godOverlord'};
const ENEMY_STAGE_POOLS = [
  ['pup'],['pup','bird'],['pup','bird','snake'],['bird','snake','boar'],['snake','boar','gorilla'],
  ['snake','boar','gorilla'],['boar','gorilla','ghost'],['gorilla','rhino','ghost'],['rhino','ghost','mech'],['rhino','ghost','demon'],
  ['wolf','gorilla','mech'],['wolf','bat','mech'],['crab','wolf','demon'],['crab','bat','golem'],['wolf','sorcerer','demon'],
  ['crab','golem','demon'],['wolf','bat','golem'],['crab','sorcerer','demon'],['golem','bat','demon'],['crab','sorcerer','golem']
];
const STAGES = [
  { name:'햇살 초원', enemyHp:1000, spawn:4.4, scale:.5, reward:100 },
  { name:'바람 언덕', enemyHp:1300, spawn:4.1, scale:.58, reward:140 },
  { name:'붉은 협곡', enemyHp:1650, spawn:3.8, scale:.66, reward:190 },
  { name:'달빛 늪지', enemyHp:2050, spawn:3.55, scale:.74, reward:250 },
  { name:'강철 도시', enemyHp:2500, spawn:3.3, scale:.82, reward:320 },
  { name:'얼음 성벽', enemyHp:2800, spawn:3.2, scale:.86, reward:410 },
  { name:'화염 분지', enemyHp:3300, spawn:3.05, scale:.94, reward:510 },
  { name:'폭풍 요새', enemyHp:3900, spawn:2.9, scale:1.02, reward:630 },
  { name:'황혼 왕국', enemyHp:4600, spawn:2.75, scale:1.1, reward:780 },
  { name:'별의 최후', enemyHp:5200, spawn:2.8, scale:1.12, reward:1000 },
  { name:'수정 동굴', enemyHp:5800, spawn:2.75, scale:1.18, reward:1200 },
  { name:'독안개 숲', enemyHp:6500, spawn:2.7, scale:1.24, reward:1420 },
  { name:'황금 사막', enemyHp:7200, spawn:2.65, scale:1.3, reward:1660 },
  { name:'심해 왕국', enemyHp:8000, spawn:2.6, scale:1.36, reward:1920 },
  { name:'천공 신전', enemyHp:8900, spawn:2.55, scale:1.42, reward:2200 },
  { name:'망각의 폐허', enemyHp:9800, spawn:2.5, scale:1.48, reward:2500 },
  { name:'오로라 설원', enemyHp:10800, spawn:2.65, scale:1.42, reward:2820 },
  { name:'태양의 용광로', enemyHp:11900, spawn:2.6, scale:1.48, reward:3160 },
  { name:'차원의 균열', enemyHp:13100, spawn:2.55, scale:1.54, reward:3520 },
  { name:'신들의 성채', enemyHp:14000, spawn:2.5, scale:1.6, reward:4000 }
];
const STAGE_THEMES = [
  { sky1:'#72c9f4',sky2:'#dff6d5',ground:'#63a34f',hill:'#4f873f',accent:'#fff2a8',kind:'sun' },
  { sky1:'#8dd9f7',sky2:'#e8fbff',ground:'#80ba68',hill:'#619b56',accent:'#ffffff',kind:'wind' },
  { sky1:'#9d263d',sky2:'#ef754e',ground:'#8b3e2d',hill:'#672a2b',accent:'#ffcf68',kind:'canyon' },
  { sky1:'#172a58',sky2:'#645486',ground:'#345968',hill:'#253b57',accent:'#fff2c7',kind:'moon' },
  { sky1:'#667385',sky2:'#c0a77b',ground:'#55585a',hill:'#3f4448',accent:'#f5b642',kind:'city' },
  { sky1:'#9ddcff',sky2:'#eefbff',ground:'#b7e4ef',hill:'#78bdd2',accent:'#ffffff',kind:'ice' },
  { sky1:'#6e1720',sky2:'#ee512f',ground:'#3d2827',hill:'#211b22',accent:'#ffb326',kind:'lava' },
  { sky1:'#252947',sky2:'#65718b',ground:'#46545b',hill:'#29363e',accent:'#d8e7ff',kind:'storm' },
  { sky1:'#4a1f58',sky2:'#d45c67',ground:'#42314d',hill:'#2e243e',accent:'#ffb66e',kind:'twilight' },
  { sky1:'#07081d',sky2:'#25245c',ground:'#28284a',hill:'#17172f',accent:'#a9dcff',kind:'space' },
  { sky1:'#25365f',sky2:'#80dff0',ground:'#536e91',hill:'#314668',accent:'#9ffff2',kind:'ice' },
  { sky1:'#193b34',sky2:'#80a968',ground:'#40533a',hill:'#293c30',accent:'#c8ff78',kind:'wind' },
  { sky1:'#e88a37',sky2:'#ffe09a',ground:'#b87535',hill:'#87502b',accent:'#fff1a8',kind:'sun' },
  { sky1:'#071e46',sky2:'#197ca2',ground:'#18526e',hill:'#0c3855',accent:'#74eaff',kind:'moon' },
  { sky1:'#79c8ff',sky2:'#f5f3d4',ground:'#bdad7a',hill:'#84775b',accent:'#ffffff',kind:'city' },
  { sky1:'#3b2d38',sky2:'#8b695e',ground:'#51463f',hill:'#302d2c',accent:'#d7c6aa',kind:'canyon' },
  { sky1:'#342b67',sky2:'#a9e6ff',ground:'#c6eff4',hill:'#7cc4db',accent:'#edffff',kind:'ice' },
  { sky1:'#8b201c',sky2:'#ff9a3c',ground:'#572b23',hill:'#2e1b20',accent:'#fff075',kind:'lava' },
  { sky1:'#130d35',sky2:'#7c3bb3',ground:'#322755',hill:'#20173e',accent:'#e4a8ff',kind:'storm' },
  { sky1:'#03040f',sky2:'#18255d',ground:'#242342',hill:'#111126',accent:'#ffe875',kind:'space' }
];
const BASIC_UNITS = ['runner','tank','fighter','mage'];
const RARITY_RANK = {'기본':0,'노멀':1,'EX':2,'레어':3,'슈퍼 레어':4,'울트라 슈퍼 레어':5,'레전드 레어':6};
const GACHA_POOLS = {
  '노멀':['boxer','farmer','sleepy'], 'EX':['chef','pirate','medic'], '레어':['ninja','gunner','samurai','rocket'], '슈퍼 레어':['dragon','titan','phantom','paladin'], '울트라 슈퍼 레어':['cosmic','phoenix'], '레전드 레어':['emperor','chronos']
};
const GACHA_RATES = [
  {rarity:'노멀',rate:50},{rarity:'EX',rate:25},{rarity:'레어',rate:9},{rarity:'슈퍼 레어',rate:10.7},{rarity:'울트라 슈퍼 레어',rate:5},{rarity:'레전드 레어',rate:.3}
];
const GOLDEN_GACHA_RATES = GACHA_RATES.map(item=>({...item,rate:item.rate*(RARITY_RANK[item.rarity]>=RARITY_RANK['레어']?5:1)}));
const GACHA_UNITS = Object.values(GACHA_POOLS).flat();
const SAVE_KEY = 'cat-fortress-save-v2';
const AUTH_ACCOUNTS_KEY = 'cat-fortress-accounts-v1';
const AUTH_SESSION_KEY = 'cat-fortress-session-v1';
const AUTH_REPAIR_KEY = 'cat-fortress-account-repair-v2';
const DEVELOPER_ID = 'doonyoon';
const DEVELOPER_PASSWORD = 'kk45537606';
repairDuplicatedAccountSaves();
let activeUser = localStorage.getItem(AUTH_SESSION_KEY) || '';
if(activeUser&&activeUser!==DEVELOPER_ID&&!loadAccounts()[activeUser]){activeUser='';localStorage.removeItem(AUTH_SESSION_KEY);}

let progress = loadProgress();
let selectedStage = Math.min(progress.highestStage, STAGES.length-1);
let selectedLineupSlot = 0;

let game = null, animationId = null, lastTime = 0, audio = null, soundOn = true;
let unitButtons = [];

function createGame() {
  const settings = STAGES[selectedStage];
  const money=300+selectedStage*50,maxMoney=1300+selectedStage*110,income=55+selectedStage*4,playerHp=3600+selectedStage*250;
  const bossType=BOSS_STAGES[selectedStage]||null;
  return { running:true, time:0, money, maxMoney, income, workerLevel:1, playerHp, playerMaxHp:playerHp, enemyHp:settings.enemyHp, enemyMaxHp:settings.enemyHp, enemyTimer:2.8, enemySpawn:settings.spawn, enemyScale:settings.scale, spawnCount:0, bossType, bossName:bossType?ENEMY_TYPES[bossType].label:'', bossSpawned:false, bossDefeated:!bossType, bossWarning:0, units:[], enemies:[], particles:[], projectiles:[], cooldowns:Object.fromEntries(progress.loadout.map(type=>[type,0])), training:Object.fromEntries(progress.loadout.map(type=>[type,0])), shake:0, result:null };
}

function resizeCanvas() {
  const battlefield=$('#battlefield'),width=battlefield.clientWidth,height=battlefield.clientHeight;
  if(!width||!height)return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0); canvas.viewWidth=width; canvas.viewHeight=height;
}
new ResizeObserver(resizeCanvas).observe($('#battlefield'));
window.addEventListener('resize',resizeCanvas);
window.addEventListener('orientationchange',()=>setTimeout(()=>{resizeCanvas();draw();},150));

$('#start-button').addEventListener('click', startBattle);
$('#worker-button').addEventListener('click', upgradeWorker);
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#close-help').addEventListener('click', () => $('#help-dialog').close());
$('#sound-button').addEventListener('click', () => { soundOn=!soundOn; $('#sound-button').textContent=soundOn?'🔊':'🔇'; $('#sound-button').ariaLabel=soundOn?'소리 끄기':'소리 켜기'; if(soundOn) initAudio(); });
$('#gacha-button').addEventListener('click', openGacha);
$('#close-gacha').addEventListener('click', () => $('#gacha-dialog').close());
$('#draw-button').addEventListener('click', drawGacha);
$('#draw-ten-button').addEventListener('click', drawTenGacha);
$('#golden-draw-button').addEventListener('click', drawGoldenGacha);
$('#exit-battle').addEventListener('click', exitBattle);
$('#coupon-form').addEventListener('submit', redeemCoupon);
$('#lineup-button').addEventListener('click', openLineup);
$('#close-lineup').addEventListener('click', () => $('#lineup-dialog').close());
$('#auth-form').addEventListener('submit', loginAccount);
$('#signup-button').addEventListener('click', signupAccount);
$('#reset-password-button').addEventListener('click', resetPassword);
$('#logout-button').addEventListener('click', logoutAccount);

function loadAccounts(){try{return JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY))||{};}catch{return {};}}
function repairDuplicatedAccountSaves(){
  if(localStorage.getItem(AUTH_REPAIR_KEY))return;
  const accounts=loadAccounts();
  const users=Object.entries(accounts).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
  users.slice(1).forEach(([id])=>localStorage.removeItem(`${SAVE_KEY}:${id}`));
  localStorage.setItem(AUTH_REPAIR_KEY,'done');
}
function progressKey(){return activeUser?`${SAVE_KEY}:${activeUser}`:SAVE_KEY;}
function isDeveloperAccount(){return activeUser===DEVELOPER_ID;}
function developerProgress(){const owned=Object.keys(UNIT_TYPES);return {gold:Number.MAX_SAFE_INTEGER,highestStage:STAGES.length-1,cleared:STAGES.map((_,index)=>index),owned,loadout:[...BASIC_UNITS],levels:Object.fromEntries(owned.map(type=>[type,99])),redeemedCodes:['9027']};}
async function hashPassword(password){const data=new TextEncoder().encode(password);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');}
function authValues(){return {id:$('#auth-id').value.trim(),password:$('#auth-password').value,message:$('#auth-message')};}
function validAccount(id,password,message){message.className='';if(!/^[A-Za-z0-9가-힣_]{3,16}$/.test(id)){message.textContent='아이디는 3~16자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요.';return false;}if(password.length<4){message.textContent='비밀번호는 4자 이상 입력하세요.';return false;}return true;}
async function signupAccount(){const {id,password,message}=authValues();if(!validAccount(id,password,message))return;if(id===DEVELOPER_ID){message.textContent='예약된 개발자 아이디예요.';return;}const accounts=loadAccounts();if(accounts[id]){message.textContent='이미 사용 중인 아이디예요.';return;}const isFirstAccount=Object.keys(accounts).length===0;accounts[id]={password:await hashPassword(password),createdAt:Date.now()};localStorage.setItem(AUTH_ACCOUNTS_KEY,JSON.stringify(accounts));const oldSave=localStorage.getItem(SAVE_KEY);if(isFirstAccount&&oldSave&&!localStorage.getItem(`${SAVE_KEY}:${id}`))localStorage.setItem(`${SAVE_KEY}:${id}`,oldSave);message.textContent='회원가입 완료! 자동으로 로그인했어요.';message.className='success';activateAccount(id);}
async function loginAccount(event){event.preventDefault();const {id,password,message}=authValues();if(!validAccount(id,password,message))return;if(id===DEVELOPER_ID){if(password!==DEVELOPER_PASSWORD){message.textContent='아이디 또는 비밀번호가 맞지 않아요.';return;}activateAccount(id);return;}const passwordHash=await hashPassword(password),account=loadAccounts()[id];if(!account||account.password!==passwordHash){message.textContent='아이디 또는 비밀번호가 맞지 않아요.';return;}activateAccount(id);}
async function resetPassword(){const {id,password,message}=authValues();if(!validAccount(id,password,message))return;if(id===DEVELOPER_ID){message.textContent='개발자 계정 비밀번호는 변경할 수 없어요.';return;}const accounts=loadAccounts();if(!accounts[id]){message.textContent='저장된 계정을 찾을 수 없어요.';return;}if(!window.confirm(`${id} 계정의 비밀번호를 새로 입력한 비밀번호로 바꿀까요?`))return;accounts[id].password=await hashPassword(password);accounts[id].passwordChangedAt=Date.now();localStorage.setItem(AUTH_ACCOUNTS_KEY,JSON.stringify(accounts));message.textContent='비밀번호를 변경했어요. 자동으로 로그인합니다.';message.className='success';activateAccount(id);}
function activateAccount(id){activeUser=id;localStorage.setItem(AUTH_SESSION_KEY,id);progress=loadProgress();selectedStage=Math.min(progress.highestStage,STAGES.length-1);game=null;setAuthView();renderMeta();requestAnimationFrame(()=>{resizeCanvas();draw();});}
function logoutAccount(){if(game?.running&&!window.confirm('전투를 종료하고 로그아웃할까요?'))return;game=null;cancelAnimationFrame(animationId);activeUser='';localStorage.removeItem(AUTH_SESSION_KEY);document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());setAuthView();}
function setAuthView(){const loggedIn=Boolean(activeUser);$('#auth-screen').classList.toggle('hidden',loggedIn);document.querySelector('.app').classList.toggle('auth-locked',!loggedIn);$('#account-name').textContent=loggedIn?`${activeUser}님`:'';if(!loggedIn){$('#auth-form').reset();$('#auth-message').textContent='';$('#auth-message').className='';}}

function loadProgress(){
  if(isDeveloperAccount())return developerProgress();
  const fallback={gold:0,highestStage:0,cleared:[],owned:[...BASIC_UNITS],loadout:[...BASIC_UNITS],levels:{runner:1,tank:1,fighter:1,mage:1},redeemedCodes:[]};
  try{const saved=JSON.parse(localStorage.getItem(progressKey()));if(!saved)return fallback;const owned=[...new Set([...BASIC_UNITS,...(saved.owned||[])])],loadout=(saved.loadout||BASIC_UNITS).filter(type=>owned.includes(type)).slice(0,4);while(loadout.length<4){const next=BASIC_UNITS.find(type=>!loadout.includes(type));loadout.push(next);}return {...fallback,...saved,owned,loadout,levels:{...fallback.levels,...(saved.levels||{})}};}catch{return fallback;}
}
function saveProgress(){if(!isDeveloperAccount())localStorage.setItem(progressKey(),JSON.stringify(progress));renderMeta();}
function renderMeta(){
  $('#gold').textContent=isDeveloperAccount()?'∞':progress.gold.toLocaleString();
  $('#stage-picker').innerHTML=STAGES.map((s,i)=>`<button class="stage-button ${i===selectedStage?'selected':''}" data-stage="${i}" ${i>progress.highestStage?'disabled':''}>${i+1}${progress.cleared.includes(i)?' ✓':''}</button>`).join('');
  document.querySelectorAll('.stage-button').forEach(b=>b.onclick=()=>{selectedStage=Number(b.dataset.stage);renderMeta();});
  const stage=STAGES[selectedStage];$('#stage-description').textContent=`${selectedStage+1}. ${stage.name} · 승리 보상 ${stage.reward} 골드`;$('#stage-label').textContent=`STAGE ${selectedStage+1}`;
  renderDeck();renderCollection();
}
function renderDeck(){
  $('#unit-deck').innerHTML=progress.loadout.map(type=>{const u=UNIT_TYPES[type];return `<button class="unit-card" data-unit="${type}" type="button"><i class="rarity-badge ${rarityClass(u.rarity)}">${u.rarity}</i>${unitPortrait(type)}<strong>${u.label} <sup>Lv.${progress.levels[type]||1}</sup></strong><small>${u.desc||({runner:'빠른 돌격',tank:'높은 체력',fighter:'강한 공격',mage:'원거리 공격'}[type])}</small><em>${u.cost} 🐟</em><i class="cooldown"></i></button>`;}).join('');
  unitButtons=[...document.querySelectorAll('.unit-card')];unitButtons.forEach(b=>b.addEventListener('click',()=>summon(b.dataset.unit)));
}
function unitIcon(type){return UNIT_TYPES[type].icon||({runner:'ฅ',tank:'◉',fighter:'⚔',mage:'✦'}[type]);}
function unitPortrait(type){const file=CHARACTER_SPRITES[type];return file?`<span class="unit-portrait sprite" style="background-image:url('assets/characters/${file}')"></span>`:`<span class="unit-portrait ${type}">${unitIcon(type)}</span>`;}
function rarityClass(rarity){return rarity==='레전드 레어'?'legend':rarity==='울트라 슈퍼 레어'?'ultra':rarity==='슈퍼 레어'?'super':rarity==='레어'?'rare':rarity==='EX'?'ex':'normal';}
function renderCollection(){if(!$('#collection'))return;$('#collection').innerHTML=GACHA_UNITS.map(type=>{const u=UNIT_TYPES[type],owned=progress.owned.includes(type);return `<span class="${owned?'owned':''}"><b>${u.rarity}</b>${owned?u.label:'???'}<br>${owned?`Lv.${progress.levels[type]}`:'미획득'}</span>`;}).join('');}
function openLineup(){selectedLineupSlot=0;renderLineup();$('#lineup-dialog').showModal();}
function renderLineup(){
  $('#lineup-slots').innerHTML=progress.loadout.map((type,index)=>{const u=UNIT_TYPES[type];return `<button class="slot-card ${index===selectedLineupSlot?'selected':''}" data-slot="${index}" type="button"><small>SLOT ${index+1}</small>${unitPortrait(type)}<strong>${u.label}</strong><small>${u.rarity} · ${u.cost}🐟</small></button>`;}).join('');
  $('#roster').innerHTML=progress.owned.map(type=>{const u=UNIT_TYPES[type];return `<button class="roster-card ${progress.loadout.includes(type)?'equipped':''}" data-roster="${type}" type="button">${unitPortrait(type)}<strong>${u.label}</strong><small>${u.rarity} · ${u.cost}🐟</small></button>`;}).join('');
  document.querySelectorAll('.slot-card').forEach(button=>button.onclick=()=>{selectedLineupSlot=Number(button.dataset.slot);renderLineup();});
  document.querySelectorAll('.roster-card').forEach(button=>button.onclick=()=>equipUnit(button.dataset.roster));
}
function equipUnit(type){const other=progress.loadout.indexOf(type),current=progress.loadout[selectedLineupSlot];if(other>=0){progress.loadout[other]=current;}progress.loadout[selectedLineupSlot]=type;saveProgress();renderLineup();}
function setGachaButtons(disabled=false){$('#draw-button').disabled=disabled||(!isDeveloperAccount()&&progress.gold<300);$('#draw-ten-button').disabled=disabled||(!isDeveloperAccount()&&progress.gold<3000);$('#golden-draw-button').disabled=disabled||(!isDeveloperAccount()&&progress.gold<1000);}
function openGacha(){renderCollection();$('#gacha-result').className='gacha-result';$('#gacha-result').textContent='전설의 고양이에게 도전해 보세요!';$('#gacha-stage').className='gacha-stage';$('#confetti').innerHTML='';$('#coupon-message').textContent='특별 코드를 입력해 보세요.';$('#coupon-message').className='';setGachaButtons();$('#gacha-dialog').showModal();}
function rollGacha(randomValue=Math.random(),rates=GACHA_RATES){
  const total=rates.reduce((sum,item)=>sum+item.rate,0),roll=Math.min(total-Number.EPSILON,randomValue*total);
  let cursor=0,rarity=rates[rates.length-1].rarity;
  for(const item of rates){cursor+=item.rate;if(roll<cursor){rarity=item.rarity;break;}}
  const pool=GACHA_POOLS[rarity];return pool[Math.floor(Math.random()*pool.length)];
}
function drawGacha(){performGacha(1);}
function drawTenGacha(){performGacha(10);}
function drawGoldenGacha(){performGacha(1,true);}
function performGacha(count,golden=false){
  const cost=golden?1000:count*300;if(!isDeveloperAccount()&&progress.gold<cost)return;if(!isDeveloperAccount())progress.gold-=cost;
  const rates=golden?GOLDEN_GACHA_RATES:GACHA_RATES,results=Array.from({length:count},()=>{const type=rollGacha(Math.random(),rates),isNew=!progress.owned.includes(type);if(isNew){progress.owned.push(type);progress.levels[type]=1;}else progress.levels[type]=(progress.levels[type]||1)+1;return {type,isNew,level:progress.levels[type],rarity:UNIT_TYPES[type].rarity};});
  const best=results.reduce((a,b)=>(RARITY_RANK[b.rarity]||0)>(RARITY_RANK[a.rarity]||0)?b:a),capsule=$('#capsule'),stage=$('#gacha-stage'),resultBox=$('#gacha-result');
  capsule.classList.add('drawing');stage.className=golden?'gacha-stage golden':'gacha-stage';$('#confetti').innerHTML='';resultBox.className='gacha-result';resultBox.textContent=golden?'황금빛 기운을 모으는 중...':count===10?'10개의 황금 발바닥을 여는 중...':'기운을 모으는 중...';setGachaButtons(true);playJingle(golden?[392,523,659,784,1047]:[262,330,392,494,587,698],.075);
  setTimeout(()=>{capsule.classList.remove('drawing');stage.classList.add('revealing',best.rarity==='레전드 레어'?'legend':best.rarity==='울트라 슈퍼 레어'?'ultra':best.rarity==='슈퍼 레어'?'super':'normal');createConfetti(best.rarity);playRevealSound(best.rarity);},750);
  setTimeout(()=>{stage.classList.remove('revealing');if(count===1){const item=results[0];resultBox.innerHTML=`${golden?'<b>✨ 황금 뽑기 ✨</b><br>':''}<strong>${item.rarity} · ${UNIT_TYPES[item.type].label}</strong><br>${item.isNew?'새 캐릭터 획득!':`중복 획득! Lv.${item.level} 강화`}`;}else{resultBox.className='gacha-result ten-results';resultBox.innerHTML=results.map((item,index)=>`<span><b>${index+1}. ${item.rarity}</b><br>${UNIT_TYPES[item.type].label}<em>${item.isNew?'NEW':`Lv.${item.level}`}</em></span>`).join('');}saveProgress();setGachaButtons();},1500);
}
function createConfetti(rarity){
  const colors=rarity==='레전드 레어'?['#ffd447','#fff','#ff8c42']:rarity==='울트라 슈퍼 레어'?['#67dbff','#a98cff','#fff']:['#ffd447','#ef476f','#55d6be','#8b7cff'];
  const count=rarity==='레전드 레어'?45:28;$('#confetti').innerHTML=Array.from({length:count},(_,i)=>{const angle=Math.PI*2*i/count,distance=65+Math.random()*70;return `<i style="--x:${Math.cos(angle)*distance}px;--y:${Math.sin(angle)*distance}px;--rotate:${Math.random()*180}deg;--color:${colors[i%colors.length]}"></i>`;}).join('');
}
function playRevealSound(rarity){const notes=rarity==='레전드 레어'?[523,659,784,1047,1319]:rarity==='울트라 슈퍼 레어'?[440,554,659,880]:rarity==='슈퍼 레어'?[392,494,659]:[330,440,523];playJingle(notes,.09);}
function redeemCoupon(event){
  event.preventDefault();const input=$('#coupon-code'),message=$('#coupon-message'),code=input.value.trim();message.className='';
  if(code!=='9027'){message.textContent='존재하지 않는 코드예요.';message.classList.add('error');playTone(140,.18,'sawtooth',.05);return;}
  if(progress.redeemedCodes.includes(code)){message.textContent='이미 사용한 코드예요.';message.classList.add('error');return;}
  progress.redeemedCodes.push(code);progress.gold+=10000;saveProgress();message.textContent='코드 성공! 10,000골드를 받았어요.';message.classList.add('success');input.value='';setGachaButtons();createConfetti('레전드 레어');playJingle([523,659,784,1047],.1);
}

function startBattle() {
  initAudio();resizeCanvas();game=createGame(); $('#stage-label').textContent=`STAGE ${selectedStage+1}`; $('#start-overlay').classList.add('hidden'); $('#battle-message').classList.add('hidden'); $('#exit-battle').classList.remove('hidden'); $('#training-panel').classList.remove('hidden'); renderTraining(); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); playJingle([392,523,659]);
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
  game.time+=dt;game.bossWarning=Math.max(0,game.bossWarning-dt); game.money=Math.min(game.maxMoney,game.money+game.income*dt); game.enemyTimer-=dt;
  Object.keys(game.cooldowns).forEach(k=>game.cooldowns[k]=Math.max(0,game.cooldowns[k]-dt));
  if(game.enemyTimer<=0){ spawnEnemy(); game.enemyTimer=game.enemySpawn*(.88+Math.random()*.34)*Math.max(.78,1-game.time/600); }
  updateArmy(game.units,game.enemies,1,dt); updateArmy(game.enemies,game.units,-1,dt);
  updateProjectiles(dt);
  game.projectiles=game.projectiles.filter(p=>p.life>0);
  game.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=80*dt;p.life-=dt;}); game.particles=game.particles.filter(p=>p.life>0); game.shake=Math.max(0,game.shake-dt*12);
  removeDead(); if(game.playerHp<=0) finish(false); if(game.enemyHp<=0) finish(true);
}
function updateArmy(army,opponents,direction,dt) {
  const width=canvas.viewWidth||800;
  army.forEach(unit=>{
    unit.attack-=dt; unit.hit=Math.max(0,(unit.hit||0)-dt);unit.actionTime=Math.max(0,(unit.actionTime||0)-dt); const target=findTarget(unit,opponents,direction);
    if(unit.healer){updateHealer(unit,army,direction,dt);return;}
    const baseX=direction===1?width-70:70; const baseInRange=Math.abs(baseX-unit.x)<=unit.range;
    if(target||baseInRange){
      if(unit.attack<=0){ unit.attack=unit.rate; unit.flash=.12;unit.actionTime=.55; if(target){ if(unit.ranged) shoot(unit,target); else damage(target,unit.damage,unit.x,unit.y); } else { if(direction===1){if(canDamageEnemyBase())game.enemyHp-=unit.damage;}else game.playerHp-=unit.damage; burst(baseX,unit.y,direction===1?'#ef476f':'#55d6be'); game.shake=3; playHit(.08); } }
    } else unit.x+=unit.speed*direction*dt;
    unit.flash=Math.max(0,(unit.flash||0)-dt);
  });
}
function updateHealer(unit,army,direction,dt){
  const wounded=army.filter(ally=>ally!==unit&&ally.hp>0&&ally.hp<ally.maxHp).sort((a,b)=>{
    const rarity=(RARITY_RANK[b.rarity]||0)-(RARITY_RANK[a.rarity]||0);if(rarity)return rarity;
    const healthRatio=a.hp/a.maxHp-b.hp/b.maxHp;if(healthRatio)return healthRatio;
    return Math.abs(a.x-unit.x)-Math.abs(b.x-unit.x);
  });
  const target=wounded[0];
  if(target){
    const distance=Math.abs(target.x-unit.x);
    if(distance<=unit.range){if(unit.attack<=0){unit.attack=unit.rate;unit.actionTime=.65;const amount=Math.min(unit.heal,target.maxHp-target.hp);target.hp+=amount;healingBurst(target.x,target.y,amount);}}
    else unit.x+=Math.sign(target.x-unit.x)*unit.speed*dt;
    return;
  }
  const allies=army.filter(ally=>ally!==unit),front=allies.sort((a,b)=>direction===1?b.x-a.x:a.x-b.x)[0];
  const followX=front?front.x-direction*75:unit.x+direction*20;if(Math.abs(followX-unit.x)>10)unit.x+=Math.sign(followX-unit.x)*unit.speed*.55*dt;
}
function healingBurst(x,y,amount){for(let i=0;i<8;i++)game.particles.push({x:x+(Math.random()-.5)*28,y:y-30-Math.random()*25,vx:(Math.random()-.5)*20,vy:-18-Math.random()*25,life:.55+Math.random()*.25,color:'#65f0b5'});playTone(660,.12,'sine',.045);setTimeout(()=>playTone(880,.16,'sine',.04),70);}
function findTarget(unit,opponents,direction){ return opponents.filter(e=>direction===1?e.x>=unit.x:e.x<=unit.x).sort((a,b)=>Math.abs(a.x-unit.x)-Math.abs(b.x-unit.x)).find(e=>Math.abs(e.x-unit.x)<=unit.range); }
function shoot(unit,target){ game.projectiles.push({x:unit.x,y:unit.y-35,speed:230,direction:target.x>=unit.x?1:-1,targetId:target.id,targetSide:target.side,damage:unit.damage,life:4,color:unit.side==='cat'?'#f7dcff':'#ff7b8d'}); playTone(unit.side==='cat'?700:180,.08,'sine',.04); }
function updateProjectiles(dt){
  const width=canvas.viewWidth||800;
  game.projectiles.forEach(projectile=>{
    projectile.life-=dt;const targets=projectile.targetSide==='cat'?game.units:game.enemies;
    let target=targets.find(unit=>unit.id===projectile.targetId&&unit.hp>0);
    if(!target&&targets.length){target=[...targets].filter(unit=>unit.hp>0).sort((a,b)=>Math.abs(a.x-projectile.x)-Math.abs(b.x-projectile.x))[0];projectile.targetId=target?.id;}
    const targetX=target?target.x:(projectile.targetSide==='cat'?70:width-70),targetY=target?target.y-30:groundY()-45;
    const dx=targetX-projectile.x,dy=targetY-projectile.y,distance=Math.hypot(dx,dy),step=projectile.speed*dt;
    if(distance<=step+12){
      if(target)damage(target,projectile.damage,target.x,target.y);else{if(projectile.targetSide==='cat')game.playerHp-=projectile.damage;else if(canDamageEnemyBase())game.enemyHp-=projectile.damage;burst(targetX,targetY,projectile.color);game.shake=3;}
      projectile.life=0;return;
    }
    projectile.x+=dx/distance*step;projectile.y+=dy/distance*step;
  });
}
function damage(target,amount,x,y){ target.hp-=amount; target.hit=.12; burst(x,y,target.side==='cat'?'#fff0bd':'#ff9d76'); playHit(.035); }
function canDamageEnemyBase(){return !game.bossType||game.bossDefeated;}
function removeDead(){
  game.enemies=game.enemies.filter(e=>{if(e.hp>0)return true;if(e.boss){game.bossDefeated=true;game.bossWarning=2.5;playJingle([784,659,523,392],.12);}game.money=Math.min(game.maxMoney,game.money+e.reward);burst(e.x,e.y,e.boss?'#ff5ee5':'#ffd447',e.boss?35:10);return false;});
  game.units=game.units.filter(e=>{if(e.hp>0)return true;burst(e.x,e.y,'#dff6ff',8);return false;});
}
function summon(type){ if(!game?.running)return;const u=UNIT_TYPES[type],level=progress.levels[type]||1,training=game.training[type]||0,boost=(1+(level-1)*.08)*(1+training*.15);if(game.money<u.cost||game.cooldowns[type]>0)return;game.money-=u.cost;game.cooldowns[type]=u.cooldown;game.units.push({...u,unitType:type,id:crypto.randomUUID(),side:'cat',x:82+Math.random()*8,y:groundY(),attack:.25,hp:Math.round(u.hp*boost),maxHp:Math.round(u.hp*boost),damage:Math.round(u.damage*boost),heal:Math.round((u.heal||0)*boost)});playTone(440,.1,'triangle',.08); }
function spawnEnemy(){
  const pool=ENEMY_STAGE_POOLS[selectedStage];game.spawnCount++;
  const normalPool=selectedStage>=4&&pool.length>1?pool.slice(0,-1):pool;
  let type=normalPool[Math.floor(Math.random()*normalPool.length)];
  if(game.bossType&&game.spawnCount===10&&!game.bossSpawned){type=game.bossType;game.bossSpawned=true;game.bossWarning=3;playJingle([196,165,131,98],.16);}
  else if(selectedStage>=4&&game.spawnCount%10===0)type=pool[pool.length-1];
  const e=ENEMY_TYPES[type],waveBoost=1+Math.min(.2,game.time/360);
  game.enemies.push({...e,id:crypto.randomUUID(),side:'enemy',kind:type,x:(canvas.viewWidth||800)-82,y:groundY(),attack:.4,hp:Math.round(e.hp*game.enemyScale*waveBoost),maxHp:Math.round(e.hp*game.enemyScale*waveBoost),damage:Math.round(e.damage*game.enemyScale*waveBoost)});
}
function upgradeWorker(){ if(!game?.running||game.workerLevel>=8)return;const cost=workerCost();if(game.money<cost)return;game.money-=cost;game.workerLevel++;game.income+=18;game.maxMoney+=300;playJingle([523,659]); }
function workerCost(){return 120+(game?.workerLevel||1)*70;}
function trainingCost(type){const level=game?.training[type]||0;return Math.round((60+UNIT_TYPES[type].cost*.35)*Math.pow(1.45,level)/10)*10;}
function renderTraining(){
  if(!game)return;$('#upgrade-deck').innerHTML=progress.loadout.map(type=>`<button class="upgrade-button" data-upgrade="${type}" type="button"><strong>${UNIT_TYPES[type].label} +${game.training[type]}</strong><span>${game.training[type]>=5?'MAX':`${trainingCost(type)} 🐟`}</span></button>`).join('');
  document.querySelectorAll('.upgrade-button').forEach(button=>button.onclick=()=>upgradeUnit(button.dataset.upgrade));
}
function upgradeUnit(type){
  if(!game?.running||game.training[type]>=5)return;const cost=trainingCost(type);if(game.money<cost)return;game.money-=cost;game.training[type]++;
  game.units.filter(unit=>unit.unitType===type).forEach(unit=>{const oldMax=unit.maxHp;unit.maxHp=Math.round(unit.maxHp*1.15);unit.hp=Math.round(unit.hp+unit.maxHp-oldMax);unit.damage=Math.round(unit.damage*1.15);if(unit.heal)unit.heal=Math.round(unit.heal*1.15);});
  renderTraining();playJingle([440,554,659],.07);
}
function finish(win){
  game.running=false;game.result=win;$('#exit-battle').classList.add('hidden');$('#training-panel').classList.add('hidden');let reward=0;
  if(win){reward=STAGES[selectedStage].reward;progress.gold+=reward;if(!progress.cleared.includes(selectedStage))progress.cleared.push(selectedStage);progress.highestStage=Math.max(progress.highestStage,Math.min(STAGES.length-1,selectedStage+1));saveProgress();}
  const box=$('#battle-message');box.innerHTML=`<span>${win?'승리!':'패배...'}</span>${win?`<small>+${reward} 골드 🪙</small>`:''}<button class="main-button" id="retry-button">스테이지 선택</button>`;box.classList.remove('hidden');
  $('#retry-button').onclick=()=>{$('#battle-message').classList.add('hidden');$('#start-overlay').classList.remove('hidden');renderMeta();};playJingle(win?[523,659,784,1047]:[330,247,196],.18);
}
function groundY(){return (canvas.viewHeight||400)*.77;}

function draw(){ const w=canvas.viewWidth||800,h=canvas.viewHeight||400;ctx.clearRect(0,0,w,h);ctx.save();if(game?.shake)ctx.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake);drawBackground(w,h);drawBase(55,groundY(),true,game?.playerHp??2500);drawBase(w-55,groundY(),false,game?.enemyHp??2500);if(game){game.units.forEach(drawUnit);game.enemies.forEach(drawEnemy);game.projectiles.forEach(drawProjectile);game.particles.forEach(drawParticle);if(game.bossWarning>0){ctx.fillStyle=game.bossDefeated?'#ffe56e':'#ff64db';ctx.font=`${Math.min(34,w/18)}px "Black Han Sans",sans-serif`;ctx.textAlign='center';ctx.fillText(game.bossDefeated?`${game.bossName} 격파!`:`${game.bossName} 강림!`,w/2,70);}}ctx.restore(); }
function drawBackground(w,h){
  const theme=STAGE_THEMES[selectedStage]||STAGE_THEMES[0],ground=groundY();
  const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,theme.sky1);sky.addColorStop(1,theme.sky2);ctx.fillStyle=sky;ctx.fillRect(0,0,w,ground);
  ctx.fillStyle=theme.accent;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(w*.78,h*.2,theme.kind==='moon'?24:31,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  if(['space','twilight','moon'].includes(theme.kind)){ctx.fillStyle='#fff';for(let i=0;i<26;i++){const x=(i*83)%w,y=18+(i*47)%(ground*.62),r=i%5===0?2:1;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}}
  if(['sun','wind'].includes(theme.kind)){ctx.fillStyle='rgba(255,255,255,.62)';for(let i=0;i<4;i++){const x=(i*287+(game?.time||0)*-3)%(w+180)-60,y=45+(i%2)*42;ctx.beginPath();ctx.arc(x,y,22,0,7);ctx.arc(x+27,y+5,29,0,7);ctx.arc(x+56,y,19,0,7);ctx.fill();}}
  ctx.fillStyle=theme.hill;for(let x=-80;x<w+100;x+=150){ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(x+75,ground-80-(x%3)*12);ctx.lineTo(x+155,ground);ctx.fill();}
  if(theme.kind==='canyon'){ctx.fillStyle='#b84b32';for(let x=20;x<w;x+=180){ctx.fillRect(x,ground-105,42,105);ctx.beginPath();ctx.moveTo(x-18,ground-105);ctx.lineTo(x+22,ground-145);ctx.lineTo(x+61,ground-105);ctx.fill();}}
  if(theme.kind==='city'){ctx.fillStyle='#343a42';for(let x=0;x<w;x+=75){const bh=70+(x%4)*15;ctx.fillRect(x,ground-bh,58,bh);ctx.fillStyle='#e5bd55';for(let y=ground-bh+14;y<ground-10;y+=18)ctx.fillRect(x+10,y,8,7);ctx.fillStyle='#343a42';}}
  if(theme.kind==='ice'){ctx.fillStyle='#dff8ff';for(let x=35;x<w;x+=130){ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(x+28,ground-120);ctx.lineTo(x+58,ground);ctx.fill();}}
  if(theme.kind==='lava'){ctx.strokeStyle='#ff7b25';ctx.lineWidth=7;for(let x=10;x<w;x+=130){ctx.beginPath();ctx.moveTo(x,ground+10);ctx.lineTo(x+34,ground-15);ctx.lineTo(x+71,ground+8);ctx.stroke();}}
  if(theme.kind==='storm'){ctx.strokeStyle='#d9ecff';ctx.lineWidth=4;for(let i=0;i<3;i++){const x=130+i*280;ctx.beginPath();ctx.moveTo(x,35);ctx.lineTo(x-18,82);ctx.lineTo(x+3,78);ctx.lineTo(x-25,135);ctx.stroke();}}
  if(theme.kind==='space'){ctx.fillStyle='#8176c5';for(let x=15;x<w;x+=115){ctx.beginPath();ctx.ellipse(x,ground-8,38,14,-.2,0,7);ctx.fill();}}
  ctx.fillStyle=theme.ground;ctx.fillRect(0,ground,w,h-ground);ctx.fillStyle=theme.hill;for(let x=0;x<w;x+=55){ctx.beginPath();ctx.arc(x,ground+10,42,Math.PI,0);ctx.fill();}
}
function drawBase(x,y,cat,hp){ctx.save();ctx.translate(x,y);ctx.fillStyle=cat?'#e9e3cc':'#443b55';ctx.strokeStyle='#151827';ctx.lineWidth=4;ctx.fillRect(-38,-88,76,88);ctx.strokeRect(-38,-88,76,88);ctx.fillStyle=cat?'#ffd447':'#ef476f';ctx.beginPath();ctx.moveTo(-47,-88);ctx.lineTo(0,-125);ctx.lineTo(47,-88);ctx.fill();ctx.stroke();ctx.fillStyle='#17192a';ctx.fillRect(-12,-35,24,35);ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(cat?'ฅ':'☠',0,-56);if(hp<=0){ctx.rotate(.12);ctx.globalAlpha=.5;}ctx.restore();}
function drawUnit(u){
  ctx.save();ctx.translate(u.x,u.y);if(u.hit)ctx.globalAlpha=.55;
  const sprite=spriteImages[u.unitType];if(sprite?.complete&&sprite.naturalWidth){drawSpriteUnit(u,sprite);healthMini(u);ctx.restore();return;}
  const big=['titan','emperor','paladin','chronos'].includes(u.unitType),size=big?26:21;
  ctx.fillStyle=u.color;ctx.strokeStyle='#17192a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-size-4,size,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-size*.8,-size-17);ctx.lineTo(-size*.55,-size-34);ctx.lineTo(-3,-size-21);ctx.moveTo(size*.8,-size-17);ctx.lineTo(size*.55,-size-34);ctx.lineTo(3,-size-21);ctx.fill();ctx.stroke();
  ctx.fillStyle='#17192a';ctx.beginPath();ctx.arc(-7,-size-6,2.5,0,7);ctx.arc(7,-size-6,2.5,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,-size+2,5,0,Math.PI);ctx.stroke();
  drawUnitGear(u.unitType,size);healthMini(u);ctx.restore();
}
function drawSpriteUnit(unit,image){
  const frameWidth=image.naturalWidth/4,frameHeight=image.naturalHeight/2,isAttacking=(unit.actionTime||0)>0;
  const elapsed = isAttacking ? (0.55 - unit.actionTime) : (game?.time || 0);
  const frame = Math.min(3, Math.floor(elapsed / (isAttacking ? 0.1375 : 0.11)) % 4), row = isAttacking ? 1 : 0;
  const spriteWidths={titan:125,phoenix:112,paladin:118,dragon:110,cosmic:112,emperor:120,chronos:120};
  const width=spriteWidths[unit.unitType]||(['mage'].includes(unit.unitType)?112:100),height=width*(frameHeight/frameWidth);
  ctx.drawImage(image,frame*frameWidth,row*frameHeight,frameWidth,frameHeight,-width/2,-height*.8,width,height);
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
  const sizes={boar:28,gorilla:30,rhino:33,mech:31,demon:35,wolf:25,crab:32,bat:24,golem:38,sorcerer:29,overlord:52,godOverlord:60},size=sizes[e.kind]||20;
  if(e.kind==='snake'){ctx.lineWidth=14;ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(-28,-5);ctx.bezierCurveTo(-18,-42,5,-3,22,-35);ctx.stroke();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(18,-40,3,0,7);ctx.fill();}
  else if(e.kind==='bird'){ctx.beginPath();ctx.arc(0,-24,size,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-12,-27);ctx.lineTo(-40,-43);ctx.lineTo(-25,-13);ctx.fill();ctx.stroke();}
  else if(e.kind==='ghost'){ctx.globalAlpha*=.7;ctx.beginPath();ctx.arc(0,-35,size+7,Math.PI,0);ctx.lineTo(size+7,-4);ctx.lineTo(18,-12);ctx.lineTo(8,-4);ctx.lineTo(-4,-12);ctx.lineTo(-16,-4);ctx.lineTo(-size-7,-12);ctx.closePath();ctx.fill();ctx.stroke();}
  else{ctx.beginPath();ctx.arc(0,-size,size,0,7);ctx.fill();ctx.stroke();if(e.kind==='rhino'){ctx.fillStyle='#eee';ctx.beginPath();ctx.moveTo(-32,-38);ctx.lineTo(-55,-50);ctx.lineTo(-30,-24);ctx.fill();}if(e.kind==='mech'){ctx.fillStyle='#e45b58';ctx.beginPath();ctx.arc(-8,-37,5,0,7);ctx.fill();ctx.fillStyle='#333';ctx.fillRect(-28,-8,12,13);ctx.fillRect(16,-8,12,13);}if(['demon','overlord','godOverlord'].includes(e.kind)){ctx.fillStyle=e.kind==='godOverlord'?'#70d8ff':'#241524';ctx.beginPath();ctx.moveTo(-size*.7,-size*1.55);ctx.lineTo(-size,-size*2.15);ctx.lineTo(-size*.25,-size*1.7);ctx.moveTo(size*.7,-size*1.55);ctx.lineTo(size,-size*2.15);ctx.lineTo(size*.25,-size*1.7);ctx.fill();}}
  ctx.fillStyle='#2b1b27';ctx.beginPath();ctx.arc(-7,-size-3,3,0,7);ctx.arc(7,-size-3,3,0,7);ctx.fill();
  if(e.kind==='boar'){ctx.fillStyle='#eee';ctx.fillRect(-29,-25,8,18);ctx.fillRect(21,-25,8,18);}if(e.kind==='gorilla'){ctx.strokeStyle='#3b302e';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-22,-15);ctx.lineTo(-38,-2);ctx.moveTo(22,-15);ctx.lineTo(38,-2);ctx.stroke();}
  if(e.kind==='wolf'){ctx.fillStyle=e.color;ctx.beginPath();ctx.moveTo(-22,-43);ctx.lineTo(-17,-73);ctx.lineTo(-3,-49);ctx.moveTo(22,-43);ctx.lineTo(17,-73);ctx.lineTo(3,-49);ctx.fill();}
  if(e.kind==='crab'){ctx.strokeStyle='#8c2828';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-25,-26);ctx.lineTo(-48,-42);ctx.moveTo(25,-26);ctx.lineTo(48,-42);ctx.stroke();ctx.fillStyle='#ff8a70';ctx.beginPath();ctx.arc(-51,-45,10,0,7);ctx.arc(51,-45,10,0,7);ctx.fill();}
  if(e.kind==='bat'){ctx.fillStyle='#332747';ctx.beginPath();ctx.moveTo(-18,-35);ctx.lineTo(-55,-65);ctx.lineTo(-45,-22);ctx.lineTo(-20,-10);ctx.moveTo(18,-35);ctx.lineTo(55,-65);ctx.lineTo(45,-22);ctx.lineTo(20,-10);ctx.fill();}
  if(e.kind==='golem'){ctx.strokeStyle='#5f4c3b';ctx.lineWidth=7;ctx.strokeRect(-30,-72,60,62);ctx.beginPath();ctx.moveTo(-28,-50);ctx.lineTo(20,-25);ctx.moveTo(5,-67);ctx.lineTo(-12,-18);ctx.stroke();}
  if(e.kind==='sorcerer'){ctx.fillStyle='#242b70';ctx.beginPath();ctx.moveTo(-34,-47);ctx.lineTo(0,-92);ctx.lineTo(35,-47);ctx.fill();ctx.fillStyle='#84e8ff';ctx.beginPath();ctx.arc(31,-62,8,0,7);ctx.fill();}
  if(e.boss){ctx.fillStyle=e.kind==='godOverlord'?'#80eaff':'#ffd447';ctx.beginPath();ctx.moveTo(-28,-88);ctx.lineTo(-20,-120);ctx.lineTo(-5,-96);ctx.lineTo(9,-124);ctx.lineTo(27,-91);ctx.closePath();ctx.fill();ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(e.kind==='godOverlord'?'FINAL GOD BOSS':'STAGE BOSS',0,-140);ctx.fillStyle='#16091d';ctx.fillRect(-60,8,120,10);ctx.fillStyle=e.kind==='godOverlord'?'#55e8ff':'#ff3fcf';ctx.fillRect(-60,8,120*Math.max(0,e.hp/e.maxHp),10);}
  else healthMini(e);ctx.restore();
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

setAuthView();renderMeta();resizeCanvas();draw();
