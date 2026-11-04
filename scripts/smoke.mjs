import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:3001";
let cookie = "";
let count = 0;
async function req(path, data, method) {
  const headers = { Origin: base, ...(cookie ? { Cookie: cookie } : {}) };
  if (!(data instanceof FormData)) headers["Content-Type"] = "application/json";
  const r = await fetch(base + path, {
    method: method || (data === undefined ? "GET" : "POST"),
    headers,
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  return r;
}
const check = (name) => {
  console.log("PASS " + name);
  count++;
};
for (const language of ["zh", "en", "es"])
  for (const path of [
    "",
    "products/",
    "solutions/",
    "insights/",
    "partners/",
    "about/",
    "contact/",
    "privacy/",
    "cookies/",
  ]) {
    const r = await req(`/${language}/${path}`);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.match(text, /<h1/);
    assert.match(text, /rel="canonical"/);
  }
const root = await fetch(base + "/?utm_source=smoke", {
  redirect: "manual",
  headers: { "Accept-Language": "es-MX,es;q=0.9,en;q=0.5" },
});
assert.equal(root.status, 302);
assert.equal(root.headers.get("location"), "/es/?utm_source=smoke");
check(
  "27 multilingual routes, canonical metadata and browser-language redirect",
);
assert.equal((await req("/api/admin/leads")).status, 401);
check("unauthenticated lead access denied");
const vars = await readFile(".dev.vars", "utf8");
const password = vars.match(/^ADMIN_PASSWORD=(.+)$/m)[1];
const login = await req("/api/admin/login", { password });
assert.equal(login.status, 200);
cookie = login.headers.get("set-cookie").split(";")[0];
check("administrator secure session login");
const original = (await (await req("/api/content/about?lang=en")).json())
  .content;
try {
  const r = await req("/api/admin/content", {
    slug: "about",
    language: "en",
    ...original,
    title: "Smoke test published title",
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await (await req("/api/content/about?lang=en")).json()).content.title,
    "Smoke test published title",
  );
  check("database content publish is reflected by public API");
} finally {
  await req("/api/admin/content", {
    slug: "about",
    language: "en",
    ...original,
  });
}
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1kAAAAASUVORK5CYII=",
  "base64",
);
const form = new FormData();
form.set("file", new File([image], "smoke.png", { type: "image/png" }));
const upload = await req("/api/admin/media", form);
assert.equal(upload.status, 201);
const media = await upload.json();
const download = await req(media.url);
assert.equal(download.status, 200);
assert.deepEqual(Buffer.from(await download.arrayBuffer()), image);
const partial = await fetch(base + media.url, {
  headers: { Range: "bytes=0-7" },
});
assert.equal(partial.status, 206);
assert.equal((await partial.arrayBuffer()).byteLength, 8);
assert.equal((await fetch(base + media.url, { method: "HEAD" })).status, 200);
check("R2 upload, byte-for-byte delivery, range requests and HEAD");
const pdf = Buffer.from("%PDF-1.4\n% Spanler local smoke sample\n%%EOF");
const pdfForm = new FormData();
pdfForm.set("file", new File([pdf], "sample.pdf", { type: "application/pdf" }));
const pdfResponse = await req("/api/admin/media", pdfForm);
assert.equal(pdfResponse.status, 201);
const pdfMedia = await pdfResponse.json();
check("PDF media upload");
const bad = new FormData();
bad.set(
  "file",
  new File(["<script>alert(1)</script>"], "disguised.png", {
    type: "image/png",
  }),
);
assert.equal((await req("/api/admin/media", bad)).status, 400);
check("disguised executable media rejected");
assert.equal(
  (await req("/api/leads", { name: "Test", email: "invalid" })).status,
  400,
);
const lead = await req("/api/leads", {
  name: "Local smoke test",
  email: "smoke@example.test",
  company: "Test only",
  message: "Local integration validation; not a real customer.",
  business_type: "ai_sdr",
  language: "en",
  source_page: "/en/contact/",
  utm: { utm_source: "local-smoke" },
  consent: true,
});
assert.equal(lead.status, 201);
const id = (await lead.json()).id;
const leads = (await (await req("/api/admin/leads")).json()).leads;
assert(
  leads.some(
    (x) =>
      x.id === id && x.business_type === "ai_sdr" && x.crm_status === "pending",
  ),
);
check("lead persisted with business tag and pending integration status");
assert.equal(
  (await req("/api/chat", { message: "Hello", language: "en", consent: true }))
    .status,
  503,
);
check("AI disabled until credentials are configured");
assert.equal(
  (await req("/api/admin/media?id=" + media.id, {}, "DELETE")).status,
  200,
);
assert.equal(
  (await req("/api/admin/media?id=" + pdfMedia.id, {}, "DELETE")).status,
  200,
);
assert.equal((await req(media.url)).status, 404);
await req("/api/admin/logout", {});
cookie = "";
assert.equal((await req("/api/admin/session")).status, 401);
check("logout clears browser access");
console.log(
  `${count} checks passed. External integrations are NOT validated by this smoke test.`,
);
