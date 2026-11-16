import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent if (ROOT.parent/'vehicle_catalog.json').exists() else ROOT/'source-data'
vehicles=json.loads((BASE/'vehicle_catalog.json').read_text(encoding='utf-8'))
identity=json.loads((BASE/'npc_identity_catalog.json').read_text(encoding='utf-8'))
items=[]
def add(id,name,kind,price,stack=5,**extra):
    items.append(dict(id=id,name=name,kind=kind,price=price,stack=stack,**extra))
foods=[('乾糧',32),('牛肉罐頭',42),('蘇打餅乾',22),('能量棒',28),('即食米飯',38),('蔬菜罐頭',25),('花生醬',45),('燕麥包',30),('午餐肉',40),('綜合堅果',35),('肉乾',30),('泡麵',28),('巧克力',24),('壓縮餅乾',48),('水果罐頭',24),('營養餐包',55),('奶油麵包',28),('鹽漬魚肉',32),('馬鈴薯泥包',35),('野戰口糧',65)]
for i,(n,v) in enumerate(foods):add(f'food{i}',n,'food',4+i%5,food=v)
waters=[('淨水 500mL',40),('運動飲料',35),('礦泉水 1L',65),('茶飲',28),('濾淨水袋',45),('電解質水',50),('果汁',30),('氣泡水',35)]
for i,(n,v) in enumerate(waters):add(f'water{i}',n,'water',4+i%4,water=v)
for id,n,en,q,p in [('gas','汽油 1L','汽油',1,3),('diesel','柴油 1L','柴油',1,3),('battery','便攜電池 1kWh','電力',1,3),('gascan','汽油桶 5L','汽油',5,14),('dieselcan','柴油桶 5L','柴油',5,14),('powerpack','行動電源 5kWh','電力',5,14)]:add(id,n,'fuel',p,5,energy=en,amount=q)
for i,(n,p,h,effect) in enumerate([('繃帶',5,8,'bleed'),('急救包',15,30,'bleed'),('消毒液',6,5,'infection'),('抗感染藥',12,10,'infection'),('止痛藥',7,12,'pain'),('鎮靜茶',7,0,'sanity'),('營養補劑',8,15,'health'),('醫療箱',24,50,'bleed'),('提神飲',9,0,'stamina'),('安眠調理包',8,0,'sleep')]):add(f'med{i}',n,'med',p,5,heal=h,effect=effect)
tools=['撬棍','工具箱','多用途刀','鐵鎚','扳手','工兵鏟','手搖手電筒','望遠鏡','指南針','便攜千斤頂','鋼索','防水膠帶','濾水壺','應急雨布','點火器','折疊鍋','登山繩','探測儀']
for i,n in enumerate(tools):add(f'tool{i}',n,'tool',8+i,1,search=3+i%5)
for i,(n,p,attack) in enumerate([('木棍',5,5),('鐵棍',9,9),('匕首',12,12),('消防斧',18,17),('長矛',16,14),('弩',28,22),('手槍',40,30),('獵槍',55,42),('步槍',75,50),('戰術盾',35,8)]):add(f'weapon{i}',n,'weapon',p,1,attack=attack)
for i,n in enumerate(['手槍彈盒','步槍彈盒','弩箭束','霰彈盒']):add(f'ammo{i}',n,'ammo',8+i*2,5)
for i,(n,weather,protection) in enumerate([('雨衣','雨',25),('冬衣','冷',30),('隔熱服','熱',25),('濾塵面罩','塵',30),('抗酸披風','酸',30),('保暖毯','冷',20),('遮陽帽','熱',15),('防水靴','雨',15),('護目鏡','塵',15),('防刺背心','all',8),('密封防護衣','all',18),('求生外套','all',10)]):add(f'gear{i}',n,'gear',10+i*3,1,weather=weather,protection=protection)
MATS={'metal':'金屬','parts':'零件','rubber':'橡膠','circuit':'電路','cloth':'布料','wood':'木材','plastic':'塑膠','glass':'玻璃','chemical':'化學原料','core':'晉階核心','chip':'控制晶片','alloy':'合金','fiber':'纖維','carbon':'木炭','herb':'藥草','wire':'銅線','ceramic':'陶瓷','crystal':'能量結晶'}
for k,n in MATS.items():add('mat_'+k,n,'material',{'core':35,'crystal':12,'chip':7}.get(k,2),99,material=k)
buildings=[['加油站','fuel','燃料與便利店補給'],['便利商店','food','密封食品與飲料'],['維修廠','parts','零件、金屬與工具'],['診所','med','藥品與急救用品'],['廢棄民宅','mixed','生活物資與防護裝備'],['充電站','fuel','電池與電路'],['公路旅館','rest','床位與安全休息'],['貨運倉庫','materials','大量材料與貨箱'],['露營用品店','gear','野外防護裝備'],['通訊塔','signal','情報與電子零件'],['農舍','food','食物、水與布料'],['軍用哨站','weapon','武器與高風險補給'],['廢車場','materials','可拆解的非綁定零件'],['五金行','tool','工具與維修用品'],['淨水站','water','飲水與濾材'],['觀景休息區','rest','休息與路線情報'],['氣象站','signal','下一階段天候預警'],['廢棄超市','mixed','較多但不確定的補給']]
events=[['封閉貨櫃','貨櫃鎖已鏽蝕，裡面可能還有補給。','cargo'],['路旁求救訊號','無線電有人求援，共享停靠點即將開放。','npc'],['倒塌路牌','路牌下壓著一個防水箱。','debris'],['廢棄補給箱','路肩有尚未打開的補給箱。','box'],['積水路段','前方道路被積水遮住，強行通過可能傷車。','flood'],['遺落背包','護欄旁有一個沾滿灰塵的背包。','bag'],['破損配送車','無主車輛不能認領，但可以拆取零件。','wreck'],['公路交會','道路短暫交會，另一位求生者正在停車。','npc'],['倒伏樹木','前方樹幹擋路，可以花時間清理或慢速繞行。','tree'],['異常廣播','廣播重複播放明天的環境數據。','radio'],['路面散落物','散落的金屬反射著微光。','scrap'],['橋頭集結點','求生者徵求一起修復便道，報酬由中央託管。','mission']]
recipes=[
 ('patch','補胎',{'rubber':2,'parts':1},30,'tire',35),('repair','修理車況',{'metal':4,'parts':2},45,'repair',25),
 ('coat','隔熱塗層',{'plastic':5,'cloth':3},60,'heat',20),('insulate','保溫層',{'cloth':5,'fiber':2},60,'cold',25),
 ('rain','防雨篷',{'plastic':5,'cloth':2},45,'rain',25),('acid','耐酸塗層',{'chemical':4,'plastic':4},60,'acid',25),
 ('filter','空氣濾芯',{'cloth':3,'carbon':3},45,'dust',25),('armor','附加裝甲',{'metal':12,'alloy':2},90,'armor',40),
 ('rack','外掛行李架',{'metal':5,'wood':4},60,'slots',4),('solar','太陽能板',{'circuit':5,'glass':4,'wire':3},90,'solar',1),
 ('bed','折疊床鋪',{'cloth':6,'wood':4},60,'bed',1),('silent','消音隔層',{'rubber':4,'cloth':4},60,'stealth',1),
 ('food','製作口糧',{'herb':2,'chemical':1},30,'item','food0'),('bandage','製作繃帶',{'cloth':2,'herb':1},20,'item','med0'),
 ('water','淨水濾袋',{'carbon':2,'plastic':2},30,'item','water0'),('battery','製作便攜電池',{'circuit':2,'chemical':2,'wire':1},40,'item','battery'),
 ('knife','打造匕首',{'metal':4,'wood':1},45,'item','weapon2'),('raincoat','縫製雨衣',{'plastic':3,'cloth':2},40,'item','gear0'),
 ('coat2','縫製冬衣',{'cloth':5,'fiber':2},45,'item','gear1'),('gas','提煉汽油',{'chemical':3,'carbon':1},45,'item','gas'),
 ('diesel','提煉柴油',{'chemical':3,'carbon':1},45,'item','diesel'),('ammo','組裝彈藥',{'metal':3,'chemical':2},30,'item','ammo0'),
 ('advanced','精煉合金',{'metal':8,'carbon':2},60,'mat','alloy'),('circuit','組裝電路',{'wire':3,'ceramic':2},45,'mat','circuit')]
systems=['生存簽到','萬物提示','每日情報','尋寶雷達','開箱暴擊','物資複製','萬物合成','精密回收','完美工匠','詞條賦予','能源循環','折疊倉庫','商路洞察','契約見證','急救診療','環境適應','決策推演','里程補給']
data={'vehicles':vehicles,'identity':identity,'items':items,'materials':MATS,'buildings':buildings,'events':events,'recipes':[dict(id=r[0],name=r[1],cost=r[2],minutes=r[3],effect=r[4],value=r[5]) for r in recipes],'systems':systems}
out=ROOT/'dist';out.mkdir(exist_ok=True)
(out/'data.js').write_text('globalThis.GameData='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\nif(typeof module!=="undefined")module.exports=globalThis.GameData;\n',encoding='utf-8')
assert len(items)>=100 and len(vehicles['vehicles'])==260
print(f'Built {len(items)} items, {len(recipes)} recipes, {len(buildings)} buildings, {len(events)} road events, 260 vehicle forms.')
