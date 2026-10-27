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

(async()=>{
  try{
    await waitForServer();
    assert.equal(await rejectedSocket(),4003);
    const one=await request('/api/signup',{method:'POST',body:{id:'syncp1',password:'test1234'}}),two=await request('/api/signup',{method:'POST',body:{id:'syncp2',password:'test1234'}});
    const waiting=await request('/api/pvp/match',{method:'POST',token:one.token}),joined=await request('/api/pvp/match',{method:'POST',token:two.token});
    assert.equal(waiting.room.id,joined.room.id);assert.equal(joined.room.status,'active');
    const [clientOne,clientTwo]=await Promise.all([socketClient(one.token,joined.room.id),socketClient(two.token,joined.room.id)]);assert.equal(typeof clientOne.messages[0].serverNow,'number');
    const state={time:3.25,playerHp:5100,playerMaxHp:5200,enemyHp:4900,enemyMaxHp:5200,units:[{id:'pvp-1',unitType:'runner',side:'cat',x:140,y:400,hp:100,maxHp:100}],enemies:[],projectiles:[],particles:[]};
    clientOne.socket.send(JSON.stringify({type:'snapshot',version:1,state}));
    const [snapshotOne,snapshotTwo]=await Promise.all([waitFor(clientOne.messages,item=>item.type==='snapshot'),waitFor(clientTwo.messages,item=>item.type==='snapshot')]);
    assert.deepEqual(snapshotOne.state,snapshotTwo.state);assert.equal(snapshotTwo.state.units[0].x,140);
    await request(`/api/pvp/rooms/${joined.room.id}/spawn`,{method:'POST',token:two.token,body:{unitType:'runner',unitData:{hp:100,maxHp:100,damage:10,heal:0}}});
    const [eventOne,eventTwo]=await Promise.all([waitFor(clientOne.messages,item=>item.type==='event'),waitFor(clientTwo.messages,item=>item.type==='event')]);
    assert.equal(eventOne.event.id,eventTwo.event.id);assert.equal(eventOne.event.player_id,'syncp2');
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
    clientOne.socket.close();clientTwo.socket.close();console.log('PVP authoritative sync test passed');
  }finally{
    server.kill();await delay(100);const resolved=path.resolve(temp),root=path.resolve(os.tmpdir());if(!resolved.startsWith(root+path.sep))throw new Error('unsafe temp cleanup path');fs.rmSync(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
