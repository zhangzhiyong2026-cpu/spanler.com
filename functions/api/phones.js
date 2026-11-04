export async function onRequest(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare("SELECT * FROM phone_numbers WHERE status='available' ORDER BY price DESC").all();
    return new Response(JSON.stringify(results || []), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    const mock = [
      {number:'2135551234', price:1500, monthly_fee:500, subdomain:'2135551234.buy.spanler.com', description:'洛杉矶靓号'},
      {number:'6263218888', price:19900, monthly_fee:800, subdomain:'6263218888.buy.spanler.com', description:'El Monte 8888豹子号'},
      {number:'9498880001', price:2900, monthly_fee:1000, subdomain:'9498880001.buy.spanler.com', description:'Irvine 888开头'}
    ];
    return new Response(JSON.stringify(mock), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
