// Compare the same finite-resource policy against the pre-balance engine.
// The baseline commit is explicit so future runs remain reproducible.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {Game}=require('./dist/engine.js'),{simulate}=require('./simulate.cjs');
const baseline=new Module(path.resolve('dist/baseline-engine.cjs'),module);
baseline.filename=path.resolve('dist/baseline-engine.cjs');
baseline.paths=module.paths;
// Prepare with: git show d732fa8:dist/engine.js > balance-baseline.txt
baseline._compile(fs.readFileSync('balance-baseline.txt','utf8'),baseline.filename);
const families=['F01','F02','F09','F24','F36','F52'];
function audit(GameClass){const runs=[];for(const family of families)for(let i=0;i<2;i++)runs.push(simulate('balance-'+i,family,{GameClass}));const mean=key=>runs.reduce((n,r)=>n+r.metrics[key]/r.metrics.days,0)/runs.length;return {summary:{stopsPerDay:mean('stops'),lootLinesPerDay:mean('lootLines'),meanDeathDay:runs.reduce((n,r)=>n+r.day,0)/runs.length},runs};}
const result={baseline:audit(baseline.exports.Game),rebalanced:audit(Game)};
fs.writeFileSync('balance-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({before:result.baseline.summary,after:result.rebalanced.summary,afterRuns:result.rebalanced.runs.map(r=>({family:r.family,day:r.day,status:r.status,reason:r.reason}))},null,2));
if(Object.values(result).some(x=>x.runs.some(r=>r.status==='playing'||r.ticks>=40000||r.decisions>=10000)))process.exitCode=1;
