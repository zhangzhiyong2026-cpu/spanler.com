// GitHub OAuth popup used exclusively by the optional Sveltia Git CMS.
const enc = new TextEncoder();
function htmlEscape(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export async function cmsAuth(request, env) {
  const url = new URL(request.url),
    site = env.SITE_URL;
  if (
    !site?.startsWith("https://") ||
    !env.GITHUB_OAUTH_CLIENT_ID ||
    !env.GITHUB_OAUTH_CLIENT_SECRET
  )
    return new Response(
      "Sveltia Git login is not configured. Use /admin/ for database publishing.",
      { status: 503 },
    );
  const callback = site + "/api/cms/callback";
  if (url.pathname === "/api/cms/auth") {
    const state = crypto.randomUUID();
    return new Response(null, {
      status: 302,
      headers: {
        Location:
          "https://github.com/login/oauth/authorize?" +
          new URLSearchParams({
            client_id: env.GITHUB_OAUTH_CLIENT_ID,
            redirect_uri: callback,
            scope: "repo",
            state,
          }),
        "Set-Cookie": `spanler_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/cms/; Max-Age=600`,
        "Cache-Control": "no-store",
      },
    });
  }
  const stateCookie = (request.headers.get("Cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("spanler_oauth="))
    ?.slice(14);
  // Exact constant-length UUID comparison and one-time code exchange.
  if (
    !stateCookie ||
    stateCookie !== url.searchParams.get("state") ||
    !url.searchParams.get("code")
  )
    return new Response("OAuth state check failed", { status: 403 });
  let token;
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code: url.searchParams.get("code"),
        redirect_uri: callback,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json();
    if (!r.ok || !j.access_token) throw Error();
    token = j.access_token;
  } catch {
    return new Response("GitHub authorization failed. Please retry.", {
      status: 502,
    });
  }
  const nonce = crypto.randomUUID();
  const payload = JSON.stringify(
    "authorization:github:success:" +
      JSON.stringify({ token, provider: "github" }),
  ).replaceAll("<", "\\u003c");
  const script = `const origin=${JSON.stringify(site)};window.addEventListener('message',e=>{if(e.origin!==origin||e.source!==window.opener)return;window.opener.postMessage(${payload},origin);window.close()},{once:true});if(window.opener)window.opener.postMessage('authorizing:github',origin);`;
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Spanler authorization</title></head><body><p>${htmlEscape("Completing GitHub sign-in. You can close this window after authorization.")}</p><script nonce="${nonce}">${script}</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
        "Set-Cookie":
          "spanler_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms/; Max-Age=0",
      },
    },
  );
}
