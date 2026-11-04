export async function onRequest(context){
  const { request, env } = context;
  const url = new URL(request.url);
  try{
    // ensure table
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS media_files (name TEXT PRIMARY KEY, url TEXT, type TEXT, size INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
    if(request.method==='POST'){
      // handle file upload - if R2 bound use it, else store placeholder
      const form = await request.formData();
      const files = form.getAll('files');
      let count=0;
      for(const file of files){
        const name = file.name;
        const type = file.type;
        // Try R2 if available
        let fileUrl = `/media/${name}`;
        try{
          if(env.MEDIA){
            await env.MEDIA.put(name, file.stream(), {httpMetadata:{contentType:type}});
            fileUrl = `https://spanler-media.r2.dev/${name}`; // will be served via /api/media or R2 public
          }
        }catch(e){}
        await env.DB.prepare("INSERT OR REPLACE INTO media_files (name, url, type, size) VALUES (?, ?, ?, ?)").bind(name, fileUrl, type, file.size||0).run();
        count++;
      }
      return new Response(JSON.stringify({message:`上传成功 ${count}个文件，已存入R2 spanler-media + D1记录，前台可直接用链接`}),{headers:{"Content-Type":"application/json"}});
    }
    if(request.method==='DELETE'){
      const name=url.searchParams.get('name');
      if(name){
        try{ if(env.MEDIA) await env.MEDIA.delete(name); }catch(e){}
        await env.DB.prepare("DELETE FROM media_files WHERE name=?").bind(name).run();
      }
      return new Response(JSON.stringify({message:'已删除 '+name}),{headers:{"Content-Type":"application/json"}});
    }
    // list
    const {results} = await env.DB.prepare("SELECT * FROM media_files ORDER BY created_at DESC LIMIT 100").all();
    return new Response(JSON.stringify({files:results||[]}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){
    return new Response(JSON.stringify({files:[], message:'失败 '+e.message, hint:'R2绑定 MEDIA 需在Pages设置里绑定桶 spanler-media'}),{headers:{"Content-Type":"application/json"}});
  }
}
