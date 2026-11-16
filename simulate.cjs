// Integration simulation: uses public game actions and finite starting resources.
// No health, money, inventory or victory flags are granted to the policy.
const {Game,ITEMS}=require('./dist/engine.js');
function simulate(seed,family){const g=Game.create(seed,{family,test:true}),p=g.player;let ticks=0,decisions=0;const initialFamily=p.family;
 function upkeep(){for(let tries=0;tries<12;tries++){let target=null;if(p.food<65)target=Object.keys(p.inv).find(k=>ITEMS[k].kind==='food');if(!target&&p.water<65)target=Object.keys(p.inv).find(k=>ITEMS[k].kind==='water');if(!target&&p.hp<70)target=Object.keys(p.inv).find(k=>ITEMS[k].kind==='med'&&ITEMS[k].heal);if(!target&&g.spec().energy!=='人力'&&p.energy<g.spec().energyPer100Km*.8)target=Object.keys(p.inv).find(k=>ITEMS[k].kind==='fuel'&&ITEMS[k].energy===g.spec().energy);if(!target)break;g.playerUse(target);}
  if(g.used()>=g.capacity()-2||p.credits<25){for(const id of Object.keys(p.inv)){if((['tool','gear','weapon'].includes(ITEMS[id].kind)&&(p.inv[id]>1||p.credits<25))||ITEMS[id].kind==='fuel'&&ITEMS[id].energy!==g.spec().energy){g.sell(id,ITEMS[id].price);if(g.used()<g.capacity()-2)break;}}}
  const needs=[['food',p.food<55&&!Object.keys(p.inv).some(k=>ITEMS[k].kind==='food')],['water',p.water<55&&!Object.keys(p.inv).some(k=>ITEMS[k].kind==='water')],['fuel',g.spec().energy!=='人力'&&p.energy<g.spec().energyPer100Km*.5&&!Object.keys(p.inv).some(k=>ITEMS[k].kind==='fuel'&&ITEMS[k].energy===g.spec().energy)]];
  for(const [kind,need]of needs){if(!need)continue;const l=g.s.listings.filter(l=>l.seller!=='P'&&ITEMS[l.item].kind===kind&&(kind!=='fuel'||ITEMS[l.item].energy===g.spec().energy)).sort((a,b)=>a.price-b.price)[0];if(l)g.buy(l.id);else{const privateOffer=g.s.actors.slice(1).flatMap(a=>g.privateOffers(a.id)).filter(o=>ITEMS[o.item].kind===kind&&(kind!=='fuel'||ITEMS[o.item].energy===g.spec().energy)).sort((a,b)=>a.price-b.price)[0];if(privateOffer)g.buyPrivate(privateOffer.seller,privateOffer.item);}}
 }
 while(g.s.status==='playing'&&ticks<40000&&decisions<10000){ticks++;if(g.s.running){g.tick(.15);continue;}decisions++;
  if(g.s.loot){g.s.loot=null;g.s.ground=[];}
  if(g.s.prompt){const pr=g.s.prompt;if(pr.kind==='combat'){if(p.hp>60&&g.attackPower()>22)g.fight();else g.hide();continue;}if(pr.kind==='road'){if(pr.node.type==='npc'){g.encounterNpc();continue;}if(pr.node.type==='mission'&&p.mats.metal>=6){g.mission();continue;}g.search(false);continue;}if(pr.kind==='npc'){g.ask(pr.npc);g.skip();continue;}g.skip();continue;}
  upkeep();if(g.s.work){g.start();continue;}
  if(p.tire<35&&g.craft('patch').ok)continue;if(p.condition<45&&g.craft('repair').ok)continue;if(!p.mods.bed&&g.craft('bed').ok)continue;
  const weatherRecipe={heat:'coat',cold:'insulate',rain:'rain',acid:'acid',dust:'filter'}[g.s.weather.type];if(weatherRecipe&&g.spec().weatherProtection+(p.mods[g.s.weather.type]||0)<g.s.weather.s&&g.craft(weatherRecipe).ok)continue;
  if(p.tier===1&&g.spec().energy==='人力'&&Object.keys(p.inv).some(k=>ITEMS[k].kind==='fuel'&&ITEMS[k].energy==='電力')&&g.upgrade().ok)continue;
  if(p.stamina<35){g.work('rest','休息',180);continue;}
  const stock=kind=>Object.keys(p.inv).filter(k=>ITEMS[k].kind===kind).reduce((n,k)=>n+p.inv[k],0);
  if(p.daily>=g.quota){const fuelStock=Object.keys(p.inv).filter(k=>ITEMS[k].kind==='fuel'&&ITEMS[k].energy===g.spec().energy).reduce((n,k)=>n+p.inv[k]*ITEMS[k].amount,0);const needFuel=g.spec().energy!=='人力'&&p.energy+fuelStock<g.spec().energyPer100Km*(g.quota+60)/100;const gather=(stock('food')<4||stock('water')<5||needFuel)&&(g.s.minute%1440)<650&&(g.spec().energy==='人力'||p.energy>g.spec().energyPer100Km*.2);if(!gather){g.work('rest','休息',60);continue;}}
  if(g.spec().energy!=='人力'&&p.energy<=0){if(g.craft(g.spec().energy==='電力'?'battery':g.spec().energy==='柴油'?'diesel':'gas').ok)continue;g.work('rest','等待市場',60);continue;}
  g.start();
 }
 if(p.family!==initialFamily)throw Error('Binding broken');for(const a of g.s.actors){if(Object.values(a.inv).some(q=>q<0))throw Error('Negative inventory');if(g.used(a)>g.capacity(a))throw Error('Overflow');}
 return {seed,family,status:g.s.status,day:Math.min(30,g.day),km:Math.floor(p.km),alive:g.s.actors.filter(a=>a.alive).length,reason:p.reason||'',stats:{food:p.food,water:p.water,stamina:p.stamina,exposure:p.exposure,energy:p.energy,condition:p.condition,tire:p.tire},ticks,decisions};
}
module.exports={simulate};
if(require.main===module){const results=[];for(const family of ['F01','F02','F09','F24','F36','F52'])for(let i=0;i<2;i++)results.push(simulate('integration-'+i,family));
require('fs').writeFileSync('simulation-results.json',JSON.stringify(results,null,2));console.table(results);if(results.some(r=>r.ticks>=40000||r.decisions>=10000))process.exitCode=1;}
