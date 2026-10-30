const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
function load(context,name){const start=source.indexOf(`function ${name}(`);assert(start>=0);const rest=source.slice(start),next=rest.slice(1).search(/\n(?:async )?function /);vm.runInContext(next<0?rest:rest.slice(0,next+1),context);}
(async()=>{
  const timers=[],calls=[],labels={};
  const c=vm.createContext({console,Number,Math,Date,JSON,Set,WebSocket:{OPEN:1},activeUser:'one',pvpRoom:{id:'room',player_one:'one',player_two:'two'},game:{running:true,mode:'pvp',roomId:'room',pendingSpawns:0},pvpScheduledEvents:new Set(),pvpServerOffset:0,pvpSnapshotVersion:0,pvpLastSnapshotAt:0,pvpSocketReady:false,pvpSocket:null,PVP_SNAPSHOT_MS:60,PVP_HTTP_SNAPSHOT_MS:100,setTimeout:fn=>timers.push(fn),document:{querySelector:key=>labels[key]??(labels[key]={})},buildPvpSnapshot:()=>({playerHp:5200,enemyHp:0}),apiRequest:async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return {room:{winner_id:'one'}};},completePvpBattle:win=>{c.result=win;},spawnPvpUnit:()=>{c.spawned=(c.spawned||0)+1;}});
  c.progress={owned:['runner','chronos','thief','phoenix','dragon'],loadout:['chronos','thief','phoenix','dragon']};c.UNIT_TYPES={runner:{},chronos:{},thief:{},phoenix:{},dragon:{}};load(c,'pvpOwnedUnitTypes');load(c,'battleUnitTypes');assert.deepEqual([...c.battleUnitTypes()],['chronos','thief','phoenix','dragon']);c.game={running:false,mode:'pvp'};assert.deepEqual([...c.battleUnitTypes()],['chronos','thief','phoenix','dragon']);c.game={running:true,mode:'pvp',roomId:'room',pendingSpawns:0};
  c.spriteImages={chronos:{},thief:{},phoenix:{},dragon:{}};c.skillSpriteImages={thief:{}};load(c,'createPvpGame');const fourCardGame=c.createPvpGame({id:'room'});assert.deepEqual(Object.keys(fourCardGame.cooldowns),['chronos','thief','phoenix','dragon']);
  const developerStore={getItem:key=>key==='developer-loadout'?JSON.stringify(['chronos','thief','phoenix','dragon']):null},developer=vm.createContext({Object,JSON,Set,localStorage:developerStore,DEVELOPER_LOADOUT_KEY:'developer-loadout',UNIT_TYPES:c.UNIT_TYPES,BASIC_UNITS:['runner'],STAGES:Array(20).fill({}),Number});load(developer,'developerProgress');assert.deepEqual([...developer.developerProgress().loadout],['chronos','thief','phoenix','dragon']);
  for(const name of ['isPvpPlayerOne','pvpOpponent','queuePvpSpawn','publishPvpSnapshot','setPvpLabels'])load(c,name);
  // Load only the PvP branch of finish; PvE code has unrelated dependencies.
  load(c,'finish');
  c.setPvpLabels(c.pvpRoom);assert.match(labels['.enemy-status span'].textContent,/one.*나/);assert.match(labels['.player-status span'].textContent,/two.*상대/);
  c.queuePvpSpawn({id:1,room_id:'old-room'});assert.equal(timers.length,0);
  c.queuePvpSpawn({id:2,room_id:'room'});c.queuePvpSpawn({id:2,room_id:'room'});assert.equal(timers.length,1);
  c.game={running:true,mode:'pvp',roomId:'new-room'};timers[0]();assert.equal(c.spawned,undefined);
  c.game={running:true,mode:'pvp',roomId:'room'};c.publishPvpSnapshot(1000);await new Promise(setImmediate);assert.equal(calls[0].path,'/api/pvp/rooms/room/snapshot');
  c.finish(true);c.finish(true);await new Promise(setImmediate);assert.equal(calls.filter(x=>x.path.endsWith('/finish')).length,1);assert.equal(calls.at(-1).body.state.enemyHp,0);assert.equal(c.result,true);
  c.pvpAppliedVersion=0;c.UNIT_TYPES={runner:{speed:58}};load(c,'hydratePvpUnit');load(c,'reconcilePvpUnits');load(c,'reconcilePvpProjectiles');load(c,'applyPvpSnapshot');load(c,'updatePvpFollower');
  c.game={running:true,mode:'pvp',money:0,maxMoney:100,income:0,cooldowns:{},autoSummon:{},units:[],enemies:[],projectiles:[],particles:[],shake:0};c.applyPvpSnapshot({version:2,state:{time:4,playerHp:4000,playerMaxHp:5200,enemyHp:0,enemyMaxHp:5200,units:[],enemies:[{id:1,unitType:'runner',x:400,y:300,hp:50}],projectiles:[],particles:[]}});
  assert.equal(c.game.enemyHp,0);assert.equal(c.game.enemies[0].kind,'pvp');assert.equal(c.game.enemies[0].speed,58);
  c.applyPvpSnapshot({version:3,state:{time:4.2,playerHp:4000,playerMaxHp:5200,enemyHp:0,enemyMaxHp:5200,units:[],enemies:[{id:1,unitType:'runner',x:460,y:300,hp:50}],projectiles:[],particles:[]}});assert.equal(c.game.enemies[0].x,400);c.updatePvpFollower(.05);assert(c.game.enemies[0].x>400&&c.game.enemies[0].x<460);
  c.applyPvpSnapshot({version:1,state:{enemyHp:5200}});assert.equal(c.game.enemyHp,0);
  c.UNIT_TYPES.thief={skillDamage:1800,skillCooldown:25};c.skillSpriteImages={thief:{}};c.burst=()=>{};c.playJingle=()=>{};c.battleWidth=()=>1200;load(c,'startThiefSkill');load(c,'updateThiefSkill');load(c,'activateThiefSkill');
  const thiefOne={unitType:'thief',x:200,hp:720,skillDamage:1800,attack:0,skillCooldown:0},thiefTwo={unitType:'thief',x:250,hp:720,skillDamage:1800,attack:0,skillCooldown:0};c.game={running:true,mode:'stage',units:[thiefOne,thiefTwo],enemyHp:5200,playerHp:5200,bossType:'abyssLord',bossDefeated:false,shake:0};c.activateThiefSkill();c.activateThiefSkill();assert.equal(thiefOne.skillActive,true);assert.equal(thiefTwo.skillActive,true);assert.equal(thiefOne.skillCooldown,25);assert.equal(thiefTwo.skillCooldown,25);c.updateThiefSkill(thiefOne,1,.64);assert.equal(thiefOne.x,1082);c.updateThiefSkill(thiefOne,1,.34);assert.equal(c.game.enemyHp,3400);c.updateThiefSkill(thiefTwo,1,.98);assert.equal(c.game.enemyHp,1600);c.updateThiefSkill(thiefOne,1,.46);assert.equal(thiefOne.skillActive,false);
  assert.match(source,/PVP_HTTP_SNAPSHOT_MS=180/);assert.match(source,/setInterval\(pollPvpRoom,PVP_FALLBACK_POLL_MS\)/);assert.match(source,/particles:\[\]/);assert.match(source,/Math\.ceil\(elapsed\/\.04\)/);
  console.log('PVP client regression checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
