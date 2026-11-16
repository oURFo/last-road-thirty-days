(function(root){
'use strict';
const D=root.GameData||(typeof require==='function'?require('./data.js'):null);
const ITEMS=Object.fromEntries(D.items.map(x=>[x.id,x]));
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const clone=x=>JSON.parse(JSON.stringify(x));
const WEATHER=[{name:'晴朗',type:'none',s:0,color:'#d4c6a1'},{name:'陰天',type:'none',s:0,color:'#94a3a0'},{name:'細雨',type:'rain',s:20,color:'#7e9eac'},{name:'高溫',type:'heat',s:55,color:'#d0a36a'},{name:'暴雨',type:'rain',s:65,color:'#597b90'},{name:'寒潮',type:'cold',s:75,color:'#96b7be'},{name:'沙塵',type:'dust',s:65,color:'#b09a71'},{name:'酸雨',type:'acid',s:75,color:'#819665'}];
function hash(str){let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||17;}
class Game{
 constructor(state){this.s=state;this.dirty=true;}
 random(){let x=this.s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.s.rng=x>>>0;return (x>>>0)/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 roll(p){return this.random()<p;}
 get player(){return this.s.actors[0];}
 get day(){return Math.floor(this.s.minute/1440)+1;}
 get night(){const h=(6+this.s.minute/60)%24;return h>=18||h<6;}
 get quota(){return this.day<=3?60:this.day<=7?90:this.day<=14?120:this.day<=21?150:180;}
 spec(a=this.player){return D.vehicles.vehicles.find(v=>v.id===a.family+'-T'+a.tier);}
 capacity(a=this.player){return 6+this.spec(a).capacitySlots+(a.mods.slots||0)+(a.id==='P'&&this.s.system?.id===11?[6,12,20][this.level()-1]:0);}
 used(a=this.player){return Object.entries(a.inv).reduce((n,[id,q])=>n+Math.ceil(q/(ITEMS[id]?.stack||1)),0);}
 add(a,id,q=1){if(!ITEMS[id]||q<=0)return false;const item=ITEMS[id];if(item.kind==='material'){a.mats[item.material]=(a.mats[item.material]||0)+q;return true;}const old=a.inv[id]||0;a.inv[id]=old+q;if(this.used(a)>this.capacity(a)){if(old)a.inv[id]=old;else delete a.inv[id];return false;}return true;}
 remove(a,id,q=1){if((a.inv[id]||0)<q)return false;a.inv[id]-=q;if(!a.inv[id])delete a.inv[id];return true;}
 log(text,type='info'){this.s.logs.unshift({time:this.s.minute,day:this.day,text,type});this.s.logs=this.s.logs.slice(0,160);}
 say(a,intent,slots={}){if(!a||!a.alive)return;const voice=D.identity.voices.find(v=>v.id===a.voice)||D.identity.voices[0];let text=this.pick(voice.templates[intent]||['{fact}']);const values={item:'補給',quantity:'一些',terms:'可用物資',reason:'我得先顧好自己的行程',fact:'仍在公路上',task:'共同探索',...slots};text=text.replace(/\{(\w+)\}/g,(_,k)=>String(values[k]??''));this.s.messages.unshift({id:++this.s.serial,actor:a.id,name:a.name,text,time:this.s.minute,channel:'region'});this.s.messages=this.s.messages.slice(0,160);}
 relation(a,b){if(!a.rels[b])a.rels[b]={like:0,trust:30,debt:0};return a.rels[b];}
 bond(a,b,like,trust=like/2){const r=this.relation(a,b);r.like=clamp(r.like+like,-100,100);r.trust=clamp(r.trust+trust);}
 kill(a,reason){if(!a.alive)return;a.alive=false;a.reason=reason;this.s.listings=this.s.listings.filter(l=>l.seller!==a.id);this.log(a.id==='P'?'你沒能走到公路盡頭。'+reason:a.name+' 死亡：'+reason,'death');if(a.id==='P'){this.s.status='dead';this.s.running=false;this.s.work=null;this.s.prompt=null;}else if(this.s.messages.length<155)this.s.messages.unshift({id:++this.s.serial,actor:'central',name:'中央系統',text:`${a.name} 已失去生命訊號。原因：${reason}`,time:this.s.minute,channel:'system'});}
 static create(seed=String(Date.now()),opts={}){
  const game=new Game({version:1,seed:String(seed),rng:hash(seed),minute:0,status:'playing',running:false,actors:[],logs:[],messages:[],listings:[],serial:0,weather:WEATHER[0],route:[],passed:[],nextNode:0,work:null,prompt:null,system:null,dayStats:{},lastHour:0,lastNpc:0,mode:'停車',loot:null,notice:'',test:!!opts.test});
  const s=game.s, names=new Set(), femaleCount=40+Math.floor(game.random()*20),genders=Array.from({length:99},(_,i)=>i<femaleCount?'female':'male');for(let i=genders.length-1;i>0;i--){const j=Math.floor(game.random()*(i+1));[genders[i],genders[j]]=[genders[j],genders[i]];}
  function family(){const profiles=D.vehicles.categoryWeights;let n=game.random()*100;for(const [p,w]of Object.entries(profiles)){n-=w;if(n<0)return game.pick(D.vehicles.families.filter(f=>f.profile===p)).id;}return 'F01';}
  function actor(id,index){const gender=genders[index]||'male';let name='你';if(id!=='P'){do{name=game.pick(D.identity.surnames)+game.pick(D.identity.givenNames[gender]);}while(names.has(name));names.add(name);}
   const f=id==='P'&&opts.family?opts.family:family();const a={id,name,gender,family:f,tier:1,alive:true,hp:100,san:100,food:85,water:85,stamina:100,condition:80,tire:80,armor:0,energy:0,km:0,daily:0,inv:{},mats:{metal:4,parts:2,rubber:2,cloth:3,circuit:1,plastic:2,wood:2,chemical:2,core:1},credits:30,mods:{},exposure:0,bleed:0,voice:game.pick(D.identity.voices).id,personality:game.pick(['謹慎','冒險','互助','商人','技師','投機','強硬']),greed:20+game.random()*70,skill:2+Math.floor(game.random()*7),group:index%5,rels:{},nextAction:0,action:'整理物資',friends:false,kills:0,scavenge:0};
   a.boundFamilyId=f;a.boundVehicleId='vehicle-'+id;s.actors.push(a);const v=game.spec(a);a.energy=v.energyPer100Km*1.8;a.armor=v.armorMax*.8;for(const [item,q]of [['food0',3],['water0',4],['med0',1]])game.add(a,item,q);if(v.energy==='人力'){game.add(a,'food0',2);a.mats.core=1;}if(id!=='P'){a.credits=15+Math.floor(game.random()*70);if(game.roll(.35))game.add(a,'tool'+Math.floor(game.random()*8),1);}return a;
  }
  actor('P',0);for(let i=0;i<99;i++)actor('N'+String(i+1).padStart(3,'0'),i);
  // Initial sparse social networks: each person knows two peers in their group.
  for(const a of s.actors.slice(1)){const peers=s.actors.filter(b=>b.id!=='P'&&b.group===a.group&&b!==a);for(let i=0;i<2;i++){const b=game.pick(peers);game.bond(a,b.id,10+game.random()*20,10);}}
  if(opts.system!==undefined&&opts.test)s.system={id:opts.system,xp:0,used:0,points:1,signed:false};
  else if(game.roll(.01))s.system={id:Math.floor(game.random()*18),xp:0,used:0,points:1,signed:false};
  game.generateRoute();game.refreshMarket();game.log('你被帶入第 07 號公路空間。綁定載具：'+game.spec().name+'。','system');game.log('今日要求 60 公里。每日 06:00 未達標或確認逆行，中央系統將抹殺你。','system');if(s.system)game.log('稀有覺醒：'+D.systems[s.system.id]+'系統。','rare');
  for(const a of game.s.actors.slice(1,7))game.say(a,'status',{fact:game.pick(['剛確認自己的載具','先找水和食物','準備在天黑前達標','已把區域頻道打開'])});
  return game;
 }
 level(){return !this.s.system?0:this.s.system.xp>=300&&this.day>=10?3:this.s.system.xp>=100&&this.day>=4?2:1;}
 systemXp(n=10){if(this.s.system){const cap=40-(this.s.dayStats.xp||0);const gain=Math.max(0,Math.min(n,cap));this.s.system.xp+=gain;this.s.dayStats.xp=(this.s.dayStats.xp||0)+gain;}}
 generateRoute(){const p=this.player,v=this.spec();const weak=['micro','cycle'].includes(v.profile);while(this.s.route.length<7){const pos=(this.s.route.at(-1)?.km??p.km)+ (weak?5:8)+this.random()*(weak?6:12);const isBuilding=this.roll(weak?.72:.6);let b=isBuilding?this.pick(D.buildings):this.pick(D.events);if(this.day<4&&!isBuilding&&['npc','mission'].includes(b[2]))b=D.events[3];this.s.route.push({id:++this.s.serial,km:pos,side:this.roll(.5)?-1:1,name:b[0],desc:b[2],type:isBuilding?b[1]:b[2],building:isBuilding,quality:this.random(),visited:false});}}
 speed(a=this.player){const v=this.spec(a);return Math.max(3,v.cruiseKmh*(a.condition<40?.75:1)*(this.s.weather.type==='rain'?.8:1)*(a.id==='P'?(this.s.driveSpeed||1):1));}
 fuelId(a=this.player){return this.spec(a).energy==='柴油'?'diesel':this.spec(a).energy==='電力'?'battery':'gas';}
 consume(a,dt,moving){const hours=dt/60,v=this.spec(a);a.food-=3*hours;a.water-=(this.s.weather.type==='heat'?7:4)*hours;a.stamina-=3*hours;if(a.bleed)a.hp-=a.bleed*hours;
  if(moving)a.shelter=0;let protection=v.weatherProtection+(a.mods[this.s.weather.type]||0)+(a.shelter||0);for(const id of Object.keys(a.inv)){const it=ITEMS[id];if(it.kind==='gear'&&(it.weather==='all'||({'rain':'雨','cold':'冷','heat':'熱','dust':'塵','acid':'酸'})[this.s.weather.type]===it.weather))protection+=it.protection;}
  if(a.id==='P'&&this.s.system?.id===15)protection+=10+5*(this.level()-1);
  const deficit=Math.max(0,this.s.weather.s-protection);a.exposure=clamp(a.exposure+(deficit>0?deficit*.12:-15)*hours);if(a.exposure>30)a.san-=2*hours;if(a.exposure>60)a.hp-=4*hours;if(a.exposure>80)a.hp-=7*hours;
  if(a.food<=0)a.hp-=6*hours;if(a.water<=0)a.hp-=10*hours;
  if(moving){let km=this.speed(a)*hours;let efficiency=1;if(a.id==='P'&&this.s.system?.id===10)efficiency=1-.05*(this.level()+1);if(a.mods.efficient)efficiency*=.92;
   if(v.energy==='人力'){const effort=v.humanExtraStaminaPerKm*efficiency;if(a.stamina<5)km=0;else km=Math.min(km,Math.max(0,a.stamina-3)/Math.max(.1,effort));a.stamina-=km*effort;}
   else{const cost=v.energyPer100Km/100*efficiency*(this.s.driveSpeed>1?1.3:1);km=Math.min(km,Math.max(0,a.energy/cost));a.energy=Math.max(0,a.energy-km*cost);if(a.energy<.00001)a.energy=0;}
   a.km+=km;a.daily+=km;a.condition-=km*.007;a.tire-=km*.025;if(a.condition<=0||a.tire<=0)if(a.id==='P'){this.s.running=false;this.s.notice='載具故障。修理原車後才能繼續前進。';}
   if(a.id==='P'&&this.s.system?.id===17){const threshold=Math.min([2,3,4][this.level()-1],Math.floor(a.daily/30));while((this.s.dayStats.parcels||0)<threshold){this.s.dayStats.parcels=(this.s.dayStats.parcels||0)+1;this.add(a,this.pick(['food0','water0',this.fuelId()]),1);this.systemXp();}}
  }
  for(const key of ['food','water','hp','san','stamina','condition','tire'])a[key]=clamp(a[key]);if(a.hp<=0)this.kill(a,'健康耗盡');
 }
 advance(minutes,{moving=false,ignorePrompt=false}={}){
  if(this.s.status!=='playing')return 0;let remaining=minutes,advanced=0;
  while(remaining>1e-7&&this.s.status==='playing'){
   if(this.s.prompt&&!ignorePrompt)break;
   let dt=Math.min(5,remaining,1440-(this.s.minute%1440),60-(this.s.minute%60));const p=this.player;let target=null;
   if(moving){target=this.s.route[0];if(target)dt=Math.min(dt,Math.max(0,(target.km-p.km)/this.speed()*60));if(this.spec().energy!=='人力'&&p.energy<=.00001){this.s.running=false;this.s.notice='能源耗盡，先補充能源或開啟交易所。';break;}if(p.stamina<3){this.s.running=false;this.s.notice='精力不足，請先休息。';break;}if(p.condition<=0||p.tire<=0){this.s.running=false;this.s.notice='載具或輪胎故障，需要維修。';break;}}
   if(dt<1e-6&&target){this.arrive();break;}
   this.consume(p,dt,moving);this.s.minute=Math.round((this.s.minute+dt)*1e8)/1e8;advanced+=dt;remaining-=dt;
   if(this.s.status!=='playing')break;
   const block=Math.floor((this.s.minute+1e-7)/30);if(block>this.s.lastNpc){this.s.lastNpc=block;this.npcStep(30);}
   const hour=Math.floor((this.s.minute+1e-7)/60);if(hour>this.s.lastHour){this.s.lastHour=hour;this.hourly();}
   if(this.s.status!=='playing')break;
   if(this.s.minute%1440<1e-6){this.endDay();if(this.s.status!=='playing')break;}
   if(moving&&target&&p.km>=target.km-1e-6){p.km=target.km;this.arrive();break;}
   if(this.s.prompt&&!ignorePrompt)break;
  }
  this.dirty=true;return advanced;
 }
 tick(realSeconds){if(!this.s.running||this.s.status!=='playing'||this.s.prompt)return;
  if(!Number.isFinite(realSeconds)||realSeconds<=0)return;const mins=realSeconds*24;
  if(this.s.work){const w=this.s.work;const dt=Math.min(mins,w.left);const actual=this.advance(dt);w.left-=actual;
   if(w.type==='rest'&&this.s.status==='playing'){this.player.stamina=clamp(this.player.stamina+actual*.25);this.player.san=clamp(this.player.san+actual*.025);if(this.player.food>20&&this.player.water>20)this.player.hp=clamp(this.player.hp+actual*(this.player.mods.bed?.035:.01));}
   if(w.left<=1e-5&&this.s.status==='playing'&&!this.s.prompt){this.s.work=null;this.s.running=false;this.finishWork(w);}
  }else this.advance(mins,{moving:true});
 }
 start(){if(this.s.status!=='playing'||this.s.prompt)return;this.s.running=true;this.s.notice='';this.s.mode=this.s.work?this.s.work.label:'行駛';}
 pause(){this.s.running=false;this.s.mode='停車';}
 work(type,label,minutes,payload={}){if(this.s.work)return {ok:false,text:'請先完成或取消目前工作。'};this.s.work={type,label,left:minutes,total:minutes,...payload};this.s.running=true;this.s.mode=label;return {ok:true};}
 arrive(){const node=this.s.route.shift();if(!node)return;this.player.shelter=node.building?35:0;this.s.running=false;this.s.prompt={kind:'road',node};this.generateRoute();this.s.mode='遭遇';this.log('抵達 '+node.name+'，位於道路'+(node.side<0?'左側':'右側')+'。'+(node.building?'停靠期間有建築遮蔽，環境防護 +35。':''));}
 finishWork(w){const p=this.player;if(w.type==='search'){this.loot(w.node,w.deep);this.log('完成 '+w.node.name+' 的搜索。','loot');}
  if(w.type==='recipe'){const r=D.recipes.find(x=>x.id===w.recipe);if(r.effect==='repair')p.condition=clamp(p.condition+r.value);else if(r.effect==='tire')p.tire=clamp(p.tire+r.value);else if(r.effect==='item')this.add(p,r.value);else if(r.effect==='mat')p.mats[r.value]=(p.mats[r.value]||0)+1;else if(r.effect==='armor'){p.mods.armor=(p.mods.armor||0)+r.value;p.armor+=r.value;}else p.mods[r.effect]=(p.mods[r.effect]||0)+r.value;this.log('完成製作：'+r.name,'loot');}
  if(w.type==='upgrade'){p.tier++;const v=this.spec();p.armor=v.armorMax*p.condition/100;p.energy=Math.min(p.energy,v.tankOrBatteryCapacity);this.log('載具晉階：'+v.name+'。車系綁定保持不變。','rare');}
  if(w.type==='rest')this.log('休息結束。精力已恢復。');if(w.type==='system')this.finishSystem(w);
  if(w.type==='mission'){this.finishMission(w);}
 }
 search(deep=false){const pr=this.s.prompt;if(pr?.kind!=='road')return;const n=pr.node;this.s.prompt=null;return this.work('search','搜索 '+n.name,deep?90:30,{node:n,deep});}
 skip(){if(this.s.prompt?.kind==='combat'){this.escape();return;}this.s.prompt=null;this.s.running=false;}
 loot(node,deep=false){const p=this.player;let groups=deep?5:3;const grade=node.quality>.98?'傳說':node.quality>.90?'史詩':node.quality>.70?'稀有':node.quality>.40?'優良':'普通';if(node.quality>.7)groups+=2;const got=[];const pools={food:['food','water'],water:['water'],fuel:['fuel','fuel','food'],med:['med'],parts:['material','tool','fuel'],materials:['material'],gear:['gear','tool'],weapon:['weapon','ammo'],tool:['tool','material'],signal:['material','tool'],rest:['food','water'],mixed:['food','water','material','gear','fuel']};
  for(let i=0;i<groups;i++){const kind=this.pick(pools[node.type]||['food','water','material','fuel']);let it=this.pick(D.items.filter(x=>x.kind===kind));if(kind==='fuel'&&this.roll(.75))it=ITEMS[this.fuelId()];if(kind==='material'&&it.material==='core'&&!this.roll(.12))it=ITEMS.mat_metal;let amount=it.kind==='material'?2+Math.floor(this.random()*6):1+Math.floor(this.random()*2);if(kind==='fuel'&&it.energy===this.spec().energy)amount=Math.max(amount,Math.ceil(this.spec().energyPer100Km*(deep?.55:.3)/it.amount));if(this.add(p,it.id,amount))got.push({id:it.id,q:amount});else this.s.ground.push({id:it.id,q:amount});}
  if(this.s.system?.id===4&&(this.s.system.used||0)<2+this.level()){const x=got.find(x=>['food','water','fuel'].includes(ITEMS[x.id].kind));if(x){const extra=x.q*this.level();if(this.add(p,x.id,extra)){got.push({id:x.id,q:extra});this.s.system.used++;this.systemXp();}}}
  if(deep&&this.roll(.25)){p.hp-=8;p.san-=4;this.log('深搜時被尖銳物割傷，健康 −8。','warning');if(p.hp<=0)this.kill(p,'搜索意外失血');}
  if(node.type==='signal'){this.s.forecast=clone(this.weatherFor(this.day+1));this.log('取得明日天氣情報：'+this.s.forecast.name,'rare');}
  p.scavenge++;this.s.loot={title:grade+'補給箱 · '+node.name,items:got};this.log('獲得 '+got.map(x=>ITEMS[x.id].name+' ×'+x.q).join('、'),'loot');
 }
 hourly(){const p=this.player;this.autoNpcTrade();if(this.s.status!=='playing')return;
  if(this.night){let risk=this.day<=3?.025:this.day<=7?.05:.075;const profile=this.spec().profile;risk+=profile==='military'?.07:profile==='special'?.03:0;risk-=(p.mods.stealth||0)*.02;if(this.roll(Math.max(.01,risk))&&!this.s.prompt){this.s.running=false;this.s.prompt={kind:'combat',enemy:this.pick(['遊蕩者','撞擊獸','爬行者','群聚獸']),hp:25+this.day*2,attack:5+this.day*.55};this.log('夜間出現不明動靜。','warning');}}
  if(p.mods.solar&&!this.night&&this.s.weather.type==='none'&&this.spec().energy==='電力')p.energy=Math.min(this.spec().tankOrBatteryCapacity,p.energy+.6);
  const peers=this.s.actors.slice(1).filter(a=>a.alive);if(peers.length&&this.roll(.6)){const a=this.pick(peers);if(a.water<35)this.say(a,'need',{item:'飲用水',quantity:'一瓶',terms:'多餘材料'});else if(a.energy<1&&this.spec(a).energy!=='人力')this.say(a,'need',{item:this.spec(a).energy,quantity:'2 單位',terms:'食物或零件'});else this.say(a,'status',{fact:this.pick([`今日已走 ${Math.floor(a.daily)} 公里`,`正在${a.action}`,`準備應對${this.s.weather.name}`])});}
  this.socialStep();if(this.s.lastHour%4===0)this.refreshMarket();
 }
 npcStep(dt){for(const a of this.s.actors.slice(1)){if(!a.alive)continue;const v=this.spec(a);let moving=false;a.action='整理物資';
   const use=(kind,stat)=>{if(a[stat]>48)return;const id=Object.keys(a.inv).find(id=>ITEMS[id].kind===kind);if(id){this.useItem(a,id);a.action='補充'+(kind==='food'?'食物':'水分');}};use('food','food');use('water','water');
   if(a.hp<55){const med=Object.keys(a.inv).find(id=>ITEMS[id].kind==='med'&&ITEMS[id].heal>0);if(med)this.useItem(a,med);}
   if(v.energy!=='人力'&&a.energy<v.energyPer100Km*.3){const f=Object.keys(a.inv).find(id=>ITEMS[id].kind==='fuel'&&ITEMS[id].energy===v.energy);if(f)this.useItem(a,f);}
   if(a.stamina<35||(this.night&&a.daily>=this.quota)){a.stamina=clamp(a.stamina+dt*.25);a.san=clamp(a.san+dt*.04);a.action='休息';}
   else if(a.daily<this.quota&&(v.energy==='人力'||a.energy>0)&&a.condition>0&&a.tire>0){moving=true;a.action='前進';}
   else if(this.roll(.65)){a.action='搜索';const waterStock=Object.keys(a.inv).filter(k=>ITEMS[k].kind==='water').reduce((n,k)=>n+a.inv[k],0),foodStock=Object.keys(a.inv).filter(k=>ITEMS[k].kind==='food').reduce((n,k)=>n+a.inv[k],0);const kind=waterStock<3?'water':foodStock<3?'food':this.roll(.22)?'gear':this.roll(.15)?'med':'material';const it=this.pick(D.items.filter(i=>i.kind===kind));this.add(a,it.id,kind==='material'?3:1);if(this.roll(.4)&&v.energy!=='人力')this.add(a,this.fuelId(a),Math.max(1,Math.ceil(v.energyPer100Km*.2)));for(const key of ['metal','parts','rubber','circuit','cloth','plastic'])a.mats[key]=(a.mats[key]||0)+(this.roll(.5)?1:0);a.scavenge++;}
   if(v.energy!=='人力'&&a.energy<.1&&!moving){a.action='尋找能源';if(this.roll(.32))this.add(a,this.fuelId(a),Math.ceil(v.energyPer100Km*.35));}
   this.consume(a,dt,moving);if(this.s.weather.s>=40&&!(a.mods[this.s.weather.type]>=25)&&a.mats.cloth>=3&&a.mats.plastic>=3){a.mats.cloth-=3;a.mats.plastic-=3;a.mods[this.s.weather.type]=25;a.action='安裝天氣防護';}if(a.tire<40&&a.mats.rubber>=2){a.mats.rubber-=2;a.tire=clamp(a.tire+30);}if(a.condition<50&&a.mats.metal>=3){a.mats.metal-=3;a.condition=clamp(a.condition+20);}
   if(a.tier<5&&this.day>=[1,4,10,18][a.tier-1]&&a.scavenge>4*a.tier&&this.roll(.08)){const cost=this.spec(a).upgradeCost,keys={'金屬':'metal','零件':'parts','橡膠':'rubber','電路':'circuit','晉階核心':'core'};if(Object.entries(keys).every(([key,k])=>(a.mats[k]||0)>=(cost[key]||0))){for(const [key,k]of Object.entries(keys))a.mats[k]-=cost[key]||0;a.tier++;a.armor=this.spec(a).armorMax*a.condition/100;a.action='晉階';}}
   if(this.night&&this.roll(.018)){const damage=4+this.day*.6;if(a.armor>damage)a.armor-=damage;else{a.hp-=damage; a.san-=2;}}
   if(a.hp<=0)this.kill(a,'傷病或夜間襲擊');
  }}
 socialStep(){const alive=this.s.actors.slice(1).filter(a=>a.alive);if(alive.length<2)return;for(let i=0;i<2;i++){const a=this.pick(alive), peers=alive.filter(b=>b!==a&&(b.group===a.group||this.relation(a,b.id).like>15));if(!peers.length)continue;const b=this.pick(peers);let transferred=false;
   if(a.personality==='互助'||this.relation(a,b.id).trust>40){for(const kind of ['food','water']){if(b[kind]<35){const item=Object.keys(a.inv).find(id=>ITEMS[id].kind===kind&&a.inv[id]>1);if(item&&this.add(b,item)){this.remove(a,item);this.bond(b,a.id,10,6);this.relation(b,a.id).debt++;transferred=true;}}}}
   if(transferred&&this.roll(.5))this.say(b,'thanks');else if(this.roll(.15)){this.bond(a,b.id,-5,-2);if(this.roll(.3))this.log(a.name+' 與 '+b.name+' 因補給分配發生爭執。','social');}
  }
 }
 refreshMarket(){const alive=this.s.actors.slice(1).filter(a=>a.alive);this.s.listings=this.s.listings.filter(l=>{const owner=this.s.actors.find(a=>a.id===l.seller);if(!owner?.alive)return false;if(l.expires<=this.s.minute){if(!this.add(owner,l.item,l.q))(owner.returns??=[]).push({id:l.item,q:l.q});return false;}return true;});
  for(let i=0;i<22;i++){if(!alive.length)break;const a=this.pick(alive);if(a.returns?.length||this.s.listings.filter(l=>l.seller===a.id).length>=2)continue;const options=Object.keys(a.inv).filter(id=>a.inv[id]>(['food','water'].includes(ITEMS[id].kind)?2:1)||['tool','gear','weapon'].includes(ITEMS[id].kind));if(!options.length)continue;const id=this.pick(options);if(!this.remove(a,id))continue;const demand=ITEMS[id].kind==='water'&&this.s.weather.type==='heat'?1.5:1;this.s.listings.push({id:++this.s.serial,seller:a.id,item:id,q:1,price:Math.max(1,Math.round(ITEMS[id].price*demand*(.8+this.random()*.7))),expires:this.s.minute+1440});}
 }
 autoNpcTrade(){for(let i=0;i<6;i++){if(!this.s.listings.length)break;const l=this.pick(this.s.listings),seller=this.s.actors.find(a=>a.id===l.seller);const buyers=this.s.actors.slice(1).filter(a=>a.alive&&a.id!==l.seller&&a.credits>=l.price&&((ITEMS[l.item].kind==='food'&&a.food<60)||(ITEMS[l.item].kind==='water'&&a.water<60)||(ITEMS[l.item].kind==='fuel'&&ITEMS[l.item].energy===this.spec(a).energy&&a.energy<this.spec(a).energyPer100Km)||(['tool','gear','weapon'].includes(ITEMS[l.item].kind)&&!a.inv[l.item])));if(!buyers.length)continue;const buyer=this.pick(buyers);if(this.add(buyer,l.item,l.q)){buyer.credits-=l.price;seller.credits+=l.price;this.s.listings=this.s.listings.filter(x=>x.id!==l.id);this.bond(buyer,seller.id,2,2);if(seller.id==='P')this.log(buyer.name+' 購買你的 '+ITEMS[l.item].name+'，收入 '+l.price+' 券。','trade');}}
 }
 buy(id){const l=this.s.listings.find(l=>l.id===id),p=this.player;if(!l)return {ok:false,text:'商品已售出。'};if(l.seller==='P')return {ok:false,text:'不能購買自己的掛單。'};const seller=this.s.actors.find(a=>a.id===l.seller);if(!seller?.alive)return {ok:false,text:'賣家已失去生命訊號。'};if(p.credits<l.price)return {ok:false,text:'生存券不足。'};if(!this.add(p,l.item,l.q))return {ok:false,text:'背包已滿，請先整理。'};p.credits-=l.price;seller.credits+=l.price;this.s.listings=this.s.listings.filter(x=>x.id!==id);this.bond(seller,'P',2,2);this.log('向 '+seller.name+' 購入 '+ITEMS[l.item].name,'trade');return {ok:true};}
 privateOffers(id){const a=this.s.actors.find(a=>a.id===id);if(!a?.alive||a.id==='P'||this.relation(a,'P').like<-30)return [];return Object.entries(a.inv).filter(([k,q])=>q>(['food','water'].includes(ITEMS[k].kind)?2:1)).map(([item,q])=>({seller:id,item,q:1,price:Math.max(1,Math.ceil(ITEMS[item].price*(this.relation(a,'P').like>20?1:1.2)))})).slice(0,8);}
 buyPrivate(id,item){const offer=this.privateOffers(id).find(o=>o.item===item),a=this.s.actors.find(a=>a.id===id),p=this.player;if(!offer)return {ok:false,text:'對方已無願意出售的餘裕物資。'};if(p.credits<offer.price)return {ok:false,text:'生存券不足。'};if(!this.add(p,item))return {ok:false,text:'背包空間不足。'};this.remove(a,item);p.credits-=offer.price;a.credits+=offer.price;this.bond(a,'P',2,2);this.log('向 '+a.name+' 私下購入 '+ITEMS[item].name,'trade');return {ok:true};}
 sell(id,price){const p=this.player;if(p.returns?.length)return {ok:false,text:'先處理到期掛單的退回物品。'};if(this.s.listings.filter(l=>l.seller==='P').length>=5)return {ok:false,text:'最多五張掛單。'};if(!this.remove(p,id))return {ok:false,text:'物品不足。'};this.s.listings.push({id:++this.s.serial,seller:'P',item:id,q:1,price:clamp(Math.round(price),1,999),expires:this.s.minute+1440});return {ok:true,text:'已託管上架，時間推進後 NPC 才會購買。'};}
 claimReturns(){const p=this.player;p.returns=(p.returns||[]).filter(x=>!this.add(p,x.id,x.q));return {ok:true,text:p.returns.length?'背包仍有物品放不下，請先整理。':'已領回全部退回物品。'};}
 cancelListing(id){const l=this.s.listings.find(l=>l.id===id);if(!l||l.seller!=='P')return {ok:false,text:'無法取消。'};if(!this.add(this.player,l.item,l.q))return {ok:false,text:'先騰出背包空間。'};this.s.listings=this.s.listings.filter(x=>x.id!==id);return {ok:true};}
 useItem(a,id){const it=ITEMS[id];if(!it||!a.inv[id])return {ok:false,text:'物品不存在。'};if(it.kind==='food'){if(a.food>=100)return {ok:false,text:'已吃飽。'};a.food=clamp(a.food+it.food);}else if(it.kind==='water'){if(a.water>=100)return {ok:false,text:'目前不缺水。'};a.water=clamp(a.water+it.water);}else if(it.kind==='fuel'){const v=this.spec(a);if(it.energy!==v.energy)return {ok:false,text:'能源類型不相容。'};if(a.energy>=v.tankOrBatteryCapacity-.01)return {ok:false,text:'能源已滿。'};a.energy=Math.min(v.tankOrBatteryCapacity,a.energy+it.amount);}else if(it.kind==='med'){a.hp=clamp(a.hp+(it.heal||0));if(it.effect==='bleed')a.bleed=0;if(it.effect==='sanity')a.san=clamp(a.san+20);if(it.effect==='stamina')a.stamina=clamp(a.stamina+25);}else return {ok:false,text:'攜帶即生效，不需消耗。'};this.remove(a,id);return {ok:true};}
 playerUse(id){const r=this.useItem(this.player,id);if(r.ok)this.log('使用 '+ITEMS[id].name);return r;}
 craft(id){const r=D.recipes.find(x=>x.id===id);if(!r)return {ok:false,text:'未知配方。'};const p=this.player;let cost=clone(r.cost);if(this.s.system?.id===8){for(const k of Object.keys(cost))cost[k]=Math.max(1,Math.ceil(cost[k]*.8));}
  if(Object.entries(cost).some(([k,v])=>(p.mats[k]||0)<v))return {ok:false,text:'工程材料不足。'};if(this.s.work)return {ok:false,text:'已有工作尚未完成。'};if((p.mods[r.effect]||0)>=({slots:12,armor:120,heat:60,cold:60,rain:60,acid:60,dust:60,solar:2,bed:1,stealth:2}[r.effect]??Infinity))return {ok:false,text:'該設備已達原型上限。'};
  if(r.effect==='item'){const test=clone(p);if(!this.add(test,r.value))return {ok:false,text:'成品放不下，先整理背包。'};}
  for(const [k,v]of Object.entries(cost))p.mats[k]-=v;return this.work('recipe','製作 '+r.name,r.minutes,{recipe:id});
 }
 upgrade(){const p=this.player,v=this.spec();if(p.tier>=5)return {ok:false,text:'已達車系終階。'};if(this.day<[1,4,10,18][p.tier-1])return {ok:false,text:'尚未解鎖此階，需第 '+[1,4,10,18][p.tier-1]+' 天。'};if(this.s.work)return {ok:false,text:'請先完成目前工作。'};if(p.condition<50)return {ok:false,text:'車況需至少 50，請先修車。'};
  const translate={'金屬':'metal','零件':'parts','橡膠':'rubber','電路':'circuit','晉階核心':'core'};const cost={};for(const [k,key]of Object.entries(translate))cost[key]=v.upgradeCost[k]||0;if(Object.entries(cost).some(([k,n])=>(p.mats[k]||0)<n))return {ok:false,text:'晉階材料不足。工程帳本可查看所需數量。'};for(const [k,n]of Object.entries(cost))p.mats[k]-=n;return this.work('upgrade','載具晉階',v.upgradeCost['工時分鐘']);
 }
 encounterNpc(){const peers=this.s.actors.slice(1).filter(a=>a.alive);if(!peers.length)return null;const a=this.pick(peers);this.s.prompt={kind:'npc',npc:a.id};return a;}
 help(id,item='water0'){const a=this.s.actors.find(a=>a.id===id);if(!a?.alive)return {ok:false,text:'對方已失去生命訊號。'};if(!this.player.inv[item])return {ok:false,text:'沒有可送出的物品。'};if(!this.add(a,item))return {ok:false,text:'對方背包已滿。'};this.remove(this.player,item);this.bond(a,'P',12,10);this.relation(a,'P').debt++;this.say(a,'thanks');this.log('援助 '+a.name+'：'+ITEMS[item].name,'social');return {ok:true};}
 ask(id){const a=this.s.actors.find(a=>a.id===id);if(!a?.alive)return {ok:false,text:'無法聯絡對方。'};if((a.lastAsk||-99999)+120>this.s.minute)return {ok:false,text:'對方剛回覆過，請稍後再問。'};a.lastAsk=this.s.minute;const r=this.relation(a,'P');if((a.personality==='互助'||r.like>12)&&this.roll(.65)){const item=Object.keys(a.inv).find(id=>['food','water','fuel'].includes(ITEMS[id].kind)&&a.inv[id]>1);if(item&&this.add(this.player,item)){this.remove(a,item);this.bond(a,'P',-2,0);this.log(a.name+' 支援你 '+ITEMS[item].name,'social');return {ok:true,text:'對方送來 '+ITEMS[item].name};}}this.say(a,'refuse');return {ok:true,text:'對方目前無法提供物資。'};}
 raid(id){const a=this.s.actors.find(a=>a.id===id),p=this.player;if(!a?.alive)return {ok:false,text:'對方已不在。'};if(this.s.prompt?.kind!=='npc'||this.s.prompt.npc!==id)return {ok:false,text:'只有道路交會時才能掠奪。'};this.s.prompt=null;const power=this.attackPower()+p.armor*.08;const enemy=8+a.skill*2+a.armor*.06;this.bond(a,'P',-70,-60);p.kills++;if(this.roll(clamp(.5+(power-enemy)/90,.12,.9))){const ids=Object.keys(a.inv);const loot=[];for(let i=0;i<3&&ids.length;i++){const item=ids.splice(Math.floor(this.random()*ids.length),1)[0];if(this.add(p,item)){this.remove(a,item);loot.push(ITEMS[item].name);}}const credits=Math.floor(a.credits*.35);a.credits-=credits;p.credits+=credits;a.hp-=20+this.random()*35;p.san-=8;this.log('掠奪成功：'+loot.join('、')+'，生存券 +'+credits+'。對方已記仇。','warning');if(a.hp<=0)this.kill(a,'在交會中受襲');}else{p.hp-=22+this.random()*18;p.condition-=8;p.san-=12;this.log('掠奪遭反擊，失去健康與車況。','warning');}for(const b of this.s.actors.slice(1).filter(b=>b.alive&&b.group===a.group))this.bond(b,'P',-12,-10);if(p.hp<=0)this.kill(p,'掠奪遭反擊');return {ok:true};}
 attackPower(){return 8+this.player.skill+Math.max(0,...Object.keys(this.player.inv).filter(id=>ITEMS[id].kind==='weapon').map(id=>ITEMS[id].attack));}
 fight(){const pr=this.s.prompt;if(pr?.kind!=='combat')return;const weapon=Object.keys(this.player.inv).find(id=>ITEMS[id].kind==='weapon'&&ITEMS[id].attack>=22);let power=this.attackPower();if(weapon){const ammo=Object.keys(this.player.inv).find(id=>ITEMS[id].kind==='ammo');if(ammo)this.remove(this.player,ammo);else power*=.55;}
  pr.hp-=power*(.85+this.random()*.3);this.combatDamage(pr.attack);const saved=this.s.prompt;this.s.prompt=null;this.advance(2);if(this.s.status!=='playing')return;if(pr.hp<=0){this.log('擊退 '+pr.enemy+'，獲得材料與少量補給。','loot');this.player.mats.metal+=3;this.add(this.player,'food0');this.s.prompt=null;}else this.s.prompt=saved;
 }
 combatDamage(amount){const p=this.player;const absorb=Math.min(p.armor,amount*.75);p.armor-=absorb;p.hp-=amount-absorb;p.san-=2;if(p.hp<=0)this.kill(p,'夜間怪物襲擊');}
 escape(){const pr=this.s.prompt;if(pr?.kind!=='combat')return;const p=this.player,v=this.spec();if(v.energy!=='人力'&&p.energy<=0){this.log('沒有能源，無法加速逃離。','warning');this.combatDamage(pr.attack);return;}if(this.roll(.5+this.speed()/200)){this.s.prompt=null;this.log('沿正向道路甩開追擊。');this.advance(10,{moving:true});}else{this.combatDamage(pr.attack);this.log('未能甩開追擊，受到一次攻擊。','warning');}}
 hide(){const pr=this.s.prompt;if(pr?.kind!=='combat')return;if(this.roll(.55+(this.player.mods.stealth||0)*.1)){this.s.prompt=null;this.log('保持安靜，怪物離開了。');this.advance(20);}else{this.combatDamage(pr.attack*.8);this.log('被發現了，必須重新應對。','warning');}}
 weatherFor(day){const pool=day<=3?WEATHER.slice(0,3):day%7===0?WEATHER.slice(5):WEATHER.slice(0,7);return pool[hash(this.s.seed+'weather'+day)%pool.length];}
 endDay(){const completedDay=Math.round(this.s.minute/1440),oldQuota=completedDay<=3?60:completedDay<=7?90:completedDay<=14?120:completedDay<=21?150:180;
  for(const a of this.s.actors){if(!a.alive)continue;if(a.daily+1e-5<oldQuota)this.kill(a,'未完成每日 '+oldQuota+' 公里要求');else{a.credits+=10;if(completedDay%3===0)a.mats.core++;if(a.id==='P'){this.systemXp(10);this.log('第 '+completedDay+' 天存活，完成 '+Math.floor(a.daily)+' 公里。生存券 +10。','system');}a.daily=0;}}
  if(this.s.status!=='playing')return;
  if(completedDay>=30){this.s.status='won';this.s.running=false;this.s.prompt=null;this.s.work=null;this.log('第 30 天結算完成。你活下來了。','rare');return;}
  this.s.weather=clone(this.weatherFor(completedDay+1));this.s.forecast=clone(this.weatherFor(completedDay+2));this.s.dayStats={};if(this.s.system){this.s.system.used=0;this.s.system.signed=false;this.s.system.points=Math.min(7,this.s.system.points+1);}for(const a of this.s.actors)if(a.alive){a.mats.metal=(a.mats.metal||0)+2;a.mats.parts=(a.mats.parts||0)+1;}
  this.s.running=false;this.s.prompt={kind:'day',completed:completedDay};this.log('新的一天：'+this.s.weather.name+'。今日要求 '+this.quota+' 公里。','system');
 }
 mission(){const pr=this.s.prompt;if(pr?.kind!=='road')return {ok:false,text:'此處沒有任務。'};if((this.player.mats.metal||0)<6)return {ok:false,text:'合作任務需要金屬 6。'};const peers=this.s.actors.slice(1).filter(a=>a.alive).sort((a,b)=>this.relation(b,'P').trust-this.relation(a,'P').trust).slice(0,3);this.player.mats.metal-=6;this.s.prompt=null;return this.work('mission','共同修復便道',120,{peers:peers.map(a=>a.id)});}
 finishMission(w){const p=this.player;let betrayal=false;for(const id of w.peers){const a=this.s.actors.find(a=>a.id===id);if(!a?.alive)continue;const r=this.relation(a,'P');if(!p.mods.contract&&a.greed>65&&r.trust<25&&this.roll(.3)){betrayal=true;this.bond(a,'P',-10,-10);this.log(a.name+' 中途拿走一部分未託管材料後離開。','warning');}else{this.bond(a,'P',8,8);a.credits+=8;this.say(a,'thanks');}}
  p.credits+=betrayal?12:25;p.mats.core++;p.mats.parts=(p.mats.parts||0)+(betrayal?2:5);this.log('任務完成。中央託管報酬已發放，晉階核心 +1。','rare');}
 systemAction(target){const sy=this.s.system,p=this.player;if(!sy)return {ok:false,text:'本局沒有覺醒特殊系統。'};const L=this.level(),id=sy.id;if(this.s.work)return {ok:false,text:'先完成目前工作。'};
  if([4,8,10,11,15,17].includes(id))return {ok:true,text:'此能力被動生效。'+this.systemDescription()};
  if(sy.used>=[1,3,1,2,0,1,1,2,0,2,0,0,1,2,1,0,1][id]+L-1)return {ok:false,text:'今日能力次數已用完。'};
  const complete=text=>{sy.used++;this.systemXp();this.log(text,'rare');return {ok:true,text};};
  if(id===0){if(sy.signed)return {ok:false,text:'今天已簽到。'};if(!this.add(p,'food0',L)||!this.add(p,'water0',L))return {ok:false,text:'需要背包空間才能簽到。'};sy.signed=true;return complete('簽到補給：口糧與淨水各 '+L+' 份。');}
  if(id===1)return complete('提示：今日天氣 '+this.s.weather.name+'；前方 '+this.s.route[0].name+' 可取得 '+this.s.route[0].desc+'。弱車先補食水再動力化。');
  if(id===2)return complete('情報：明日 '+this.weatherFor(this.day+1).name+'，第 '+(7*Math.ceil((this.day+1)/7))+' 天將有區域天災。');
  if(id===3){this.s.radar=true;return complete('雷達鎖定前方三個地點：'+this.s.route.slice(0,3).map(n=>n.name+' '+Math.ceil(n.km-p.km)+'km').join('、'));}
  if(id===5){const item=target||Object.keys(p.inv).find(k=>['food','water','fuel','med'].includes(ITEMS[k].kind));if(!item||!p.inv[item]||!['food','water','fuel','med'].includes(ITEMS[item].kind))return {ok:false,text:'需要一件普通耗材作為原本。'};if((this.s.dayStats.copied||[]).includes(item))return {ok:false,text:'此類物資今日已複製。'};if(!this.add(p,item,L))return {ok:false,text:'背包空間不足。'};(this.s.dayStats.copied??=[]).push(item);return complete('複製完成：'+ITEMS[item].name+' ×'+L);}
  if(id===6){if((p.mats.metal||0)<6)return {ok:false,text:'合成需要金屬 6。'};p.mats.metal-=6;p.mats.alloy=(p.mats.alloy||0)+2*L;return complete('金屬合成為合金 '+2*L+'。');}
  if(id===7){const item=target||Object.keys(p.inv).find(k=>['tool','weapon','gear'].includes(ITEMS[k].kind));if(!item||!p.inv[item]||!['tool','weapon','gear'].includes(ITEMS[item].kind))return {ok:false,text:'需要可回收的工具、武器或防具。'};this.remove(p,item);p.mats.parts=(p.mats.parts||0)+L*2;p.mats.metal+=3;return complete('精密回收完成，取得金屬與零件。');}
  if(id===9){if(sy.points<1)return {ok:false,text:'沒有詞條點。'};if(p.mods.efficient)return {ok:false,text:'目前原型已啟用省能詞條。'};sy.points--;p.mods.efficient=1;return complete('載具獲得「省能」詞條，行車成本 −8%。');}
  if(id===12){const kinds={};for(const l of this.s.listings)kinds[ITEMS[l.item].kind]=(kinds[ITEMS[l.item].kind]||0)+1;return complete('市場洞察：目前掛單 '+this.s.listings.length+' 筆；'+Object.entries(kinds).map(([k,n])=>k+' '+n).join('、')+'。高溫時飲水較搶手。');}
  if(id===13){p.mods.contract=1;return complete('契約見證啟用。下一次共同任務採完整託管，避免未託管材料被搶。');}
  if(id===14){if(!(p.mats.cloth>=1))return {ok:false,text:'急救需要布料 1。'};p.mats.cloth--;p.hp=clamp(p.hp+15*L);p.bleed=0;return complete('急救完成，回復健康並止血。');}
  if(id===16)return complete('推演：以目前車速，剩餘里程約需 '+Math.ceil(Math.max(0,this.quota-p.daily)/this.speed()*60)+' 遊戲分鐘；距截止還有 '+Math.ceil(1440-this.s.minute%1440)+' 分鐘。隨機事件與 NPC 決策不在保證範圍。');
  return {ok:false,text:'此能力尚無可用目標。'};
 }
 finishSystem(){}
 systemDescription(){const L=this.level();return this.s.system?['每日額外食水補給','鑑識眼前風險與補給方向','預覽下一天的天氣','揭露前方三處資源點','每日有限次開箱增量','每日限額複製普通耗材','金屬轉為合金','回收工具換取工程材料','製作普通材料需求降低 20%','為綁定載具加入省能詞條','行車耗能降低 '+(L*5+5)+'%','增加 '+[6,12,20][L-1]+' 格私人空間','分析真實公開市場供給','共同任務託管見證','耗用布料急救止血','環境防護額外 +'+(L*5+5),'試算剩餘路程與時間','每 30 公里有限次取得補給'][this.s.system.id]:'';}
 serialize(){return JSON.stringify(this.s);}
 static restore(text){const s=JSON.parse(text);if(s.version!==1||!Array.isArray(s.actors)||s.actors.length!==100)throw Error('不相容的存檔');if(!Number.isFinite(s.minute)||s.minute<0||s.minute>43200)throw Error('存檔時間無效');for(const a of s.actors){if(!D.vehicles.families.find(f=>f.id===a.family)||a.tier<1||a.tier>5)throw Error('載具資料無效');}s.running=false;return new Game(s);}
}
const create=Game.create;Game.create=function(seed,opts){const g=create.call(Game,seed,opts);g.s.ground=[];return g;};
const API={Game,ITEMS,WEATHER,clamp};root.RoadGame=API;if(typeof module!=='undefined')module.exports=API;
})(globalThis);
