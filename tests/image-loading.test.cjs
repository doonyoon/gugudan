const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const requests=[],images=[];
class FakeImage {constructor(){images.push(this);}set src(value){requests.push(value);this.url=value;}}
const c=vm.createContext({Image:FakeImage,Map,game:null,draw:()=>{}});
vm.runInContext(source.slice(source.indexOf('const imageCache='),source.indexOf('const spriteImages=')),c);
const lazy=c.lazyGameImages([['first','assets/characters/runner.png'],['unused','assets/characters/chronos.png']]);
assert.equal(requests.length,0);
const first=lazy.first;assert.equal(lazy.first,first);assert.equal(requests.length,1);
for(let i=0;i<8;i++)c.loadGameImage(`assets/backgrounds/stage-${i}.png`,'low');
assert.equal(requests.length,4);
first.onload();assert.equal(requests.length,5);
assert(requests.every(url=>url.endsWith('.webp?v=20261030')));
assert(!requests.some(url=>url.includes('chronos')));
images[1].onerror();assert.equal(requests.at(-1),'assets/backgrounds/stage-0.png');
images[1].onerror();assert.equal(requests.length,7); // Failed fallback releases a queue slot.
for(const name of ['thief.png','thief.webp','thief-skill.png','thief-skill.webp'])assert(fs.existsSync(require('node:path').join(__dirname,'../assets/characters',name)),`${name} is missing`);
const frameSource=fs.readFileSync(require('node:path').join(__dirname,'../sprite-frames.js'),'utf8'),frameContext=vm.createContext({});vm.runInContext(`${frameSource};globalThis.frames=SPRITE_FRAMES`,frameContext);assert.equal(frameContext.frames.thief.frames.length,8);assert.equal(frameContext.frames.thiefSkill.frames.length,8);
assert.match(source,/\{rarity:'슈퍼 레전드 레어',rate:\.1\}/);assert.match(source,/elapsed<\.64/);
assert.match(source,/const GOLDEN_GACHA_RATES = \[[\s\S]*\{rarity:'슈퍼 레전드 레어',rate:\.1\}/);
console.log('Image loading checks passed: lazy requests, deduplication, concurrency, PNG fallback');
