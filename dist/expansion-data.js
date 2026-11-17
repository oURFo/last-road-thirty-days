(function(root){
'use strict';
const D=root.GameData||(typeof require==='function'?require('./data.js'):null);if(D.expansion)return;
D.expansion={version:1,weathers:[
{id:'rain',name:'暴雨',type:'rain',gear:'雨',effect:'曝露、濕滑',module:'seal'},
{id:'cold',name:'極寒',type:'cold',gear:'冷',effect:'曝露、凍傷',module:'climate'},
{id:'heat',name:'炎熱',type:'heat',gear:'熱',effect:'曝露、失水',module:'climate'},
{id:'quake',name:'地震',type:'quake',gear:'震',effect:'車況震損、落石',module:'stability'},
{id:'wind',name:'風災',type:'wind',gear:'風',effect:'曝露、風壓車損',module:'stability'},
{id:'dust',name:'沙塵暴',type:'dust',gear:'塵',effect:'曝露、進氣磨損',module:'air'},
{id:'acid',name:'酸雨',type:'acid',gear:'酸',effect:'曝露、腐蝕',module:'corrosion'},
{id:'hail',name:'冰雹',type:'hail',gear:'雹',effect:'撞擊、車損',module:'armor'},
{id:'thunder',name:'雷暴',type:'thunder',gear:'雷',effect:'電路與能源受損',module:'electric'},
{id:'snow',name:'暴雪',type:'snow',gear:'冷',effect:'曝露、凍傷、道路阻力',module:'terrain'},
{id:'ice',name:'凍雨',type:'ice',gear:'雨',effect:'曝露、輪胎損傷',module:'terrain'},
{id:'fog',name:'濃霧',type:'fog',gear:'霧',effect:'探查距離縮短、理智負擔',module:'sensor'}],
modules:[
{id:'cargo',names:['外掛貨架','分艙儲物','模組貨艙'],desc:'背包額外增加6／12／20格',values:[6,12,20],cost:{metal:5,wood:4}},
{id:'climate',names:['製冷系統','冷暖恆溫','全環境控制'],desc:'熱防護30／55／85；第2階起冷防護55／85',values:[30,55,85],cost:{circuit:4,parts:4,chemical:3}},
{id:'armor',names:['防護鋼板','防彈複合裝甲','主動防護裝甲'],desc:'額外裝甲30／60／100，抗雹30／55／85',values:[30,55,85],cost:{metal:8,alloy:3}},
{id:'seal',names:['防雨篷','密封防水艙','加壓防護艙'],desc:'雨／凍雨防護30／55／85；第3階全災害額外15',values:[30,55,85],cost:{plastic:5,cloth:4}},
{id:'air',names:['濾塵器','多重過濾','空氣循環淨化'],desc:'沙塵防護30／55／85',values:[30,55,85],cost:{cloth:4,carbon:3,parts:2}},
{id:'stability',names:['強化避震','自適應底盤','主動穩定平台'],desc:'地震與風災防護30／55／85',values:[30,55,85],cost:{rubber:4,parts:5,metal:4}},
{id:'terrain',names:['防滑輪組','全地形輪組','自適應行走裝置'],desc:'暴雪／凍雨防護30／55／85，降低災害減速',values:[30,55,85],cost:{rubber:5,parts:4}},
{id:'corrosion',names:['耐蝕塗層','複合防腐外殼','自修復抗酸外甲'],desc:'酸雨防護30／55／85',values:[30,55,85],cost:{chemical:5,plastic:4}},
{id:'electric',names:['接地保護','隔離電路','抗干擾電力管理'],desc:'雷暴防護30／55／85',values:[30,55,85],cost:{wire:4,circuit:4,rubber:3}},
{id:'energy',names:['備用能源槽','高效儲能','智慧能源管理'],desc:'儲能增加25%／50%／100%；耗能減少5%／10%／15%',values:[.25,.5,1],cost:{metal:5,circuit:4,chemical:3}},
{id:'sensor',names:['霧燈','多頻感測','融合偵察'],desc:'霧防護30／55／85，濃霧視距至少1／2／3公里',values:[30,55,85],cost:{glass:3,circuit:4,wire:3}},
{id:'bed',names:['折疊床','舒適休息艙','生存生活艙'],desc:'休息額外恢復精力／理智／健康，隨階級提高',values:[1,2,3],cost:{cloth:5,wood:4}},
{id:'medical',names:['急救工具架','醫療工作站','自動診療設備'],desc:'醫藥治療量增加20%／40%／60%',values:[.2,.4,.6],cost:{parts:4,chemical:4,cloth:3}}
],publicTypes:[
{id:'hunt',name:'怪物討伐',mode:'combat',goal:'擊殺封鎖出口的怪物',rounds:7},
{id:'defend',name:'營地防守',mode:'defend',goal:'擊退三波怪物，守住營地',rounds:10},
{id:'gather',name:'資源徵集',mode:'gather',goal:'共同交付指定工程材料',rounds:7},
{id:'find',name:'遺失物搜尋',mode:'find',goal:'搜索三處線索，找回委託物',rounds:7},
{id:'rescue',name:'人員救援',mode:'rescue',goal:'找到傷者、穩定傷勢並送往出口',rounds:8},
{id:'escort',name:'車隊護送',mode:'escort',goal:'護送補給車通過三段危險道路',rounds:8},
{id:'repair',name:'設施搶修',mode:'repair',goal:'修復三個故障節點',rounds:7},
{id:'purify',name:'污染區淨化',mode:'purify',goal:'定位、封閉污染源並帶回樣本',rounds:8},
{id:'evacuate',name:'限時撤離',mode:'evacuate',goal:'找到通行證、開啟出口並完成撤離',rounds:6},
{id:'puzzle',name:'密室解謎',mode:'puzzle',goal:'取得密碼線索並解除三道封鎖',rounds:7},
{id:'machine',name:'失控機械處理',mode:'machine',goal:'摧毀機械或拆除三個控制節點',rounds:8},
{id:'recover',name:'補給回收',mode:'recover',goal:'找出並共同搬運三箱補給',rounds:7}
]};
const extra=[
{id:'icecream',name:'冰淇淋',kind:'food',food:15,price:8,stack:5,buff:{types:['heat'],protection:30,minutes:120},shelf:360},
{id:'iceblock',name:'冰塊',kind:'supply',price:6,stack:5,buff:{types:['heat'],protection:40,minutes:180},shelf:480},
{id:'warmer',name:'暖暖包',kind:'supply',price:7,stack:5,buff:{types:['cold','snow','ice'],protection:35,minutes:180}},
{id:'anchor',name:'車身固定索',kind:'supply',price:10,stack:5,buff:{types:['wind','quake'],protection:40,minutes:180}},
{id:'goggles_fog',name:'防霧護目鏡',kind:'gear',weather:'霧',protection:30,price:22,stack:1}
];
for(const m of D.expansion.modules)extra.push({id:'module_'+m.id,name:m.names[0]+'配件',kind:'module',module:m.id,price:30,stack:1});
for(const it of extra)if(!D.items.some(x=>x.id===it.id))D.items.push(it);
for(const it of D.items)if(it.kind!=='material')it.stack=Math.min(5,it.stack||1);
if(typeof module!=='undefined')module.exports=D.expansion;
})(globalThis);
