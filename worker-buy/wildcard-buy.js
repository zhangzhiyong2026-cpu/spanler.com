
// Cloudflare Worker for *.buy.spanler.com
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const host = url.hostname; // e.g. 2135551234.buy.spanler.com
    const match = host.match(/^([^.]+)\.buy\.spanler\.com$/);
    if(match){
      const number = match[1];
      if(number !== 'buy' && number !== 'www'){
        // 查D1
        const row = await env.DB.prepare('SELECT * FROM phone_numbers WHERE number = ?').bind(number).first();
        if(row){
          // 返回落地页HTML，实际可返回 Pages 的 /buy/number/xxx.html
          return Response.redirect(`https://buy.spanler.com/number/${number}.html`, 302);
        }
      }
    }
    // 否则走正常 Pages
    return fetch(request);
  }
}
