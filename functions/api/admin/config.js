export async function onRequest(context){
  const { request, env } = context;
  try{
    if(request.method==='POST'){
      const body = await request.json();
      // create table if not exists
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_config (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
      for(const [k,v] of Object.entries(body)){
        await env.DB.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").bind(k, typeof v==='string'?v:JSON.stringify(v)).run();
      }
      return new Response(JSON.stringify({message:'网站设置已保存，前台自动读取'}),{headers:{"Content-Type":"application/json"}});
    } else {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_config (key TEXT PRIMARY KEY, value TEXT)").run();
      const {results} = await env.DB.prepare("SELECT * FROM site_config").all();
      const config={}; for(const r of results||[]) { try{config[r.key]=JSON.parse(r.value)}catch{config[r.key]=r.value} }
      return new Response(JSON.stringify({config}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
    }
  }catch(e){ return new Response(JSON.stringify({message:'失败 '+e.message}),{status:500,headers:{"Content-Type":"application/json"}}); }
}
