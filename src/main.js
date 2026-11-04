import "./style.css";
import {
  copy,
  languages,
  slugs,
  defaultPage,
  insightCards,
} from "../shared/content.js";
const parts = location.pathname.split("/").filter(Boolean);
const lang = languages.includes(parts[0]) ? parts[0] : "zh";
const slug = parts[0] === "admin" ? "admin" : parts[1] || "home";
const t = copy[lang];
const app = document.querySelector("#app");
let config = {};
let activePage = defaultPage(slug, lang);
let chatBusy = false;
let chatHistory = [];
let analyticsStarted = false;
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const url = (s = "home", l = lang) =>
  `/${l}/${s === "home" ? "" : s + "/"} `.trim();
const a = (s, label, cls = "") =>
  `<a class="${cls}" href="${url(s)}">${esc(label)} <span aria-hidden="true">↗</span></a>`;
const mark =
  '<span class="brand-mark" aria-hidden="true">s</span><span>spanler<span class="brand-dot">.</span></span>';
const brand = `<a class="brand" href="${url()}" aria-label="Spanler home">${mark}</a>`;
function nav() {
  return `<header><div class="nav-wrap">${brand}<nav id="navigation" aria-label="Main">${t.nav.map((n, i) => `<a class="${slug === slugs[i] ? "active" : ""}" href="${url(slugs[i])}">${n}</a>`).join("")}</nav><div class="nav-tools"><select id="language" aria-label="Language"><option value="zh" ${lang === "zh" ? "selected" : ""}>中文</option><option value="en" ${lang === "en" ? "selected" : ""}>EN</option><option value="es" ${lang === "es" ? "selected" : ""}>ES</option></select><a class="nav-contact" href="${url("contact")}">${t.nav[6]} ↗</a><button class="menu-toggle" aria-label="${t.menu}" aria-expanded="false">☰</button></div></div></header>`;
}
function art() {
  return `<div class="connection-art" aria-label="Connecting business and life across borders"><div class="art-grid"></div><div class="orbit o1"></div><div class="orbit o2"></div><div class="orbit o3"></div><div class="art-line l1"></div><div class="art-line l2"></div><div class="orbit-core"><span class="core-symbol">s</span><small>CONNECTED BY SPANLER</small></div><div class="float-card fc1"><span class="tiny-icon">↗</span><div><b>AI + HUMAN</b><small>${lang === "zh" ? "让每次连接更有价值" : "Better connections"}</small></div><span class="live-dot"></span></div><div class="float-card fc2"><span class="tiny-icon dark">◎</span><div><b>GLOBAL CONNECTIONS</b><small>China · United States · Beyond</small></div></div><div class="art-coord">34.0522° N &nbsp; 118.2437° W</div><span class="art-dot d1"></span><span class="art-dot d2"></span><span class="art-star">✳</span></div>`;
}
function services() {
  return `<section class="section services"><div class="section-top"><div><p class="eyebrow">${t.label}</p><h2>${t.services}</h2></div><p class="section-intro">${t.serviceIntro}</p></div><div class="service-grid"><article class="service-card ai"><div class="card-heading"><span class="card-icon">↗</span><span>01 / FOR BUSINESS</span></div><h3>${t.aiTitle}</h3><p>${t.aiDesc}</p><div class="service-diagram"><span>Discover</span><i>→</i><span>Connect</span><i>→</i><span>Grow</span></div>${a("products", t.explore, "text-link")}</article><article class="service-card life"><div class="card-heading"><span class="card-icon">⌂</span><span>02 / FOR LIFE</span></div><h3>${t.lifeTitle}</h3><p>${t.lifeDesc}</p><div class="place-tags"><span>LOCAL SUPPORT</span><span>跨境生活</span><span>NEW POSSIBILITIES</span></div>${a("solutions", t.explore, "text-link")}</article></div></section>`;
}
function process() {
  return `<section class="section process"><p class="eyebrow">${t.process}</p><h2>${t.processTitle}</h2><div class="steps">${t.steps.map((s, i) => `<article><span class="step-number">0${i + 1}</span><h3>${s}</h3><p>${t.stepText[i]}</p></article>`).join("")}</div></section>`;
}
function insights() {
  return `<section class="section insights"><div class="section-top"><div><p class="eyebrow">${t.insightsLabel}</p><h2>${t.insights}</h2></div>${a("insights", t.nav[3], "text-link")}</div><div class="insight-grid">${insightCards[lang].map((c, i) => `<article class="insight-card"><div class="insight-art ia${i}"><span>${["↗", "◎", "✳"][i]}</span><small>SPANLER / 0${i + 1}</small></div><small class="category">${c[0]}</small><h3>${c[1]}</h3><p>${c[2]}</p></article>`).join("")}</div></section>`;
}
function cta() {
  return `<section class="section cta"><div><p class="eyebrow">LET'S MAKE YOUR NEXT MOVE</p><h2>${t.contactTitle.replace("\n", "<br>")}</h2><p>${t.contactText}</p></div>${a("contact", t.cta, "button light")}</section>`;
}
function form() {
  return `<section class="section contact-section"><div><p class="eyebrow">START A CONVERSATION</p><h1>${esc(activePage.title).replaceAll("\n", "<br>")}</h1><p>${esc(activePage.description)}</p>${activePage.body ? `<p>${esc(activePage.body)}</p>` : ""}${mediaHtml(activePage)}<div class="contact-note"><span class="live-dot"></span> ${lang === "zh" ? "从真实需求开始，不预设标准答案。" : lang === "es" ? "Empezamos por tus necesidades reales." : "We start with your real needs."}</div></div><form id="lead-form"><div class="form-row"><label>${t.formName}<input name="name" required maxlength="100" autocomplete="name"></label><label>${t.formEmail}<input name="email" type="email" required maxlength="254" autocomplete="email"></label></div><label>${t.formCompany}<input name="company" maxlength="200" autocomplete="organization"></label><label>${t.formType}<select name="business_type"><option value="ai_sdr">${t.types[0]}</option><option value="overseas_chinese_service">${t.types[1]}</option></select></label><label>${t.formMessage}<textarea name="message" rows="5" required maxlength="3000"></textarea></label><input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="check"><input type="checkbox" name="consent" required><span>${t.consent} <a href="${url("privacy")}">${t.privacy} ↗</a></span></label><div class="turnstile-box"></div><button class="button" type="submit">${t.submit} ↗</button><p id="form-status" role="status" aria-live="polite"></p></form></section>`;
}
function privacy() {
  const zh = lang === "zh",
    es = lang === "es";
  return `<section class="section legal"><p class="eyebrow">PRIVACY & TRUST</p><h1>${t.privacy}</h1>${zh ? `<p>更新日期：2026 年 11 月 3 日。本政策是上线前需要运营者确认的初始版本。</p><h2>我们处理哪些信息</h2><p>联系表单收集姓名、邮箱、公司（选填）、咨询内容、业务方向、来源页面、UTM 参数和提交时间，用于回复咨询及管理线索。请勿提交证件、支付信息或其他敏感资料。</p><h2>AI 对话与服务商</h2><p>只有你勾选同意后才会发送对话。启用后，问题及近期对话会发送给 Groq 等已配置的 AI 服务商；时间、语言、问题、回复和使用量写入 Cloudflare R2。默认保留 30 天，运营者须配置 R2 生命周期规则。AI 回复仅供参考，不构成法律、移民或财务建议。</p><h2>存储、共享与跨境处理</h2><p>Cloudflare 托管网站、内容、媒体和线索；启用时 NocoDB 接收咨询，邮件服务商发送通知，Groq 处理 AI 请求。这些服务可能在境外处理数据。不会因广告目的出售或共享个人信息；网站不启用广告跟踪。</p><h2>你的选择与加州隐私权</h2><p>你可以请求访问、更正、删除或获取个人信息副本，并撤回可选统计同意，不会因此受到歧视。请通过联系表单在咨询内容注明“隐私请求”，说明需求；不要在表单提交身份证明文件。Global Privacy Control 信号会关闭可选统计。</p><h2>Cookie 与安全</h2><p>必要存储用于语言、隐私选择与管理员会话。GA4 仅在明确同意后启用。管理员会话使用 HttpOnly Cookie。我们采用访问控制和最少数据原则，但不保证绝对安全。</p><h2>运营者确认项</h2><p>上线前须补齐运营主体名称、隐私联系邮箱、适用管辖地、供应商配置与数据保留政策。此初稿不能代替法律审核。</p>` : es ? `<p>Actualización: 3 de noviembre de 2026. Versión inicial pendiente de confirmación del operador.</p><h2>Datos y finalidad</h2><p>Recogemos nombre, correo, empresa opcional, consulta, tipo de servicio, origen, UTM y fecha para responder y gestionar solicitudes. No envíes documentos ni datos sensibles.</p><h2>Conversaciones con IA</h2><p>Con tu consentimiento, enviamos mensajes y contexto reciente a Groq u otro proveedor configurado. Guardamos pregunta, respuesta, idioma, fecha y uso en Cloudflare R2. Retención propuesta: 30 días, mediante una regla de ciclo de vida. La IA no ofrece asesoramiento jurídico, migratorio ni financiero.</p><h2>Proveedores y derechos</h2><p>Cloudflare aloja los datos; NocoDB y el proveedor de correo reciben consultas si se configuran. El tratamiento puede ser internacional. No vendemos ni compartimos datos con fines publicitarios. Puedes solicitar acceso, rectificación, supresión o copia mediante el formulario de contacto, sin discriminación.</p><h2>Cookies y consentimiento</h2><p>Solo activamos GA4 con consentimiento. Respetamos Global Privacy Control. Puedes retirar el consentimiento en los ajustes. Almacenamos preferencias y una cookie de sesión segura para administradores.</p><h2>Antes del lanzamiento</h2><p>El operador debe confirmar su identidad, correo de privacidad, jurisdicción, proveedores y retención. Este texto requiere revisión legal.</p>` : `<p>Updated November 3, 2026. Initial policy, subject to operator confirmation before launch.</p><h2>Information and purpose</h2><p>We collect your name, email, optional company, inquiry, service category, source page, UTM parameters and submission time to respond and manage leads. Do not submit identity documents, payment information or sensitive data.</p><h2>AI conversations</h2><p>Only with your explicit consent, messages and recent conversation context go to Groq or another configured AI provider. Timestamp, language, question, response and usage are stored in Cloudflare R2. Proposed retention is 30 days; the operator must configure lifecycle deletion. AI is not legal, immigration or financial advice.</p><h2>Storage, sharing and international processing</h2><p>Cloudflare hosts content and data. When configured, NocoDB receives inquiries and an email provider sends notifications. Providers may process data internationally. We do not sell or share personal information for advertising and do not enable advertising tracking.</p><h2>Your choices and California rights</h2><p>You may request access, correction, deletion or a copy of your information, and withdraw optional analytics consent without discrimination. Use the contact form with “privacy request”; do not attach identity documents. Global Privacy Control disables optional analytics.</p><h2>Cookies and security</h2><p>Essential storage supports language, privacy preferences and administrator sessions. GA4 runs only with explicit consent. Administrator sessions use HttpOnly cookies and access controls. No system can guarantee absolute security.</p><h2>Before launch</h2><p>The operator must confirm its legal identity, privacy contact email, jurisdiction, vendors and retention policy. This draft does not replace legal review.</p>`}</section>`;
}
function mediaHtml(p) {
  if (!p.mediaUrl || !/^\/media\/[a-f0-9-]+\/[^/]+$/.test(p.mediaUrl))
    return "";
  if (p.mediaType.startsWith("image/"))
    return `<img class="content-media" src="${esc(p.mediaUrl)}" alt="${esc(p.mediaAlt)}">`;
  if (p.mediaType.startsWith("audio/"))
    return `<audio controls src="${esc(p.mediaUrl)}"></audio>`;
  if (p.mediaType.startsWith("video/"))
    return `<video class="content-media" controls src="${esc(p.mediaUrl)}"></video>`;
  return `<a href="${esc(p.mediaUrl)}" target="_blank" rel="noopener">${esc(p.mediaAlt || "PDF")} ↗</a>`;
}
function page() {
  if (slug === "privacy" || slug === "cookies") return privacy();
  if (slug === "home")
    return `<section class="hero section"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> ${t.eyebrow}</p><h1 data-content="title">${esc(activePage.title).replaceAll("\n", "<br>")}</h1><p class="hero-intro" data-content="description">${esc(activePage.description)}</p><div class="hero-actions">${a("contact", t.cta, "button")}${a("products", t.secondary, "secondary-link")}</div><div class="hero-foot"><span>AI-POWERED. HUMAN-CENTERED.</span><span class="mini-line"></span><span>跨境 · 无界</span></div></div>${art()}</section><div class="ticker"><span>AI SDR</span><i>✳</i><span>CROSS-BORDER SERVICES</span><i>✳</i><span>GLOBAL CONNECTIONS</span><i>✳</i><span>LOCAL SUPPORT</span></div>${services()}${activePage.body || activePage.mediaUrl ? `<section class="section editorial"><p>${esc(activePage.body).replaceAll("\n", "<br>")}</p>${mediaHtml(activePage)}</section>` : ""}${process()}${insights()}${cta()}`;
  if (slug === "contact") return form();
  return `<section class="section inner-hero"><p class="eyebrow">SPANLER / ${esc(slug.toUpperCase())}</p><h1 data-content="title">${esc(activePage.title)}</h1><p data-content="description">${esc(activePage.description)}</p>${activePage.body ? `<div class="editorial">${esc(activePage.body).replaceAll("\n", "<br>")}</div>` : ""}${mediaHtml(activePage)}</section>${["products", "solutions"].includes(slug) ? services() : slug === "insights" ? insights() : process()}${cta()}`;
}
function footer() {
  return `<footer class="section"><div class="footer-top"><div>${brand}<p>${t.footer}</p></div><div class="footer-links">${t.nav
    .slice(1)
    .map((n, i) => `<a href="${url(slugs[i + 1])}">${n}</a>`)
    .join(
      "",
    )}</div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Spanler. ${t.rights}.</span><div><a href="${url("privacy")}">${t.privacy}</a><button id="privacy-settings">${t.cookies}</button><a href="/admin/">CMS ↗</a></div></div></footer>`;
}
function widgets() {
  return `<button id="chat-toggle" aria-label="${t.chatTitle}" aria-expanded="false"><span>✳</span> <span>Ask Spanler</span></button><section id="chat-panel" hidden aria-label="${t.chatTitle}"><div class="chat-header"><div><b>${t.chatTitle}</b><small>AI · ${config.aiEnabled ? "Online" : "Contact us"}</small></div><button id="chat-close" aria-label="Close">×</button></div><div id="chat-messages" role="log" aria-live="polite"><p class="chat-bubble">${t.chatHello}</p></div><label class="check chat-consent"><input type="checkbox" id="chat-consent"><span>${t.chatConsent} <a href="${url("privacy")}">${t.privacy}</a></span></label><form id="chat-form"><input id="chat-input" required maxlength="2000" placeholder="${t.chatPlaceholder}" aria-label="${t.chatPlaceholder}"><button aria-label="${t.chatSend}">↗</button></form><p class="chat-disclaimer">AI · ${lang === "zh" ? "回复仅供参考，请勿提供敏感信息。" : lang === "es" ? "No compartas datos sensibles." : "Please do not share sensitive information."}</p></section><section id="cookie-banner" hidden aria-label="Privacy choices"><p>${t.cookieText} <a href="${url("privacy")}">${t.privacy}</a></p><div><button data-cookie="denied">${t.reject}</button><button data-cookie="granted" class="button">${t.accept}</button></div></section>`;
}
async function api(path, body, method = "POST") {
  const r = await fetch(path, {
    method: body === undefined ? "GET" : method,
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  let j;
  try {
    j = await r.json();
  } catch {
    throw Error(t.error);
  }
  if (!r.ok) throw Error(j.error || t.error);
  return j;
}
function storedConsent() {
  try {
    return localStorage.getItem("spanler-consent");
  } catch {
    return null;
  }
}
function analytics() {
  if (
    analyticsStarted ||
    storedConsent() !== "granted" ||
    navigator.globalPrivacyControl ||
    !/^G-[A-Z0-9]+$/.test(config.ga4Id || "")
  )
    return;
  analyticsStarted = true;
  window["ga-disable-" + config.ga4Id] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", config.ga4Id, { send_page_view: true });
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`;
  s.async = true;
  document.head.append(s);
}
let leadWidget;
function loadTurnstile() {
  if (!config.turnstileSiteKey) return;
  const mount = () => {
    const box = document.querySelector(".turnstile-box");
    if (box && window.turnstile)
      leadWidget = window.turnstile.render(box, {
        sitekey: config.turnstileSiteKey,
      });
  };
  if (window.turnstile) mount();
  else {
    window.spanlerTurnstileReady = mount;
    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=spanlerTurnstileReady&render=explicit";
    s.async = true;
    document.head.append(s);
  }
}
function bind() {
  document.querySelector("#language").onchange = (e) =>
    (location.href = url(slug, e.target.value));
  document.querySelector(".menu-toggle").onclick = (e) => {
    let open = e.currentTarget.getAttribute("aria-expanded") !== "true";
    e.currentTarget.setAttribute("aria-expanded", open);
    document.querySelector("nav").classList.toggle("open", open);
  };
  document.querySelector("#privacy-settings").onclick = () =>
    (document.querySelector("#cookie-banner").hidden = false);
  document.querySelectorAll("[data-cookie]").forEach(
    (b) =>
      (b.onclick = () => {
        const consent = navigator.globalPrivacyControl
          ? "denied"
          : b.dataset.cookie;
        try {
          localStorage.setItem("spanler-consent", consent);
        } catch {}
        if (consent === "denied" && config.ga4Id) {
          window["ga-disable-" + config.ga4Id] = true;
          for (const cookie of document.cookie.split(";")) {
            const name = cookie.trim().split("=")[0];
            if (name.startsWith("_ga"))
              for (const domain of [
                "",
                location.hostname,
                "." + location.hostname,
                "." + location.hostname.split(".").slice(-2).join("."),
              ])
                document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? " Domain=" + domain + ";" : ""}`;
          }
        }
        document.querySelector("#cookie-banner").hidden = true;
        analytics();
      }),
  );
  document.querySelector("#cookie-banner").hidden =
    !!storedConsent() || !!navigator.globalPrivacyControl;
  analytics();
  const panel = document.querySelector("#chat-panel");
  document.querySelector("#chat-toggle").onclick = () => {
    panel.hidden = !panel.hidden;
    document
      .querySelector("#chat-toggle")
      .setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) document.querySelector("#chat-input").focus();
  };
  document.querySelector("#chat-close").onclick = () => {
    panel.hidden = true;
    document
      .querySelector("#chat-toggle")
      .setAttribute("aria-expanded", "false");
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") panel.hidden = true;
  });
  document.querySelector("#chat-form").onsubmit = async (e) => {
    e.preventDefault();
    if (chatBusy) return;
    const input = document.querySelector("#chat-input");
    const message = input.value.trim();
    if (!message) return;
    if (!document.querySelector("#chat-consent").checked) {
      document.querySelector("#chat-consent").focus();
      return;
    }
    const box = document.querySelector("#chat-messages");
    const add = (text, user = false) => {
      const p = document.createElement("p");
      p.className = "chat-bubble" + (user ? " user" : "");
      p.textContent = text;
      box.append(p);
      box.scrollTop = box.scrollHeight;
    };
    add(message, true);
    input.value = "";
    chatBusy = true;
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const j = await api("/api/chat", {
        message,
        language: lang,
        history: chatHistory.slice(-6),
        consent: true,
      });
      add(j.reply);
      chatHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: j.reply },
      );
      if (j.intent) {
        const p = document.createElement("p");
        p.innerHTML = `<a href="${url("contact")}">${t.leadHint} ↗</a>`;
        box.append(p);
      }
    } catch {
      add(t.chatOffline);
    } finally {
      chatBusy = false;
      button.disabled = false;
    }
  };
  const f = document.querySelector("#lead-form");
  if (f) {
    loadTurnstile();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const b = f.querySelector("button[type=submit]");
      const out = document.querySelector("#form-status");
      b.disabled = true;
      b.textContent = t.sending;
      try {
        const d = Object.fromEntries(new FormData(f));
        d.consent = f.consent.checked;
        d.language = lang;
        d.source_page = location.pathname;
        d.utm = Object.fromEntries(
          [...new URLSearchParams(location.search)].filter(([k]) =>
            [
              "utm_source",
              "utm_medium",
              "utm_campaign",
              "utm_term",
              "utm_content",
            ].includes(k),
          ),
        );
        d.turnstileToken =
          window.turnstile && leadWidget !== undefined
            ? window.turnstile.getResponse(leadWidget)
            : "";
        await api("/api/leads", d);
        out.textContent = t.success;
        out.className = "success";
        f.reset();
      } catch (err) {
        out.textContent = err.message;
        out.className = "error";
      } finally {
        b.disabled = false;
        b.textContent = t.submit;
        if (window.turnstile && leadWidget !== undefined)
          window.turnstile.reset(leadWidget);
      }
    };
  }
}
async function render() {
  if (slug === "admin") {
    await admin();
    return;
  }
  if (!slugs.includes(slug)) {
    app.innerHTML = `${nav()}<main class="section inner-hero"><h1>404</h1>${a("home", t.back, "button")}</main>${footer()}`;
    return;
  }
  try {
    const data = await api(`/api/content/${slug}?lang=${lang}`);
    if (data.content) activePage = data.content;
  } catch {}
  app.innerHTML = nav() + `<main>${page()}</main>` + footer() + widgets();
  bind();
}
function bindFormOnly() {
  /* Contact uses the first render; its content does not replace the form. */
}
async function admin() {
  document.documentElement.lang = "zh";
  app.innerHTML = `<div class="admin-shell"><div class="admin-top">${brand}<span>CONTENT STUDIO</span><a href="/admin/git/">Sveltia Git CMS ↗</a><a href="/zh/">查看网站 ↗</a></div><main id="admin-main"><div class="login-card"><p class="eyebrow">SPANLER / PRIVATE ACCESS</p><h1>内容管理工作台</h1><p>管理三语内容、媒体素材与客户咨询。<br>保存发布后，前台会读取最新内容。</p><form id="login-form"><label>管理员密码<input name="password" type="password" autocomplete="current-password" required></label><div id="login-turnstile"></div><button class="button">登录工作台 ↗</button><p role="status" id="login-status"></p></form><p class="muted">首次使用需要配置管理员密钥及人机验证。</p></div></main></div>`;
  try {
    await api("/api/admin/session");
    await dashboard();
    return;
  } catch {}
  let loginWidget;
  const mount = () => {
    if (window.turnstile)
      loginWidget = window.turnstile.render("#login-turnstile", {
        sitekey: config.turnstileSiteKey,
      });
  };
  if (config.turnstileSiteKey) {
    window.adminTurnstileReady = mount;
    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=adminTurnstileReady&render=explicit";
    document.head.append(s);
  }
  document.querySelector("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      await api("/api/admin/login", {
        password: e.target.password.value,
        turnstileToken:
          window.turnstile && loginWidget !== undefined
            ? window.turnstile.getResponse(loginWidget)
            : "",
      });
      await dashboard();
    } catch (err) {
      document.querySelector("#login-status").textContent = err.message;
      if (window.turnstile && loginWidget !== undefined)
        window.turnstile.reset(loginWidget);
    } finally {
      button.disabled = false;
    }
  };
}
async function dashboard() {
  const m = document.querySelector("#admin-main");
  m.innerHTML = `<div class="studio-heading"><div><p class="eyebrow">YOUR WEBSITE, YOUR VOICE</p><h1>内容工作台</h1><p>编辑 → 保存发布 → 前台实时读取</p></div><button id="logout" class="secondary-button">退出登录</button></div><div class="studio-grid"><section class="studio-card"><h2>页面内容</h2><form id="editor"><div class="form-row"><label>页面<select name="slug">${slugs
    .slice(0, 7)
    .map((s, i) => `<option value="${s}">${copy.zh.nav[i]}</option>`)
    .join(
      "",
    )}</select></label><label>语言<select name="language"><option value="zh">中文</option><option value="en">English</option><option value="es">Español</option></select></label></div><label>标题<textarea name="title" maxlength="200" rows="2" required></textarea></label><label>简介<textarea name="description" maxlength="1000" rows="3" required></textarea></label><label>补充正文<textarea name="body" maxlength="20000" rows="7"></textarea></label><label>媒体链接<input name="mediaUrl" placeholder="从媒体库复制 /media/…"></label><label>媒体类型<input name="mediaType" placeholder="image/png、audio/mpeg、video/mp4、application/pdf"></label><label>媒体描述<input name="mediaAlt" maxlength="300"></label><button class="button">保存并发布 ↗</button><a id="editor-preview" target="_blank" rel="noopener">查看当前页面 ↗</a><p id="editor-status" role="status"></p></form></section><section class="studio-card"><h2>媒体库</h2><p>图片、音频、视频与 PDF。单文件最高 20 MB。</p><form id="upload"><label>选择文件<input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/ogg,audio/wav,video/mp4,video/webm,application/pdf" required></label><button class="secondary-button">上传到 R2</button><p id="upload-status" role="status"></p></form><div id="media-list"></div></section></div><section class="studio-card"><div class="section-top"><h2>咨询线索</h2><button id="retry" class="secondary-button">重试待同步 CRM / 邮件</button></div><p id="retry-status" role="status"></p><div class="table-wrap"><table><thead><tr><th>时间 / 语言</th><th>联系人</th><th>业务</th><th>需求</th><th>同步状态</th></tr></thead><tbody id="lead-list"></tbody></table></div></section>`;
  const f = document.querySelector("#editor");
  const load = async () => {
    try {
      const j = await api(
        `/api/content/${f.slug.value}?lang=${f.language.value}`,
      );
      for (const key of [
        "title",
        "description",
        "body",
        "mediaUrl",
        "mediaType",
        "mediaAlt",
      ])
        f.elements[key].value = j.content[key] || "";
      document.querySelector("#editor-preview").href = url(
        f.slug.value,
        f.language.value,
      );
    } catch (e) {
      document.querySelector("#editor-status").textContent = e.message;
    }
  };
  f.slug.onchange = load;
  f.language.onchange = load;
  await load();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const b = f.querySelector("button");
    b.disabled = true;
    try {
      await api("/api/admin/content", Object.fromEntries(new FormData(f)));
      document.querySelector("#editor-status").textContent =
        "已发布。打开或刷新前台即可看到最新内容。";
    } catch (err) {
      document.querySelector("#editor-status").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
  const refreshMedia = async () => {
    const j = await api("/api/admin/media");
    document.querySelector("#media-list").innerHTML =
      j.files
        .map(
          (x) =>
            `<article class="media-item"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a><small>${esc(x.type)} · ${Math.round(x.size / 1024)} KB</small><input aria-label="媒体链接" readonly value="${esc(x.url)}"><button class="secondary-button" data-media="${esc(x.id)}">插入当前页面</button> <button class="secondary-button" data-delete-media="${esc(x.id)}">删除</button></article>`,
        )
        .join("") || '<p class="muted">还没有素材，上传第一份文件。</p>';
    document.querySelectorAll("[data-delete-media]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!confirm("删除该文件？此操作无法撤销。")) return;
          try {
            await api(
              "/api/admin/media?id=" + b.dataset.deleteMedia,
              {},
              "DELETE",
            );
            await refreshMedia();
          } catch (e) {
            document.querySelector("#upload-status").textContent = e.message;
          }
        }),
    );
    document.querySelectorAll("[data-media]").forEach(
      (b) =>
        (b.onclick = () => {
          const x = j.files.find((x) => x.id === b.dataset.media);
          f.mediaUrl.value = x.url;
          f.mediaType.value = x.type;
          f.mediaAlt.value = x.name;
          document.querySelector("#editor-status").textContent =
            "素材已插入，点击“保存并发布”更新页面。";
        }),
    );
  };
  await refreshMedia();
  document.querySelector("#upload").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      await api("/api/admin/media", new FormData(e.target));
      await refreshMedia();
      e.target.reset();
      document.querySelector("#upload-status").textContent = "上传成功。";
    } catch (err) {
      document.querySelector("#upload-status").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
  const loadLeads = async () => {
    const j = await api("/api/admin/leads");
    document.querySelector("#lead-list").innerHTML =
      j.leads
        .map(
          (x) =>
            `<tr><td>${esc(x.created_at)}<br>${esc(x.language)}</td><td>${esc(x.name)}<br>${esc(x.email)}<br>${esc(x.company)}</td><td>${esc(x.business_type)}</td><td>${esc(x.message)}</td><td>CRM: ${esc(x.crm_status)}<br>邮件: ${esc(x.email_status)}</td></tr>`,
        )
        .join("") || '<tr><td colspan="5">暂无咨询线索</td></tr>';
  };
  await loadLeads();
  document.querySelector("#retry").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const j = await api("/api/admin/retry", {});
      document.querySelector("#retry-status").textContent =
        `已处理 ${j.processed} 条，请查看同步状态。`;
      await loadLeads();
    } catch (err) {
      document.querySelector("#retry-status").textContent = err.message;
    } finally {
      e.target.disabled = false;
    }
  };
  document.querySelector("#logout").onclick = async () => {
    await api("/api/admin/logout", {});
    location.reload();
  };
}
async function boot() {
  try {
    config = await api("/api/config");
  } catch {}
  await render();
}
boot().catch(() => {
  app.textContent = "Spanler is temporarily unavailable. Please refresh.";
});
