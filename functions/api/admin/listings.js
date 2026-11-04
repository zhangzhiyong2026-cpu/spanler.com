export async function onRequest(context){
  const { request, env } = context;
  const url = new URL(request.url);
  try{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, title TEXT, category TEXT, price TEXT, description TEXT, images TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
    if(request.method==='POST'){
      const body = await request.json();
      const id = Date.now().toString();
      await env.DB.prepare("INSERT INTO listings (id, title, category, price, description, images) VALUES (?, ?, ?, ?, ?, ?)").bind(id, body.title||'', body.category||'租房', body.price||'', body.description||'', body.images||'').run();
      return new Response(JSON.stringify({message:'信息发布成功，主站首页论坛/黄页自动显示'}),{headers:{"Content-Type":"application/json"}});
    }
    if(request.method==='DELETE'){
      const id=url.searchParams.get('id');
      await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(id).run();
      return new Response(JSON.stringify({message:'已删除'}),{headers:{"Content-Type":"application/json"}});
    }
    const {results} = await env.DB.prepare("SELECT * FROM listings ORDER BY created_at DESC LIMIT 50").all();
    return new Response(JSON.stringify({listings:results||[]}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){ return new Response(JSON.stringify({message:'失败 '+e.message}),{status:500,headers:{"Content-Type":"application/json"}}); }
}
