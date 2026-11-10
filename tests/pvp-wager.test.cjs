const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');

const port=20000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cat-pvp-wager-'));
const server=spawn(process.execPath,['dev-server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:'',PORT:String(port),DATA_DIR:temp,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitForServer(){for(let attempt=0;attempt<50;attempt++){try{if((await fetch(`${base}/health`)).ok)return;}catch{}await delay(100);}throw new Error('test server did not start');}
async function request(pathname,{token,method='GET',body}={}){const response=await fetch(`${base}${pathname}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)}),data=await response.json();if(!response.ok){const error=new Error(`${response.status}: ${data.error}`);error.status=response.status;throw error;}return data;}
const progress=gold=>({gold,highestStage:0,cleared:[],owned:['runner','tank','fighter','mage'],loadout:['runner','tank','fighter','mage'],levels:{runner:1,tank:1,fighter:1,mage:1},tradeRevision:0});

(async()=>{
  try{
    await waitForServer();
    const host=await request('/api/signup',{method:'POST',body:{id:'wagerHost',password:'test1234',progress:progress(5000)}});
    const guest=await request('/api/signup',{method:'POST',body:{id:'wagerGuest',password:'test1234',progress:progress(5000)}});
    const online=await request('/api/pvp/online',{token:host.token});
    assert(online.players.some(player=>player.id==='wagerGuest'));

    const sent=await request('/api/pvp/invitations',{method:'POST',token:host.token,body:{recipientId:'wagerGuest',wager:1000}});
    assert.equal(sent.room.wager,1000);assert.equal(sent.room.status,'waiting');
    const inbox=await request('/api/pvp/invitations',{token:guest.token});
    assert.equal(inbox.invitations.length,1);assert.equal(inbox.invitations[0].sender_id,'wagerHost');assert.equal(inbox.invitations[0].wager,1000);
    const accepted=await request(`/api/pvp/invitations/${inbox.invitations[0].id}/accept`,{method:'POST',token:guest.token});
    assert.equal(accepted.room.status,'active');assert.equal(accepted.room.wager_locked,true);
    assert.equal((await request('/api/session',{token:host.token})).progress.gold,4000);
    assert.equal((await request('/api/session',{token:guest.token})).progress.gold,4000);

    const finished=await request(`/api/pvp/rooms/${accepted.room.id}/finish`,{method:'POST',token:guest.token,body:{winnerId:'wagerHost'}});
    assert.equal(finished.room.winner_id,'wagerHost');assert.equal(finished.room.wager_settled,true);
    assert.equal((await request('/api/session',{token:host.token})).progress.gold,6000);
    assert.equal((await request('/api/session',{token:guest.token})).progress.gold,4000);
    await request(`/api/pvp/rooms/${accepted.room.id}/finish`,{method:'POST',token:guest.token,body:{winnerId:'wagerGuest'}});
    assert.equal((await request('/api/session',{token:host.token})).progress.gold,6000,'repeated finish must not pay twice');

    await request('/api/progress',{method:'PUT',token:host.token,body:{progress:progress(999999)}});
    assert.equal((await request('/api/session',{token:host.token})).progress.gold,6000,'stale client save must not restore escrowed coins');

    const rejectedInvite=await request('/api/pvp/invitations',{method:'POST',token:host.token,body:{recipientId:'wagerGuest',wager:500}});
    await request(`/api/pvp/invitations/${rejectedInvite.invitation.id}/reject`,{method:'POST',token:guest.token});
    assert.equal((await request('/api/session',{token:host.token})).progress.gold,6000);
    assert.equal((await request('/api/session',{token:guest.token})).progress.gold,4000);
    await assert.rejects(request('/api/pvp/invitations',{method:'POST',token:guest.token,body:{recipientId:'wagerHost',wager:5000}}),/코인이 부족/);
    console.log('PVP wager escrow and online invitation tests passed');
  }finally{
    server.kill();await delay(100);const resolved=path.resolve(temp),root=path.resolve(os.tmpdir());if(!resolved.startsWith(root+path.sep))throw new Error('unsafe temp cleanup path');fs.rmSync(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
