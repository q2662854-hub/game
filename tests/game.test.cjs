const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){
 const elements=new Map(),store=new Map();
 const drawing=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:id.includes('Overlay')&&id!=='startOverlay',style:{},textContent:'',innerHTML:'',getContext:()=>drawing,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650}),addEventListener(){},setAttribute(){}});return elements.get(id)};
 const context={document:{getElementById:element},window:{addEventListener(){}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},console};
 vm.createContext(context);
 const source=fs.readFileSync('src/main.js','utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source+`\nglobalThis.game={reset,fire,update,draw,pause,closeGuide,element:$,state:()=>({mode,score,kills,fired,hits,lives,level,chain,cars,shots}),aimAt:(x,y)=>aim={x,y}};`,context);
 return context.game;
}
test('initial scene renders and a new run resets the HUD',()=>{let g=setup();g.draw();assert.equal(g.state().mode,'demo');g.reset();assert.equal(g.state().lives,5);assert.equal(g.state().score,0);assert.equal(g.element('startOverlay').style.display,'none');g.draw()});
test('windshield hit stops a moving vehicle and earns points',()=>{let g=setup();g.reset();let car=g.state().cars[0];g.aimAt(car.x,car.y+27);g.fire();for(let i=0;i<60;i++)g.update(1/60);assert.equal(g.state().kills,1);assert.equal(g.state().hits,1);assert.equal(g.state().score,100);assert.ok(car.dead);assert.notEqual(car.angle,0);g.draw()});
test('body shots miss, and cooldown prevents rapid firing',()=>{let g=setup();g.reset();let c=g.state().cars[0];g.aimAt(c.x,c.y-45);g.fire();g.fire();assert.equal(g.state().fired,1);for(let i=0;i<60;i++)g.update(1/60);assert.equal(g.state().hits,0);assert.equal(g.state().kills,0)});
test('pause, resume, guide and restart controls work',()=>{let g=setup();g.reset();g.pause();assert.equal(g.state().mode,'paused');assert.equal(g.element('pauseOverlay').hidden,false);g.pause();assert.equal(g.state().mode,'playing');g.element('guideBtn').onclick();assert.equal(g.state().mode,'guide');g.closeGuide();assert.equal(g.state().mode,'playing');g.element('restartBtn').onclick();assert.equal(g.state().fired,0)});
test('five escaped vehicles end a run, and replay clears results',()=>{let g=setup();g.reset();for(let i=0;i<15000&&g.state().mode==='playing';i++)g.update(1/60);assert.equal(g.state().mode,'ended');assert.equal(g.state().lives,0);assert.equal(g.element('endOverlay').hidden,false);g.element('againBtn').onclick();assert.equal(g.state().mode,'playing');assert.equal(g.state().lives,5)});
