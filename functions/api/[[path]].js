import { cmsAuth } from "../../shared/cms-auth.js";
import {
  languages,
  slugs,
  defaultPage,
  systemPrompt,
} from "../../shared/content.js";
const encoder = new TextEncoder();
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
export const validEmail = (s) =>
  typeof s === "string" &&
  s.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const safeText = (s, max) =>
  typeof s === "string" ? s.trim().slice(0, max) : "";
function problem(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
function need(env, name) {
  if (!env[name]) problem("Service is not configured: " + name, 503);
  return env[name];
}
function local(env) {
  return (
    env.LOCAL_DEV === "true" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.SITE_URL || "")
  );
}
async function digest(s) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(s)),
  );
}
async function equal(a, b) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let n = 0;
  for (let i = 0; i < x.length; i++) n |= x[i] ^ y[i];
  return n === 0;
}
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(text)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function authorized(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;
  const token = (request.headers.get("Cookie") || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("spanler_admin="))
    ?.slice(14);
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (
    !/^\d+$/.test(exp) ||
    Number(exp) < Date.now() ||
    Number(exp) > Date.now() + 9 * 3600000 ||
    !sig
  )
    return false;
  return equal(sig, await hmac(env.ADMIN_SESSION_SECRET, "admin:" + exp));
}
function originCheck(request, env) {
  const origin = request.headers.get("Origin");
  const target = new URL(request.url).origin;
  if (origin && origin !== target && origin !== env.SITE_URL)
    problem("Origin not allowed", 403);
  if (request.headers.get("Sec-Fetch-Site") === "cross-site")
    problem("Cross-site request blocked", 403);
}
async function body(request, max = 30000) {
  const raw = await request.text();
  if (encoder.encode(raw).length > max) problem("Request too large", 413);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      problem("Invalid JSON object");
    return parsed;
  } catch {
    problem("Invalid JSON object");
  }
}
async function limit(env, key, cap, expires) {
  need(env, "DB");
  const row = await env.DB.prepare(
    "INSERT INTO limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count",
  )
    .bind(key, expires, cap)
    .first();
  if (!row) problem("Request limit reached. Please try again later.", 429);
}
async function ipKey(request, env) {
  return [
    ...(await digest(
      (request.headers.get("CF-Connecting-IP") || "local") +
        ":" +
        (env.ADMIN_SESSION_SECRET || "spanler-rate-limit"),
    )),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}
async function turnstile(request, env, token, expectedAction) {
  if (local(env)) return;
  need(env, "TURNSTILE_SECRET_KEY");
  if (typeof token !== "string" || !token || token.length > 2048)
    problem("Please complete human verification");
  let r;
  try {
    r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP") || "",
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    problem("Human verification unavailable", 503);
  }
  if (!r.ok) problem("Human verification unavailable", 503);
  const j = await r.json();
  if (!j.success || j.hostname !== new URL(env.SITE_URL).hostname)
    problem("Human verification failed", 403);
}
async function networkJson(url, options) {
  const u = new URL(url);
  if (u.protocol !== "https:") throw Error("HTTPS required");
  const r = await fetch(u, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw Error("Upstream rejected request");
  return r;
}
async function syncLead(env, lead) {
  let crm = lead.crm_status,
    email = lead.email_status;
  const payload = {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    message: lead.message,
    type: lead.business_type,
    tag: "type:" + lead.business_type,
    language: lead.language,
    source_page: lead.source_page,
    utm: JSON.parse(lead.utm || "{}"),
    created_at: lead.created_at,
  };
  if (crm !== "sent" && env.NOCODB_URL && env.NOCODB_TOKEN) {
    try {
      await networkJson(env.NOCODB_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xc-token": env.NOCODB_TOKEN,
          Authorization: "Bearer " + env.NOCODB_TOKEN,
          "Idempotency-Key": lead.id,
        },
        body: JSON.stringify(
          env.NOCODB_MODE === "records"
            ? { ...payload, utm: JSON.stringify(payload.utm) }
            : payload,
        ),
      });
      crm = "sent";
    } catch {
      crm = "failed";
    }
  }
  if (
    email !== "sent" &&
    env.RESEND_API_KEY &&
    env.NOTIFY_EMAIL &&
    env.MAIL_FROM
  ) {
    try {
      await networkJson("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": lead.id,
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: [env.NOTIFY_EMAIL],
          reply_to: lead.email,
          subject: "Spanler inquiry · " + lead.business_type,
          text: JSON.stringify(payload, null, 2),
        }),
      });
      email = "sent";
    } catch {
      email = "failed";
    }
  }
  await env.DB.prepare(
    "UPDATE leads SET crm_status=?, email_status=? WHERE id=?",
  )
    .bind(crm, email, lead.id)
    .run();
}
const allowedMime = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);
export function validMagic(type, b) {
  const s = String.fromCharCode(...b.slice(0, 12));
  if (type === "image/png") return b[0] === 137 && s.slice(1, 4) === "PNG";
  if (type === "image/jpeg")
    return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === "image/gif") return /^GIF8[79]a/.test(s);
  if (type === "image/webp")
    return s.startsWith("RIFF") && s.slice(8) === "WEBP";
  if (type === "application/pdf") return s.startsWith("%PDF-");
  if (type === "audio/mpeg")
    return s.startsWith("ID3") || (b[0] === 255 && (b[1] & 224) === 224);
  if (type === "audio/ogg") return s.startsWith("OggS");
  if (type === "audio/wav" || type === "audio/x-wav")
    return s.startsWith("RIFF") && s.slice(8) === "WAVE";
  if (type === "video/mp4") return s.slice(4, 8) === "ftyp";
  if (type === "video/webm")
    return b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163;
  return false;
}
async function route(c) {
  const { request, env } = c;
  const u = new URL(request.url);
  const path = u.pathname.replace(/\/$/, "");
  const method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 405 });
  if (!["GET", "HEAD"].includes(method)) originCheck(request, env);
  if (["/api/cms/auth", "/api/cms/callback"].includes(path) && method === "GET")
    return cmsAuth(request, env);
  if (path === "/api/config" && method === "GET")
    return json({
      turnstileSiteKey: local(env) ? "" : env.TURNSTILE_SITE_KEY || "",
      aiEnabled:
        env.AI_ENABLED === "true" && !!env.GROQ_API_KEY && !!env.CHAT_LOGS,
      ga4Id: env.GA4_ID || "",
    });
  if (path.startsWith("/api/content/") && method === "GET") {
    const slug = path.split("/").pop(),
      language = u.searchParams.get("lang") || "zh";
    if (!slugs.includes(slug) || !languages.includes(language))
      problem("Content not found", 404);
    let content = defaultPage(slug, language);
    if (env.DB) {
      const row = await env.DB.prepare(
        "SELECT content FROM pages WHERE slug=? AND language=?",
      )
        .bind(slug, language)
        .first();
      if (row) content = JSON.parse(row.content);
    }
    return json({ content });
  }
  if (path === "/api/admin/login" && method === "POST") {
    need(env, "DB");
    need(env, "ADMIN_PASSWORD");
    need(env, "ADMIN_SESSION_SECRET");
    if (env.ADMIN_PASSWORD.length < 16 || env.ADMIN_SESSION_SECRET.length < 32)
      problem("Administrator secrets must be configured securely", 503);
    const now = Date.now(),
      ip = await ipKey(request, env);
    await limit(
      env,
      `login:${Math.floor(now / 900000)}:${ip}`,
      5,
      now + 900000,
    );
    const b = await body(request, 5000);
    await turnstile(request, env, b.turnstileToken);
    if (!(await equal(safeText(b.password, 300), env.ADMIN_PASSWORD)))
      problem("Invalid credentials", 401);
    const exp = String(now + 8 * 3600000);
    const token =
      exp + "." + (await hmac(env.ADMIN_SESSION_SECRET, "admin:" + exp));
    return json({ ok: true }, 200, {
      "Set-Cookie": `spanler_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${local(env) ? "" : "; Secure"}`,
    });
  }
  if (path.startsWith("/api/admin/")) {
    if (!(await authorized(request, env))) problem("Please sign in", 401);
    need(env, "DB");
    if (path === "/api/admin/session" && method === "GET")
      return json({ authenticated: true });
    if (path === "/api/admin/logout" && method === "POST")
      return json({ ok: true }, 200, {
        "Set-Cookie": `spanler_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${local(env) ? "" : "; Secure"}`,
      });
    if (path === "/api/admin/content" && method === "POST") {
      const b = await body(request);
      if (
        !slugs.slice(0, 7).includes(b.slug) ||
        !languages.includes(b.language)
      )
        problem("Invalid page");
      const content = {
        title: safeText(b.title, 200),
        description: safeText(b.description, 1000),
        body: safeText(b.body, 20000),
        mediaUrl: safeText(b.mediaUrl, 300),
        mediaType: safeText(b.mediaType, 100),
        mediaAlt: safeText(b.mediaAlt, 300),
      };
      if (!content.title || !content.description)
        problem("Title and description are required");
      if (
        content.mediaUrl &&
        !/^\/media\/[a-f0-9-]+\/[^/]+$/.test(content.mediaUrl)
      )
        problem("Choose a file from the media library");
      if (content.mediaUrl && !allowedMime.has(content.mediaType))
        problem("Invalid media type");
      await env.DB.prepare(
        "INSERT INTO pages (slug,language,content) VALUES (?,?,?) ON CONFLICT(slug,language) DO UPDATE SET content=excluded.content,updated_at=CURRENT_TIMESTAMP",
      )
        .bind(b.slug, b.language, JSON.stringify(content))
        .run();
      return json({ ok: true });
    }
    if (path === "/api/admin/media" && method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM media ORDER BY created_at DESC LIMIT 100",
      ).all();
      return json({
        files: results.map((x) => ({ ...x, url: "/media/" + x.object_key })),
      });
    }
    if (path === "/api/admin/media" && method === "POST") {
      need(env, "MEDIA");
      if (Number(request.headers.get("Content-Length")) > 21 * 1024 * 1024)
        problem("File too large", 413);
      const f = (await request.formData()).get("file");
      if (!f || typeof f === "string" || !allowedMime.has(f.type))
        problem("Unsupported file type");
      if (!f.size || f.size > 20 * 1024 * 1024)
        problem("File must be between 1 byte and 20 MB", 413);
      const data = await f.arrayBuffer();
      if (!validMagic(f.type, new Uint8Array(data)))
        problem("File content does not match its media type");
      const id = crypto.randomUUID(),
        name = safeText(f.name, 120).replace(/[^a-zA-Z0-9._-]/g, "_") || "file",
        key = id + "/" + name;
      await env.MEDIA.put(key, data, { httpMetadata: { contentType: f.type } });
      try {
        await env.DB.prepare(
          "INSERT INTO media(id,name,object_key,type,size) VALUES (?,?,?,?,?)",
        )
          .bind(id, safeText(f.name, 200), key, f.type, f.size)
          .run();
      } catch (e) {
        await env.MEDIA.delete(key);
        throw e;
      }
      return json({ id, url: "/media/" + key, type: f.type }, 201);
    }
    if (path === "/api/admin/media" && method === "DELETE") {
      need(env, "MEDIA");
      const id = u.searchParams.get("id");
      if (!/^[a-f0-9-]{36}$/.test(id || ""))
        problem("Invalid media identifier");
      const item = await env.DB.prepare("SELECT * FROM media WHERE id=?")
        .bind(id)
        .first();
      if (!item) problem("Not found", 404);
      const used = await env.DB.prepare(
        "SELECT slug FROM pages WHERE instr(content, ?) > 0 LIMIT 1",
      )
        .bind("/media/" + item.object_key)
        .first();
      if (used)
        problem(
          "Remove this media from published content before deleting it",
          409,
        );
      await env.MEDIA.delete(item.object_key);
      await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
    if (path === "/api/admin/leads" && method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM leads ORDER BY created_at DESC LIMIT 100",
      ).all();
      return json({ leads: results });
    }
    if (path === "/api/admin/retry" && method === "POST") {
      await env.DB.prepare("DELETE FROM limits WHERE expires < ?")
        .bind(Date.now())
        .run();
      const { results } = await env.DB.prepare(
        "SELECT * FROM leads WHERE crm_status!='sent' OR email_status!='sent' ORDER BY created_at ASC LIMIT 10",
      ).all();
      for (const lead of results) await syncLead(env, lead);
      return json({ processed: results.length });
    }
    problem("Not found", 404);
  }
  if (path === "/api/leads" && method === "POST") {
    need(env, "DB");
    const b = await body(request, 12000);
    if (b.website) problem("Invalid submission");
    if (
      b.consent !== true ||
      !validEmail(b.email) ||
      !safeText(b.name, 100) ||
      !safeText(b.message, 3000) ||
      !["ai_sdr", "overseas_chinese_service"].includes(b.business_type) ||
      !languages.includes(b.language)
    )
      problem("Please complete all required fields and consent");
    const now = Date.now();
    await limit(
      env,
      `lead:${Math.floor(now / 3600000)}:${await ipKey(request, env)}`,
      5,
      now + 3600000,
    );
    await turnstile(request, env, b.turnstileToken);
    const utm = {};
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ])
      if (b.utm?.[k]) utm[k] = safeText(b.utm[k], 200);
    const lead = {
      id: crypto.randomUUID(),
      name: safeText(b.name, 100),
      email: b.email.trim(),
      company: safeText(b.company, 200),
      message: safeText(b.message, 3000),
      business_type: b.business_type,
      language: b.language,
      source_page: safeText(b.source_page, 300),
      utm: JSON.stringify(utm),
      created_at: new Date().toISOString(),
      crm_status: "pending",
      email_status: "pending",
    };
    await env.DB.prepare(
      "INSERT INTO leads(id,name,email,company,message,business_type,language,source_page,utm,consent,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)",
    )
      .bind(
        lead.id,
        lead.name,
        lead.email,
        lead.company,
        lead.message,
        lead.business_type,
        lead.language,
        lead.source_page,
        lead.utm,
        lead.created_at,
      )
      .run();
    c.waitUntil(syncLead(env, lead));
    return json({ ok: true, id: lead.id }, 201);
  }
  if (path === "/api/chat" && method === "POST") {
    if (env.AI_ENABLED !== "true")
      problem(
        "AI assistant is not available. Please use the contact form.",
        503,
      );
    need(env, "GROQ_API_KEY");
    need(env, "DB");
    need(env, "CHAT_LOGS");
    const b = await body(request, 18000);
    const message = safeText(b.message, 2000);
    if (
      !message ||
      typeof b.message !== "string" ||
      b.message.length > 2000 ||
      b.consent !== true ||
      !languages.includes(b.language)
    )
      problem("Message, language and explicit consent are required");
    const now = Date.now(),
      date = new Date(now).toISOString();
    await limit(
      env,
      `chat:ip:${Math.floor(now / 3600000)}:${await ipKey(request, env)}`,
      12,
      now + 3600000,
    );
    await limit(
      env,
      "chat:day:" + date.slice(0, 10),
      Math.min(10000, Math.max(1, Number(env.AI_DAILY_LIMIT) || 100)),
      now + 2 * 86400000,
    );
    await limit(
      env,
      "chat:month:" + date.slice(0, 7),
      Math.min(100000, Math.max(1, Number(env.AI_MONTHLY_LIMIT) || 1000)),
      now + 32 * 86400000,
    );
    const history = Array.isArray(b.history)
      ? b.history
          .slice(-6)
          .filter(
            (x) =>
              ["user", "assistant"].includes(x.role) &&
              typeof x.content === "string",
          )
          .map((x) => ({ role: x.role, content: x.content.slice(0, 2000) }))
      : [];
    let data;
    try {
      const r = await networkJson(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + env.GROQ_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.AI_MODEL || "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  systemPrompt +
                  " Respond in " +
                  { zh: "Chinese", en: "English", es: "Spanish" }[b.language] +
                  ".",
              },
              ...history,
              { role: "user", content: message },
            ],
            max_tokens: Math.min(
              600,
              Math.max(50, Number(env.AI_MAX_OUTPUT_TOKENS) || 400),
            ),
            temperature: 0.4,
          }),
        },
      );
      data = await r.json();
    } catch {
      problem("AI service unavailable. Please use the contact form.", 503);
    }
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply)
      problem("AI service unavailable. Please use the contact form.", 503);
    const id = crypto.randomUUID();
    await env.CHAT_LOGS.put(
      `${date.slice(0, 10)}/${id}.json`,
      JSON.stringify({
        id,
        time: date,
        language: b.language,
        question: message,
        reply,
        usage: data.usage || null,
        consent: true,
      }),
      { httpMetadata: { contentType: "application/json" } },
    );
    return json({
      reply,
      intent:
        /price|demo|contact|quote|consult|报价|演示|联系|咨询|预约|precio|contacto|demostraci/i.test(
          message,
        ),
    });
  }
  problem("Not found", 404);
}
export async function onRequest(c) {
  try {
    return await route(c);
  } catch (e) {
    return json(
      { error: e.status ? e.message : "Service temporarily unavailable" },
      e.status || 503,
    );
  }
}
