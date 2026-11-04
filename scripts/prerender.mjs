import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import {
  languages,
  slugs,
  copy,
  defaultPage,
  insightCards,
} from "../shared/content.js";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const shell = await readFile("dist/index.html", "utf8");
const urls = [];
for (const language of languages)
  for (const slug of slugs) {
    const path = `/${language}/${slug === "home" ? "" : slug + "/"}`;
    const t = copy[language],
      p = defaultPage(slug, language);
    let body = `<header><a href="/${language}/">Spanler</a><nav>${t.nav.map((n, i) => `<a href="/${language}/${i ? slugs[i] + "/" : ""}">${escape(n)}</a>`).join(" ")}</nav></header><main class="section inner-hero"><h1>${escape(p.title).replaceAll("\n", "<br>")}</h1><p>${escape(p.description)}</p><p>${escape(p.body).replaceAll("\n", "<br>")}</p>`;
    if (["home", "products", "solutions"].includes(slug))
      body += `<section><h2>${t.aiTitle}</h2><p>${t.aiDesc}</p><h2>${t.lifeTitle}</h2><p>${t.lifeDesc}</p></section>`;
    if (["home", "insights"].includes(slug))
      body += insightCards[language]
        .map((c) => `<article><h2>${c[1]}</h2><p>${c[2]}</p></article>`)
        .join("");
    body += `<a href="/${language}/contact/">${t.nav[6]}</a></main>`;
    const meta = `<link rel="canonical" href="https://spanler.com${path}">${languages.map((l) => `<link rel="alternate" hreflang="${l === "zh" ? "zh-Hans" : l}" href="https://spanler.com/${l}/${slug === "home" ? "" : slug + "/"}">`).join("")}<link rel="alternate" hreflang="x-default" href="https://spanler.com/zh/${slug === "home" ? "" : slug + "/"}"><meta property="og:title" content="${escape(p.title.replaceAll("\n", " "))} · Spanler"><meta property="og:description" content="${escape(p.description)}"><meta property="og:type" content="website"><meta property="og:url" content="https://spanler.com${path}"><meta name="twitter:card" content="summary">`;
    const html = shell
      .replace(
        '<html lang="zh">',
        `<html lang="${language === "zh" ? "zh-Hans" : language}">`,
      )
      .replace(
        /<title>.*?<\/title>/,
        `<title>${escape(p.title.replaceAll("\n", " "))} · Spanler</title>`,
      )
      .replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${escape(p.description)}">`,
      )
      .replace("</head>", meta + "</head>")
      .replace('<div id="app"></div>', `<div id="app">${body}</div>`);
    await mkdir("dist" + path, { recursive: true });
    await writeFile("dist" + path + "index.html", html);
    urls.push("https://spanler.com" + path);
  }
await mkdir("dist/admin", { recursive: true });
await writeFile(
  "dist/admin/index.html",
  shell.replace(
    "</head>",
    '<meta name="robots" content="noindex,nofollow"></head>',
  ),
);
await writeFile(
  "dist/404.html",
  shell.replace("</head>", '<meta name="robots" content="noindex"></head>'),
);
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((loc) => `<url><loc>${loc}</loc></url>`).join("")}</urlset>`,
);
console.log(
  `Prerendered ${urls.length} public routes (7 core pages + privacy pages × 3 languages).`,
);

await cp("node_modules/@sveltia/cms/dist", "dist/vendor/sveltia", {
  recursive: true,
  filter: (p) => !p.endsWith(".map"),
});
