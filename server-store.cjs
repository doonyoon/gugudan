const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const emptyProgress = () => ({ gold:0, highestStage:0, cleared:[], owned:['runner','tank','fighter','mage'], loadout:['runner','tank','fighter','mage'], levels:{runner:1,tank:1,fighter:1,mage:1}, redeemedCodes:[] });
function sanitizeProgress(value){const source=value&&typeof value==='object'?value:{};const text=JSON.stringify({...emptyProgress(),...source});if(text.length>100000)throw new Error('Progress is too large');return JSON.parse(text);}
function codedError(code){const error=new Error(code);error.code=code;return error;}

async function createStore(){
  if(process.env.DATABASE_URL){
    const {Pool}=require('pg');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined});
    await pool.query(`CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(16) PRIMARY KEY,password_hash TEXT NOT NULL,salt TEXT NOT NULL,progress JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS suggestions (id BIGSERIAL PRIMARY KEY,user_id VARCHAR(16) NOT NULL,content VARCHAR(500) NOT NULL,response VARCHAR(1000),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),responded_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS coupons (code VARCHAR(32) PRIMARY KEY,gold INTEGER NOT NULL CHECK (gold > 0),created_by VARCHAR(16) NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS coupon_redemptions (coupon_code VARCHAR(32) NOT NULL REFERENCES coupons(code) ON DELETE CASCADE,user_id VARCHAR(16) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(coupon_code,user_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS community_posts (id BIGSERIAL PRIMARY KEY,user_id VARCHAR(16) NOT NULL,title VARCHAR(80) NOT NULL,content VARCHAR(1000) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS community_comments (id BIGSERIAL PRIMARY KEY,post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,user_id VARCHAR(16) NOT NULL,content VARCHAR(500) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query("INSERT INTO coupons(code,gold,created_by) VALUES('9027',10000,'system') ON CONFLICT(code) DO NOTHING");
    return {
      async get(id){const result=await pool.query('SELECT * FROM accounts WHERE id=$1',[id]);return result.rows[0]||null;},
      async create(account){await pool.query('INSERT INTO accounts(id,password_hash,salt,progress) VALUES($1,$2,$3,$4)',[account.id,account.password_hash,account.salt,sanitizeProgress(account.progress)]);},
      async saveProgress(id,progress){const result=await pool.query('UPDATE accounts SET progress=$2,updated_at=NOW() WHERE id=$1',[id,sanitizeProgress(progress)]);return result.rowCount===1;},
      async listAccounts(){const result=await pool.query('SELECT id,progress,created_at,updated_at FROM accounts ORDER BY created_at DESC');return result.rows;},
      async createSuggestion(user_id,content){const result=await pool.query('INSERT INTO suggestions(user_id,content) VALUES($1,$2) RETURNING *',[user_id,content]);return result.rows[0];},
      async listSuggestions(user_id,isDeveloper){const result=await pool.query(isDeveloper?'SELECT * FROM suggestions ORDER BY created_at DESC':'SELECT * FROM suggestions WHERE user_id=$1 ORDER BY created_at DESC',isDeveloper?[]:[user_id]);return result.rows;},
      async replySuggestion(id,response){const result=await pool.query('UPDATE suggestions SET response=$2,responded_at=NOW() WHERE id=$1 RETURNING *',[id,response]);return result.rows[0]||null;},
      async createCoupon(code,gold,createdBy){const result=await pool.query('INSERT INTO coupons(code,gold,created_by,active) VALUES($1,$2,$3,TRUE) ON CONFLICT(code) DO UPDATE SET gold=EXCLUDED.gold,created_by=EXCLUDED.created_by,active=TRUE,updated_at=NOW() RETURNING *',[code,gold,createdBy]);return result.rows[0];},
      async listCoupons(){const result=await pool.query('SELECT code,gold,active,created_at,updated_at FROM coupons ORDER BY updated_at DESC LIMIT 100');return result.rows;},
      async redeemCoupon(user_id,code){
        const client=await pool.connect();
        try{
          await client.query('BEGIN');
          const coupon=(await client.query('SELECT code,gold FROM coupons WHERE code=$1 AND active=TRUE FOR UPDATE',[code])).rows[0];
          if(!coupon)throw codedError('coupon_not_found');
          const claimed=await client.query('INSERT INTO coupon_redemptions(coupon_code,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING coupon_code',[code,user_id]);
          if(!claimed.rowCount)throw codedError('coupon_used');
          const account=(await client.query('SELECT progress FROM accounts WHERE id=$1 FOR UPDATE',[user_id])).rows[0];
          if(!account)throw codedError('account_not_found');
          const progress=sanitizeProgress(account.progress);progress.gold=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(progress.gold)||0)+Number(coupon.gold));progress.redeemedCodes=[...new Set([...(progress.redeemedCodes||[]),code])];
          await client.query('UPDATE accounts SET progress=$2,updated_at=NOW() WHERE id=$1',[user_id,progress]);
          await client.query('COMMIT');return {gold:Number(coupon.gold),progress};
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      },
      async createPost(user_id,title,content){const result=await pool.query('INSERT INTO community_posts(user_id,title,content) VALUES($1,$2,$3) RETURNING *',[user_id,title,content]);return {...result.rows[0],comments:[]};},
      async listPosts(){const posts=(await pool.query('SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 100')).rows;if(!posts.length)return [];const ids=posts.map(post=>post.id),comments=(await pool.query('SELECT * FROM community_comments WHERE post_id=ANY($1::bigint[]) ORDER BY created_at ASC',[ids])).rows,byPost=new Map(posts.map(post=>[String(post.id),{...post,comments:[]}]));comments.forEach(comment=>byPost.get(String(comment.post_id))?.comments.push(comment));return posts.map(post=>byPost.get(String(post.id)));},
      async createComment(user_id,postId,content){const exists=await pool.query('SELECT id FROM community_posts WHERE id=$1',[postId]);if(!exists.rowCount)return null;const result=await pool.query('INSERT INTO community_comments(post_id,user_id,content) VALUES($1,$2,$3) RETURNING *',[postId,user_id,content]);return result.rows[0];}
    };
  }
  const directory=path.join(__dirname,'.data'),file=path.join(directory,'accounts.json'),suggestionFile=path.join(directory,'suggestions.json'),couponFile=path.join(directory,'coupons.json'),communityFile=path.join(directory,'community.json');
  fs.mkdirSync(directory,{recursive:true});let accounts={},suggestions=[],coupons={},community={nextPostId:1,nextCommentId:1,posts:[]};
  try{accounts=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}try{suggestions=JSON.parse(fs.readFileSync(suggestionFile,'utf8'));}catch{}try{coupons=JSON.parse(fs.readFileSync(couponFile,'utf8'));}catch{}try{community={...community,...JSON.parse(fs.readFileSync(communityFile,'utf8'))};}catch{}
  if(!coupons['9027'])coupons['9027']={code:'9027',gold:10000,created_by:'system',active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const write=(target,data)=>{const temporary=`${target}.tmp`;fs.writeFileSync(temporary,JSON.stringify(data,null,2));fs.renameSync(temporary,target);};const persist=()=>write(file,accounts),persistSuggestions=()=>write(suggestionFile,suggestions),persistCoupons=()=>write(couponFile,coupons),persistCommunity=()=>write(communityFile,community);
  return {
    async get(id){return accounts[id]||null;},async create(account){if(accounts[account.id])throw codedError('23505');accounts[account.id]={...account,created_at:new Date().toISOString()};persist();},async saveProgress(id,progress){if(!accounts[id])return false;accounts[id].progress=sanitizeProgress(progress);accounts[id].updated_at=new Date().toISOString();persist();return true;},async listAccounts(){return Object.values(accounts).map(({id,progress,created_at,updated_at})=>({id,progress,created_at,updated_at})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));},async createSuggestion(user_id,content){const suggestion={id:Date.now()+Math.floor(Math.random()*1000),user_id,content,response:null,created_at:new Date().toISOString(),responded_at:null};suggestions.unshift(suggestion);persistSuggestions();return suggestion;},async listSuggestions(user_id,isDeveloper){return suggestions.filter(item=>isDeveloper||item.user_id===user_id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));},async replySuggestion(id,response){const suggestion=suggestions.find(item=>String(item.id)===String(id));if(!suggestion)return null;suggestion.response=response;suggestion.responded_at=new Date().toISOString();persistSuggestions();return suggestion;},
    async createCoupon(code,gold,createdBy){const now=new Date().toISOString();coupons[code]={code,gold,created_by:createdBy,active:true,created_at:coupons[code]?.created_at||now,updated_at:now};persistCoupons();return coupons[code];},async listCoupons(){return Object.values(coupons).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));},async redeemCoupon(user_id,code){const coupon=coupons[code];if(!coupon||!coupon.active)throw codedError('coupon_not_found');const account=accounts[user_id];if(!account)throw codedError('account_not_found');const progress=sanitizeProgress(account.progress);if(progress.redeemedCodes.includes(code))throw codedError('coupon_used');progress.gold=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(progress.gold)||0)+Number(coupon.gold));progress.redeemedCodes.push(code);account.progress=progress;account.updated_at=new Date().toISOString();persist();return {gold:Number(coupon.gold),progress};},
    async createPost(user_id,title,content){const post={id:community.nextPostId++,user_id,title,content,created_at:new Date().toISOString(),comments:[]};community.posts.unshift(post);persistCommunity();return post;},async listPosts(){return community.posts.slice(0,100).map(post=>({...post,comments:[...(post.comments||[])]}));},async createComment(user_id,postId,content){const post=community.posts.find(item=>String(item.id)===String(postId));if(!post)return null;const comment={id:community.nextCommentId++,post_id:post.id,user_id,content,created_at:new Date().toISOString()};post.comments.push(comment);persistCommunity();return comment;}
  };
}
module.exports={createStore,emptyProgress,sanitizeProgress};
