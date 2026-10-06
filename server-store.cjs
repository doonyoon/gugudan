const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Render's free network may not have a usable IPv6 route to external Postgres.
// Prefer the pooler's IPv4 record when both address families are published.
dns.setDefaultResultOrder('ipv4first');

const emptyProgress = () => ({ gold:0, highestStage:0, cleared:[], owned:['runner','tank','fighter','mage'], loadout:['runner','tank','fighter','mage'], levels:{runner:1,tank:1,fighter:1,mage:1}, redeemedCodes:[] });
function sanitizeProgress(value){const source=value&&typeof value==='object'?value:{};const text=JSON.stringify({...emptyProgress(),...source});if(text.length>100000)throw new Error('Progress is too large');return JSON.parse(text);}

async function createStore(){
  if(process.env.DATABASE_URL){
    const {Pool}=require('pg');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined});
    await pool.query(`CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(16) PRIMARY KEY,password_hash TEXT NOT NULL,salt TEXT NOT NULL,progress JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS suggestions (id BIGSERIAL PRIMARY KEY,user_id VARCHAR(16) NOT NULL,content VARCHAR(500) NOT NULL,response VARCHAR(1000),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),responded_at TIMESTAMPTZ)`);
    return {
      async get(id){const result=await pool.query('SELECT * FROM accounts WHERE id=$1',[id]);return result.rows[0]||null;},
      async create(account){await pool.query('INSERT INTO accounts(id,password_hash,salt,progress) VALUES($1,$2,$3,$4)',[account.id,account.password_hash,account.salt,sanitizeProgress(account.progress)]);},
      async saveProgress(id,progress){const result=await pool.query('UPDATE accounts SET progress=$2,updated_at=NOW() WHERE id=$1',[id,sanitizeProgress(progress)]);return result.rowCount===1;},
      async listAccounts(){const result=await pool.query("SELECT id,progress,created_at,updated_at FROM accounts ORDER BY created_at DESC");return result.rows;},
      async createSuggestion(user_id,content){const result=await pool.query('INSERT INTO suggestions(user_id,content) VALUES($1,$2) RETURNING *',[user_id,content]);return result.rows[0];},
      async listSuggestions(user_id,isDeveloper){const result=await pool.query(isDeveloper?'SELECT * FROM suggestions ORDER BY created_at DESC':'SELECT * FROM suggestions WHERE user_id=$1 ORDER BY created_at DESC',isDeveloper?[]:[user_id]);return result.rows;},
      async replySuggestion(id,response){const result=await pool.query('UPDATE suggestions SET response=$2,responded_at=NOW() WHERE id=$1 RETURNING *',[id,response]);return result.rows[0]||null;}
    };
  }
  const directory=path.join(__dirname,'.data'),file=path.join(directory,'accounts.json'),suggestionFile=path.join(directory,'suggestions.json');fs.mkdirSync(directory,{recursive:true});let accounts={},suggestions=[];try{accounts=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}try{suggestions=JSON.parse(fs.readFileSync(suggestionFile,'utf8'));}catch{}
  const persist=()=>{const temporary=`${file}.tmp`;fs.writeFileSync(temporary,JSON.stringify(accounts,null,2));fs.renameSync(temporary,file);};
  const persistSuggestions=()=>{const temporary=`${suggestionFile}.tmp`;fs.writeFileSync(temporary,JSON.stringify(suggestions,null,2));fs.renameSync(temporary,suggestionFile);};
  return {async get(id){return accounts[id]||null;},async create(account){if(accounts[account.id]){const error=new Error('duplicate');error.code='23505';throw error;}accounts[account.id]={...account,created_at:new Date().toISOString()};persist();},async saveProgress(id,progress){if(!accounts[id])return false;accounts[id].progress=sanitizeProgress(progress);accounts[id].updated_at=new Date().toISOString();persist();return true;},async listAccounts(){return Object.values(accounts).map(({id,progress,created_at,updated_at})=>({id,progress,created_at,updated_at})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));},async createSuggestion(user_id,content){const suggestion={id:Date.now()+Math.floor(Math.random()*1000),user_id,content,response:null,created_at:new Date().toISOString(),responded_at:null};suggestions.unshift(suggestion);persistSuggestions();return suggestion;},async listSuggestions(user_id,isDeveloper){return suggestions.filter(item=>isDeveloper||item.user_id===user_id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));},async replySuggestion(id,response){const suggestion=suggestions.find(item=>String(item.id)===String(id));if(!suggestion)return null;suggestion.response=response;suggestion.responded_at=new Date().toISOString();persistSuggestions();return suggestion;}};
}
module.exports={createStore,emptyProgress,sanitizeProgress};
