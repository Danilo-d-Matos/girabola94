const http=require("http"),fs=require("fs"),path=require("path");
const root=__dirname,types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".json":"application/json",".glb":"model/gltf-binary",".webp":"image/webp"};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";const f=path.join(root,p);
 if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end("404");return}
 r.writeHead(200,{"Content-Type":types[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(f).pipe(r)}).listen(5173,()=>console.log("http://localhost:5173"));
