const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {promisify}=require('util');
const {createStore,emptyProgress,sanitizeProgress}=require('./server-store.cjs');
const scrypt=promisify(crypto.scrypt),root=__dirname,port=Number(process.env.PORT||process.env.GAME_DEV_PORT||8000);
const canonicalUrl='https://doonyoon.github.io/gugudan/',developerId='doonyoon',developerPassword=process.env.DEVELOPER_PASSWORD||'kk45537606',sessionSecret=process.env.SESSION_SECRET||developerPassword;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png'};
let store;
function json(response,status,payload){response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});response.end(JSON.stringify(payload));}
function allowApiOrigin(request,response){const origin=String(request.headers.origin||''),allowed=origin==='https://doonyoon.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);if(allowed){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');response.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');response.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');}}
function readJson(request){return new Promise((resolve,reject)=>{let body='';request.on('data',chunk=>{body+=chunk;if(body.length>150000){reject(new Error('too_large'));request.destroy();}});request.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(new Error('invalid_json'));}});request.on('error',reject);});}
function validId(id){return typeof id==='string'&&/^[A-Za-z0-9가-힣_]{3,16}$/.test(id);}
function tokenFrom(request){return String(request.headers.authorization||'').replace(/^Bearer\s+/i,'');}
function tokenUser(request){try{const [payload,signature]=tokenFrom(request).split('.'),expected=crypto.createHmac('sha256',sessionSecret).update(payload).digest('base64url');if(!signature||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;const session=JSON.parse(Buffer.from(payload,'base64url').toString());return session.expires>Date.now()?session.id:null;}catch{return null;}}
function makeSession(id){const payload=Buffer.from(JSON.stringify({id,expires:Date.now()+1000*60*60*24*30})).toString('base64url'),signature=crypto.createHmac('sha256',sessionSecret).update(payload).digest('base64url');return `${payload}.${signature}`;}
async function passwordHash(password,salt){return (await scrypt(password,salt,64)).toString('hex');}
function developerProgress(){return {...emptyProgress(),gold:Number.MAX_SAFE_INTEGER,highestStage:19,cleared:Array.from({length:20},(_,i)=>i),developer:true};}
async function api(request,response,pathname){
  try{
    if(request.method==='POST'&&pathname==='/api/signup'){
      const {id,password,progress}=await readJson(request);if(!validId(id)||typeof password!=='string'||password.length<4||password.length>128)return json(response,400,{error:'아이디 또는 비밀번호 형식이 올바르지 않습니다.'});
      if(id===developerId)return json(response,409,{error:'예약된 개발자 아이디입니다.'});if(await store.get(id))return json(response,409,{error:'이미 사용 중인 아이디입니다.'});
      const salt=crypto.randomBytes(16).toString('hex'),password_hash=await passwordHash(password,salt);await store.create({id,password_hash,salt,progress:sanitizeProgress(progress||emptyProgress())});const account=await store.get(id);return json(response,201,{id,token:makeSession(id),progress:account.progress});
    }
    if(request.method==='POST'&&pathname==='/api/login'){
      const {id,password}=await readJson(request);if(id===developerId&&password===developerPassword)return json(response,200,{id,token:makeSession(id),progress:developerProgress()});
      const account=validId(id)?await store.get(id):null;if(!account||typeof password!=='string'||account.password_hash!==await passwordHash(password,account.salt))return json(response,401,{error:'아이디 또는 비밀번호가 맞지 않습니다.'});return json(response,200,{id,token:makeSession(id),progress:account.progress||emptyProgress()});
    }
    if(request.method==='GET'&&pathname==='/api/session'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});if(id===developerId)return json(response,200,{id,progress:developerProgress()});const account=await store.get(id);if(!account)return json(response,401,{error:'계정을 찾을 수 없습니다.'});return json(response,200,{id,progress:account.progress||emptyProgress()});
    }
    if(request.method==='PUT'&&pathname==='/api/progress'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});if(id===developerId)return json(response,200,{saved:true});const {progress}=await readJson(request);return json(response,await store.saveProgress(id,sanitizeProgress(progress))?200:404,{saved:true});
    }
    if(request.method==='POST'&&pathname==='/api/logout')return json(response,200,{ok:true});
    return json(response,404,{error:'API를 찾을 수 없습니다.'});
  }catch(error){console.error(error);return json(response,error.code==='23505'?409:500,{error:error.code==='23505'?'이미 사용 중인 아이디입니다.':'서버 저장 중 오류가 발생했습니다.'});}
}
function handle(request,response){
  const pathname=decodeURIComponent(request.url.split('?')[0]);response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(pathname==='/health')return json(response,200,{status:'ok',game:'고양이 성채전',database:Boolean(process.env.DATABASE_URL)});if(pathname.startsWith('/api/')){allowApiOrigin(request,response);if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}return api(request,response,pathname);}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return;}
  fs.readFile(file,(error,contents)=>{if(error){response.writeHead(404).end('Not found');return;}let data=contents,host=/^[a-z0-9.-]+(?::\d+)?$/i.test(request.headers.host||'')?request.headers.host:'';if(host&&['.html','.xml','.txt'].includes(path.extname(file))){const forwarded=String(request.headers['x-forwarded-proto']||'').split(',')[0],protocol=forwarded==='https'||forwarded==='http'?forwarded:'http';data=Buffer.from(data.toString('utf8').replaceAll(canonicalUrl,`${protocol}://${host}/`));}response.setHeader('Cache-Control',process.env.NODE_ENV==='production'?'public, max-age=300':'no-store');response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');response.end(data);});
}
createStore().then(value=>{store=value;http.createServer(handle).listen(port,'0.0.0.0',()=>console.log(`Game server: http://localhost:${port}`));}).catch(error=>{console.error('Database startup failed',error);process.exit(1);});
