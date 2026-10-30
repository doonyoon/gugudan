const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');
const WebSocket=require('ws');

const port=18000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cat-pvp-sync-'));
const server=spawn(process.execPath,['dev-server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:'',PORT:String(port),DATA_DIR:temp,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitForServer(){for(let attempt=0;attempt<50;attempt++){try{const response=await fetch(`${base}/health`);if(response.ok)return;}catch{}await delay(100);}throw new Error('test server did not start');}
async function request(pathname,{token,method='GET',body}={}){const response=await fetch(`${base}${pathname}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(`${response.status}: ${data.error}`);return data;}
function socketClient(token,roomId){return new Promise((resolve,reject)=>{const socket=new WebSocket(`ws://127.0.0.1:${port}/pvp-sync`),messages=[];socket.on('open',()=>socket.send(JSON.stringify({type:'auth',token,roomId})));socket.on('message',raw=>{const message=JSON.parse(String(raw));messages.push(message);if(message.type==='ready')resolve({socket,messages});});socket.on('error',reject);});}
function rejectedSocket(){return new Promise((resolve,reject)=>{const socket=new WebSocket(`ws://127.0.0.1:${port}/pvp-sync`);const timer=setTimeout(()=>{socket.terminate();reject(new Error('invalid websocket authentication did not close'));},1500);socket.on('open',()=>socket.send(JSON.stringify({type:'auth',token:'invalid',roomId:'00000000-0000-0000-0000-000000000000'})));socket.on('close',code=>{clearTimeout(timer);resolve(code);});socket.on('error',reject);});}
async function waitFor(messages,predicate){for(let attempt=0;attempt<50;attempt++){const found=messages.find(predicate);if(found)return found;await delay(50);}throw new Error('timed out waiting for websocket message');}
async function streamClient(token,roomId){const controller=new AbortController(),response=await fetch(`${base}/api/pvp/rooms/${roomId}/stream`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});assert.equal(response.status,200);const messages=[],reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';(async()=>{try{while(true){const {done,value}=await reader.read();if(done)return;buffer+=decoder.decode(value,{stream:true});let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n');if(data)messages.push(JSON.parse(data));}}}catch(error){if(error.name!=='AbortError')throw error;}})();await waitFor(messages,item=>item.type==='ready');return {controller,messages};}

(async()=>{
  try{
    await waitForServer();
    assert.equal(await rejectedSocket(),4003);
    const one=await request('/api/signup',{method:'POST',body:{id:'syncp1',password:'test1234'}}),two=await request('/api/signup',{method:'POST',body:{id:'syncp2',password:'test1234'}});
    await request('/api/progress',{method:'PUT',token:two.token,body:{progress:{gold:0,highestStage:0,cleared:[],owned:['runner','tank','fighter','mage','chronos','thief'],loadout:['runner','tank','fighter','mage'],levels:{runner:1,tank:1,fighter:1,mage:1,chronos:1,thief:1},redeemedCodes:[]}}});
    const waiting=await request('/api/pvp/rooms',{method:'POST',token:one.token});
    assert.match(waiting.room.room_code,/^[A-Z2-9]{6}$/);assert.equal(waiting.room.status,'waiting');
    const quick=await request('/api/pvp/match',{method:'POST',token:two.token});
    assert.notEqual(quick.room.id,waiting.room.id);assert.equal(quick.room.room_code,null);assert.equal(quick.room.status,'waiting');
    await request(`/api/pvp/rooms/${quick.room.id}/cancel`,{method:'POST',token:two.token});
    await assert.rejects(request('/api/pvp/rooms/join',{method:'POST',token:two.token,body:{code:'ZZZZZZ'}}),/404/);
    const joined=await request('/api/pvp/rooms/join',{method:'POST',token:two.token,body:{code:waiting.room.room_code.toLowerCase()}});
    assert.equal(waiting.room.id,joined.room.id);assert.equal(joined.room.status,'active');
    const [clientOne,clientTwo,streamTwo]=await Promise.all([socketClient(one.token,joined.room.id),socketClient(two.token,joined.room.id),streamClient(two.token,joined.room.id)]);assert.equal(typeof clientOne.messages[0].serverNow,'number');assert.equal(typeof streamTwo.messages[0].serverNow,'number');
    const state={time:3.25,playerHp:5100,playerMaxHp:5200,enemyHp:4900,enemyMaxHp:5200,units:[{id:'pvp-1',unitType:'runner',side:'cat',x:140,y:400,hp:100,maxHp:100}],enemies:[],projectiles:[],particles:[]};
    clientOne.socket.send(JSON.stringify({type:'snapshot',version:1,state}));
    const [snapshotOne,snapshotTwo,streamSnapshot]=await Promise.all([waitFor(clientOne.messages,item=>item.type==='snapshot'),waitFor(clientTwo.messages,item=>item.type==='snapshot'),waitFor(streamTwo.messages,item=>item.type==='snapshot')]);
    assert.deepEqual(snapshotOne.state,snapshotTwo.state);assert.equal(snapshotTwo.state.units[0].x,140);
    assert.deepEqual(streamSnapshot.state,snapshotTwo.state);
    await assert.rejects(request(`/api/pvp/rooms/${joined.room.id}/spawn`,{method:'POST',token:two.token,body:{unitType:'phoenix',unitData:{hp:100,maxHp:100,damage:10,heal:0}}}),/403/);
    await request(`/api/pvp/rooms/${joined.room.id}/spawn`,{method:'POST',token:two.token,body:{unitType:'chronos',unitData:{hp:100,maxHp:100,damage:10,heal:0}}});
    const [eventOne,eventTwo]=await Promise.all([waitFor(clientOne.messages,item=>item.type==='event'),waitFor(clientTwo.messages,item=>item.type==='event')]);
    assert.equal(eventOne.event.id,eventTwo.event.id);assert.equal(eventOne.event.player_id,'syncp2');assert.equal(eventOne.event.unit_type,'chronos');
    const thiefSpawn=await request(`/api/pvp/rooms/${joined.room.id}/spawn`,{method:'POST',token:two.token,body:{unitType:'thief',unitData:{hp:720,maxHp:720,damage:260,skillDamage:1800}}});
    const skill=await request(`/api/pvp/rooms/${joined.room.id}/skill`,{method:'POST',token:two.token,body:{unitId:`pvp-${thiefSpawn.event.id}`}});assert.equal(skill.event.unit_type,'thief_skill');assert.equal(skill.event.unit_data.unitId,`pvp-${thiefSpawn.event.id}`);
    await assert.rejects(request(`/api/pvp/rooms/${joined.room.id}/skill`,{method:'POST',token:two.token,body:{unitId:`pvp-${thiefSpawn.event.id}`}}),/429/);
    const fallback=await request(`/api/pvp/rooms/${joined.room.id}?since=0`,{token:two.token});assert.deepEqual(fallback.snapshot.state,state);assert.equal(typeof fallback.serverNow,'number');
    const roomPath=`/api/pvp/rooms/${joined.room.id}`;
    await assert.rejects(request(`${roomPath}/snapshot`,{method:'POST',token:two.token,body:{state,version:2}}),/403/);
    const fallbackState={...state,time:4,enemyHp:4200};
    await request(`${roomPath}/snapshot`,{method:'POST',token:one.token,body:{state:fallbackState,version:2}});
    await request(`${roomPath}/snapshot`,{method:'POST',token:one.token,body:{state,version:1}});
    assert.deepEqual((await request(roomPath,{token:two.token})).snapshot.state,fallbackState);
    const reconnected=await socketClient(two.token,joined.room.id);assert.deepEqual(reconnected.messages.find(item=>item.type==='ready').state.state,fallbackState);reconnected.socket.close();
    await assert.rejects(request(`${roomPath}/finish`,{method:'POST',token:two.token,body:{winnerId:'syncp2',state}}),/409/);
    await assert.rejects(request(`${roomPath}/finish`,{method:'POST',token:one.token,body:{winnerId:'syncp1',state}}),/409/);
    const finalState={...fallbackState,time:5,enemyHp:0};
    const finished=await request(`${roomPath}/finish`,{method:'POST',token:one.token,body:{winnerId:'syncp1',state:finalState,version:3}});
    assert.equal(finished.room.winner_id,'syncp1');
    const finalMessage=await waitFor(clientTwo.messages,item=>item.type==='room'&&item.room.status==='finished');
    assert.equal(finalMessage.snapshot.state.enemyHp,0);
    const finalPoll=await request(roomPath,{token:two.token});assert.equal(finalPoll.snapshot.state.enemyHp,0);assert.equal(finalPoll.room.winner_id,'syncp1');
    const repeated=await request(`${roomPath}/finish`,{method:'POST',token:two.token,body:{winnerId:'syncp2'}});assert.equal(repeated.room.winner_id,'syncp1');
    const rematch=await request('/api/pvp/match',{method:'POST',token:one.token});assert.notEqual(rematch.room.id,joined.room.id);
    await request(`/api/pvp/rooms/${rematch.room.id}/cancel`,{method:'POST',token:one.token});
    const waitingAgain=await request('/api/pvp/match',{method:'POST',token:one.token});const joinedAgain=await request('/api/pvp/match',{method:'POST',token:two.token});assert.equal(waitingAgain.room.id,joinedAgain.room.id);
    const surrendered=await request(`/api/pvp/rooms/${joinedAgain.room.id}/finish`,{method:'POST',token:two.token,body:{winnerId:'syncp1'}});assert.equal(surrendered.room.winner_id,'syncp1');
    await request('/api/pvp/match',{method:'POST',token:one.token});const last=await request('/api/pvp/match',{method:'POST',token:two.token});
    const hostDefeated=await request(`/api/pvp/rooms/${last.room.id}/finish`,{method:'POST',token:one.token,body:{winnerId:'syncp2',state:{...state,playerHp:0},version:1}});assert.equal(hostDefeated.room.winner_id,'syncp2');assert.equal(hostDefeated.snapshot.state.playerHp,0);
    const three=await request('/api/signup',{method:'POST',body:{id:'syncp3',password:'test1234'}}),four=await request('/api/signup',{method:'POST',body:{id:'syncp4',password:'test1234'}});
    const staleWaiting=await request('/api/pvp/match',{method:'POST',token:three.token});await delay(3200);const freshWaiting=await request('/api/pvp/match',{method:'POST',token:four.token});assert.notEqual(staleWaiting.room.id,freshWaiting.room.id);assert.equal(freshWaiting.room.status,'waiting');
    await request(`/api/pvp/rooms/${freshWaiting.room.id}/cancel`,{method:'POST',token:four.token});
    streamTwo.controller.abort();clientOne.socket.close();clientTwo.socket.close();console.log('PVP authoritative sync test passed');
  }finally{
    server.kill();await delay(100);const resolved=path.resolve(temp),root=path.resolve(os.tmpdir());if(!resolved.startsWith(root+path.sep))throw new Error('unsafe temp cleanup path');fs.rmSync(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
