const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'dist');
http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end();}
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(file===root||file.endsWith(path.sep))file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json; charset=utf-8'})[path.extname(file).slice(1)]||'application/octet-stream');res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
