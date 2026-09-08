const fs = require('fs');
const path = require('path');

const emptyProgress = () => ({ gold:0, highestStage:0, cleared:[], owned:['runner','tank','fighter','mage'], loadout:['runner','tank','fighter','mage'], levels:{runner:1,tank:1,fighter:1,mage:1}, redeemedCodes:[] });
function sanitizeProgress(value){const source=value&&typeof value==='object'?value:{};const text=JSON.stringify({...emptyProgress(),...source});if(text.length>100000)throw new Error('Progress is too large');return JSON.parse(text);}

async function createStore(){
  if(process.env.DATABASE_URL){
    const {Pool}=require('pg');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined});
    await pool.query(`CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(16) PRIMARY KEY,password_hash TEXT NOT NULL,salt TEXT NOT NULL,progress JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    return {
      async get(id){const result=await pool.query('SELECT * FROM accounts WHERE id=$1',[id]);return result.rows[0]||null;},
      async create(account){await pool.query('INSERT INTO accounts(id,password_hash,salt,progress) VALUES($1,$2,$3,$4)',[account.id,account.password_hash,account.salt,sanitizeProgress(account.progress)]);},
      async saveProgress(id,progress){const result=await pool.query('UPDATE accounts SET progress=$2,updated_at=NOW() WHERE id=$1',[id,sanitizeProgress(progress)]);return result.rowCount===1;}
    };
  }
  const directory=path.join(__dirname,'.data'),file=path.join(directory,'accounts.json');fs.mkdirSync(directory,{recursive:true});let accounts={};try{accounts=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  const persist=()=>{const temporary=`${file}.tmp`;fs.writeFileSync(temporary,JSON.stringify(accounts,null,2));fs.renameSync(temporary,file);};
  return {async get(id){return accounts[id]||null;},async create(account){if(accounts[account.id]){const error=new Error('duplicate');error.code='23505';throw error;}accounts[account.id]={...account,created_at:new Date().toISOString()};persist();},async saveProgress(id,progress){if(!accounts[id])return false;accounts[id].progress=sanitizeProgress(progress);accounts[id].updated_at=new Date().toISOString();persist();return true;}};
}
module.exports={createStore,emptyProgress,sanitizeProgress};
