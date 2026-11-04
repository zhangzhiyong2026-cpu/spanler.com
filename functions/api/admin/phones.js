export async function onRequest(context){
  const { request, env } = context;
  const url = new URL(request.url);
  try{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS phone_numbers (number TEXT PRIMARY KEY, price INTEGER, monthly_fee INTEGER, description TEXT, subdomain TEXT, image TEXT, status TEXT DEFAULT 'available', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
    if(request.method==='POST'){
      const body = await request.json();
      const number = (body.number||'').replace(/\D/g,'');
      if(!number) return new Response(JSON.stringify({message:'号码必填'}),{status:400,headers:{"Content-Type":"application/json"}});
      const price = body.price||0;
      const monthly = body.monthly_fee||500;
      const desc = body.description||'';
      const image = body.image||'';
      const subdomain = `${number}.buy.spanler.com`;
      await env.DB.prepare("INSERT OR REPLACE INTO phone_numbers (number, price, monthly_fee, description, subdomain, image, status) VALUES (?, ?, ?, ?, ?, ?, 'available')").bind(number, price, monthly, desc, subdomain, image).run();
      return new Response(JSON.stringify({message:'添加成功 '+number+'，前台右侧卡片自动更新'}),{headers:{"Content-Type":"application/json"}});
    }
    if(request.method==='DELETE'){
      const number = url.searchParams.get('number');
      await env.DB.prepare("DELETE FROM phone_numbers WHERE number=?").bind(number).run();
      return new Response(JSON.stringify({message:'已删除 '+number}),{headers:{"Content-Type":"application/json"}});
    }
    return new Response(JSON.stringify({message:'method not allowed'}),{status:405});
  }catch(e){ return new Response(JSON.stringify({message:'失败 '+e.message}),{status:500,headers:{"Content-Type":"application/json"}}); }
}
