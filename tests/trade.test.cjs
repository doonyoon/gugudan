const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawn}=require('child_process');

const port=19000+Math.floor(Math.random()*500);
const base=`http://127.0.0.1:${port}`;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cat-trade-'));
const server=spawn(process.execPath,['dev-server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:'',PORT:String(port),DATA_DIR:temp,NODE_ENV:'test',DEVELOPER_PASSWORD:'test-developer-password'},stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){for(let i=0;i<50;i++){try{if((await fetch(`${base}/health`)).ok)return;}catch{}await delay(100);}throw new Error('trade test server did not start');}
async function request(pathname,{token,method='GET',body,expected}={}){const response=await fetch(`${base}${pathname}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)}),data=await response.json();if(expected){assert.equal(response.status,expected,data.error);return data;}if(!response.ok)throw new Error(`${response.status}: ${data.error}`);return data;}
const progress=(gold,extra=[])=>({gold,highestStage:0,cleared:[],owned:['runner','tank','fighter','mage',...extra.map(item=>item.type)],loadout:['runner','tank','fighter','mage'],levels:{runner:1,tank:1,fighter:1,mage:1,...Object.fromEntries(extra.map(item=>[item.type,item.level]))},redeemedCodes:[],tradeRevision:0});

(async()=>{try{
  await waitForServer();
  const seller=await request('/api/signup',{method:'POST',body:{id:'seller1',password:'test1234'}}),buyer=await request('/api/signup',{method:'POST',body:{id:'buyer01',password:'test1234'}}),stranger=await request('/api/signup',{method:'POST',body:{id:'strange1',password:'test1234'}}),admin=await request('/api/login',{method:'POST',body:{id:'doonyoon',password:'test-developer-password'}});
  await request('/api/progress',{method:'PUT',token:seller.token,body:{progress:progress(500,[{type:'bomber',level:3}])}});await request('/api/progress',{method:'PUT',token:buyer.token,body:{progress:progress(5000)}});
  const friendRequest=await request('/api/friends/requests',{method:'POST',token:seller.token,body:{recipientId:'buyer01'}});await request(`/api/friends/requests/${friendRequest.request.id}/accept`,{method:'POST',token:buyer.token});
  await request('/api/trades',{method:'POST',token:stranger.token,body:{buyerId:'buyer01',unitType:'bomber',price:1200},expected:400});
  await request('/api/trades',{method:'POST',token:seller.token,body:{buyerId:'buyer01',unitType:'runner',price:1200},expected:400});
  const created=await request('/api/trades',{method:'POST',token:seller.token,body:{buyerId:'buyer01',unitType:'bomber',price:1200}});assert.equal(created.trade.status,'pending');assert.equal(created.trade.unit_level,3);
  await request(`/api/trades/${created.trade.id}/buy`,{method:'POST',token:buyer.token,expected:409});
  const pending=await request('/api/admin/trades',{token:admin.token});assert(pending.trades.some(item=>String(item.id)===String(created.trade.id)&&item.status==='pending'));
  await request(`/api/admin/trades/${created.trade.id}/approve`,{method:'POST',token:admin.token});
  const bought=await request(`/api/trades/${created.trade.id}/buy`,{method:'POST',token:buyer.token});assert.equal(bought.trade.status,'sold');assert.equal(bought.progress.gold,3800);assert(bought.progress.owned.includes('bomber'));assert.equal(bought.progress.levels.bomber,3);assert.equal(bought.progress.tradeRevision,1);
  const sellerProfile=await request('/api/session',{token:seller.token});assert.equal(sellerProfile.progress.gold,1700);assert(!sellerProfile.progress.owned.includes('bomber'));assert.equal(sellerProfile.progress.tradeRevision,1);
  await request('/api/progress',{method:'PUT',token:seller.token,body:{progress:progress(500,[{type:'bomber',level:3}])}});const protectedProfile=await request('/api/session',{token:seller.token});assert.equal(protectedProfile.progress.gold,1700);assert(!protectedProfile.progress.owned.includes('bomber'));assert.equal(protectedProfile.progress.tradeRevision,1);
  const notices=await request('/api/notifications',{token:seller.token});assert(notices.notifications.some(item=>item.kind==='trade_sold'));
  console.log('Friend character trade test passed');
}finally{server.kill();await delay(100);const resolved=path.resolve(temp),root=path.resolve(os.tmpdir());if(!resolved.startsWith(root+path.sep))throw new Error('unsafe temp cleanup path');fs.rmSync(resolved,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
