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
    if(request.method==='POST'&&pathname==='/api/password-reset/request'){
      const {id}=await readJson(request);if(typeof id==='string'&&validId(id))await store.requestPasswordReset(id);
      return json(response,200,{message:'계정이 존재하면 개발자 확인 요청이 전달됩니다.'});
    }
    if(request.method==='POST'&&pathname==='/api/password-reset/confirm'){
      const {id,ticket,password}=await readJson(request);if(!validId(id)||typeof ticket!=='string'||!/^\d{6}$/.test(ticket)||typeof password!=='string'||password.length<4||password.length>128)return json(response,400,{error:'입력값을 다시 확인해 주세요.'});
      const salt=crypto.randomBytes(16).toString('hex');await store.completePasswordReset(id,crypto.createHash('sha256').update(ticket).digest('hex'),await passwordHash(password,salt),salt);return json(response,200,{ok:true});
    }
    if(request.method==='GET'&&pathname==='/api/admin/password-resets'){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 요청을 확인할 수 있습니다.'});return json(response,200,{requests:await store.listPasswordResets()});
    }
    const resetApproval=pathname.match(/^\/api\/admin\/password-resets\/(\d+)\/approve$/);
    if(request.method==='POST'&&resetApproval){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 승인할 수 있습니다.'});const ticket=String(crypto.randomInt(0,1000000)).padStart(6,'0'),expires=new Date(Date.now()+30*60*1000).toISOString(),approved=await store.approvePasswordReset(resetApproval[1],crypto.createHash('sha256').update(ticket).digest('hex'),expires);if(!approved)return json(response,404,{error:'대기 중인 요청을 찾을 수 없습니다.'});return json(response,200,{userId:approved.user_id,ticket,expiresAt:expires});
    }
    if(request.method==='GET'&&pathname==='/api/admin/accounts'){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 회원 목록을 볼 수 있습니다.'});
      const accounts=await store.listAccounts();
      return json(response,200,{accounts:accounts.map(account=>({id:account.id,gold:Number(account.progress?.gold||0),highestStage:Number(account.progress?.highestStage||0),createdAt:account.created_at,updatedAt:account.updated_at||account.created_at}))});
    }
    if(request.method==='GET'&&pathname==='/api/admin/coupons'){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 선물 코드를 관리할 수 있습니다.'});
      return json(response,200,{coupons:await store.listCoupons()});
    }
    if(request.method==='POST'&&pathname==='/api/admin/coupons'){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 선물 코드를 만들 수 있습니다.'});
      const {code,gold}=await readJson(request),normalized=typeof code==='string'?code.trim().toUpperCase():'' ,amount=Number(gold);
      if(!/^[A-Z0-9_-]{3,32}$/.test(normalized))return json(response,400,{error:'코드는 영문, 숫자, 밑줄, 하이픈으로 3~32자여야 합니다.'});
      if(!Number.isInteger(amount)||amount<1||amount>10000000)return json(response,400,{error:'지급 골드는 1~10,000,000 사이의 정수여야 합니다.'});
      return json(response,201,{coupon:await store.createCoupon(normalized,amount,id)});
    }
    if(request.method==='POST'&&pathname==='/api/coupons/redeem'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      if(id===developerId)return json(response,400,{error:'개발자 계정은 선물 코드를 사용할 수 없습니다.'});
      const {code}=await readJson(request),normalized=typeof code==='string'?code.trim().toUpperCase():'';
      if(!normalized)return json(response,400,{error:'코드를 입력해 주세요.'});
      const reward=await store.redeemCoupon(id,normalized);return json(response,200,reward);
    }
    if(request.method==='GET'&&pathname==='/api/chat/contacts'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});return json(response,200,{contacts:await store.listChatContacts(id,developerId)});
    }
    const chatMatch=pathname.match(/^\/api\/chat\/([A-Za-z0-9가-힣_]{3,16})$/);
    if(chatMatch&&request.method==='GET'){
      const id=tokenUser(request),peer=chatMatch[1];if(!id)return json(response,401,{error:'로그인이 필요합니다.'});if(peer===id||(!await store.get(peer)&&peer!==developerId))return json(response,404,{error:'대화 상대를 찾을 수 없습니다.'});return json(response,200,{messages:await store.getDirectMessages(id,peer)});
    }
    if(chatMatch&&request.method==='POST'){
      const id=tokenUser(request),peer=chatMatch[1];if(!id)return json(response,401,{error:'로그인이 필요합니다.'});const {content}=await readJson(request),text=typeof content==='string'?content.trim():'';if(peer===id||(!await store.get(peer)&&peer!==developerId))return json(response,404,{error:'대화 상대를 찾을 수 없습니다.'});if(text.length<1||text.length>500)return json(response,400,{error:'메시지는 1~500자로 입력해 주세요.'});return json(response,201,{message:await store.sendDirectMessage(id,peer,text)});
    }
    if(request.method==='GET'&&pathname==='/api/community/posts'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      return json(response,200,{posts:await store.listPosts()});
    }
    if(request.method==='POST'&&pathname==='/api/community/posts'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      const {title,content}=await readJson(request),cleanTitle=typeof title==='string'?title.trim():'',cleanContent=typeof content==='string'?content.trim():'';
      if(cleanTitle.length<2||cleanTitle.length>80||cleanContent.length<2||cleanContent.length>1000)return json(response,400,{error:'제목은 2~80자, 내용은 2~1000자로 입력해 주세요.'});
      return json(response,201,{post:await store.createPost(id,cleanTitle,cleanContent)});
    }
    const postMatch=pathname.match(/^\/api\/community\/posts\/(\d+)$/);
    if(postMatch&&(request.method==='PUT'||request.method==='DELETE')){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});const post=await store.getPost(postMatch[1]);if(!post)return json(response,404,{error:'게시글을 찾을 수 없습니다.'});if(post.user_id!==id&&id!==developerId)return json(response,403,{error:'작성자 또는 개발자만 수정·삭제할 수 있습니다.'});
      if(request.method==='DELETE'){await store.deletePost(postMatch[1]);return json(response,200,{deleted:true});}
      const {title,content}=await readJson(request),cleanTitle=typeof title==='string'?title.trim():'',cleanContent=typeof content==='string'?content.trim():'';if(cleanTitle.length<2||cleanTitle.length>80||cleanContent.length<2||cleanContent.length>1000)return json(response,400,{error:'제목은 2~80자, 내용은 2~1000자로 입력해 주세요.'});return json(response,200,{post:await store.updatePost(postMatch[1],cleanTitle,cleanContent)});
    }
    const commentMatch=pathname.match(/^\/api\/community\/posts\/(\d+)\/comments$/);
    if(request.method==='POST'&&commentMatch){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      const {content}=await readJson(request),text=typeof content==='string'?content.trim():'';
      if(text.length<1||text.length>500)return json(response,400,{error:'댓글은 1~500자로 입력해 주세요.'});
      const comment=await store.createComment(id,commentMatch[1],text);if(!comment)return json(response,404,{error:'게시글을 찾을 수 없습니다.'});
      return json(response,201,{comment});
    }
    if(request.method==='POST'&&pathname==='/api/suggestions'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      const {content}=await readJson(request),text=typeof content==='string'?content.trim():'';
      if(text.length<2||text.length>500)return json(response,400,{error:'건의 내용은 2~500자로 입력해 주세요.'});
      return json(response,201,{suggestion:await store.createSuggestion(id,text)});
    }
    if(request.method==='GET'&&pathname==='/api/suggestions'){
      const id=tokenUser(request);if(!id)return json(response,401,{error:'로그인이 필요합니다.'});
      return json(response,200,{suggestions:await store.listSuggestions(id,id===developerId)});
    }
    const replyMatch=pathname.match(/^\/api\/suggestions\/(\d+)\/reply$/);
    if(request.method==='PUT'&&replyMatch){
      const id=tokenUser(request);if(id!==developerId)return json(response,403,{error:'개발자 계정만 답변할 수 있습니다.'});
      const {response:answer}=await readJson(request),text=typeof answer==='string'?answer.trim():'';
      if(text.length<1||text.length>1000)return json(response,400,{error:'답변은 1~1000자로 입력해 주세요.'});
      const suggestion=await store.replySuggestion(replyMatch[1],text);if(!suggestion)return json(response,404,{error:'건의를 찾을 수 없습니다.'});
      return json(response,200,{suggestion});
    }
    return json(response,404,{error:'API를 찾을 수 없습니다.'});
  }catch(error){console.error(error);const messages={23505:'이미 사용 중인 아이디입니다.',coupon_not_found:'존재하지 않거나 종료된 코드예요.',coupon_used:'이미 사용한 코드예요.',account_not_found:'계정을 찾을 수 없습니다.'};return json(response,messages[error.code]?400:500,{error:messages[error.code]||'서버 저장 중 오류가 발생했습니다.'});}
}
function handle(request,response){
  const pathname=decodeURIComponent(request.url.split('?')[0]);response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(pathname==='/health')return json(response,200,{status:'ok',game:'고양이 성채전',database:Boolean(process.env.DATABASE_URL)});if(pathname.startsWith('/api/')){allowApiOrigin(request,response);if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}return api(request,response,pathname);}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return;}
  fs.readFile(file,(error,contents)=>{if(error){response.writeHead(404).end('Not found');return;}let data=contents,host=/^[a-z0-9.-]+(?::\d+)?$/i.test(request.headers.host||'')?request.headers.host:'';if(host&&['.html','.xml','.txt'].includes(path.extname(file))){const forwarded=String(request.headers['x-forwarded-proto']||'').split(',')[0],protocol=forwarded==='https'||forwarded==='http'?forwarded:'http';data=Buffer.from(data.toString('utf8').replaceAll(canonicalUrl,`${protocol}://${host}/`));}response.setHeader('Cache-Control',process.env.NODE_ENV==='production'?'public, max-age=300':'no-store');response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');response.end(data);});
}
createStore().then(value=>{store=value;http.createServer(handle).listen(port,'0.0.0.0',()=>console.log(`Game server: http://localhost:${port}`));}).catch(error=>{console.error('Database startup failed',error);process.exit(1);});
