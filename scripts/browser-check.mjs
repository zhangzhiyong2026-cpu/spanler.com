import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3001";
const testUrl = new URL(base);
if (!["localhost", "127.0.0.1"].includes(testUrl.hostname) || testUrl.protocol !== "http:") {
  throw new Error("Mutation smoke tests only support a local HTTP test server.");
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/zh/");
await page.locator(".hero").waitFor();
await page.locator('[data-cookie="denied"]').click();
await mkdir("test-results", { recursive: true });
await page.screenshot({
  path: "test-results/home-desktop.png",
  fullPage: true,
});
assert.equal(await page.locator("h1").count(), 1);
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.selectOption("#language", "en");
await page.waitForURL("**/en/");
await page.locator(".hero").waitFor();
assert.match(await page.locator("h1").textContent(), /next chapter/);
await page.locator("#chat-toggle").click();
await page.locator("#chat-consent").check();
await page.fill("#chat-input", "Can I book a demo?");
await page.locator("#chat-form button").click();
await page
  .getByText(
    "The AI assistant is not available yet. Please use our contact form.",
  )
  .waitFor();
console.log(
  "PASS desktop navigation, language switching, consent and unavailable-AI fallback",
);
await page.goto(base + "/admin/");
await page.locator("#login-form").waitFor();
const vars = await readFile(".dev.vars", "utf8");
await page.fill(
  "input[name=password]",
  vars.match(/^ADMIN_PASSWORD=(.+)$/m)[1],
);
await page.locator("#login-form button").click();
await page.locator("#editor").waitFor();
await page.selectOption("#editor select[name=slug]", "about");
await page.selectOption("#editor select[name=language]", "en");
await page.waitForTimeout(300);
const original = (
  await (await page.request.get(base + "/api/content/about?lang=en")).json()
).content;
await page
  .locator("#upload input[type=file]")
  .setInputFiles({
    name: "browser-media.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1kAAAAASUVORK5CYII=",
      "base64",
    ),
  });
await page.locator("#upload button").click();
await page.getByText("上传成功。", { exact: true }).waitFor();
const item = page
  .locator(".media-item")
  .filter({
    has: page.getByRole("link", { name: "browser-media.png", exact: true }),
  })
  .first();
await item.getByRole("button", { name: "插入当前页面" }).click();
await page.fill(
  "#editor textarea[name=title]",
  "A verified connection across borders.",
);
await page.locator("#editor button").click();
await page.getByText("已发布。打开或刷新前台即可看到最新内容。").waitFor();
const viewer = await browser.newPage();
await viewer.goto(base + "/en/about/");
await viewer
  .getByRole("heading", {
    name: "A verified connection across borders.",
    exact: true,
  })
  .waitFor();
await viewer.locator("img.content-media").waitFor();
assert.equal(
  await viewer
    .locator("img.content-media")
    .evaluate((img) => img.complete && img.naturalWidth === 1),
  true,
);
await page.request.post(base + "/api/admin/content", {
  data: { slug: "about", language: "en", ...original },
});
await page.waitForTimeout(250);
await page.screenshot({
  path: "test-results/admin-desktop.png",
  fullPage: true,
});
console.log(
  "PASS browser login → upload/insert media + edit content → publish → public page updates",
);
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(base + "/zh/");
await mobile.locator(".hero").waitFor();
await mobile.locator('[data-cookie="denied"]').click();
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
);
await mobile.locator(".menu-toggle").click();
await mobile.locator("#navigation a").last().click();
await mobile.waitForURL("**/zh/contact/");
await mobile.locator("#lead-form").waitFor();
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
);
await mobile.fill("input[name=name]", "Browser validation");
await mobile.fill("input[name=email]", "browser@example.test");
await mobile.fill("textarea[name=message]", "Local browser smoke test only.");
await mobile.check("input[name=consent]");
await mobile.locator("#lead-form button[type=submit]").click();
await mobile.getByText("咨询已收到。团队将通过你提供的邮箱联系你。").waitFor();
await mobile.screenshot({
  path: "test-results/contact-mobile.png",
  fullPage: true,
});
console.log("PASS mobile layout, menu and contact form submission");
await page.goto(base + "/admin/git/");
await page.waitForTimeout(2500);
await page.screenshot({ path: "test-results/sveltia.png", fullPage: true });
console.log(
  "Sveltia visible text:",
  (await page.locator("body").innerText()).slice(0, 350),
);
assert.deepEqual(errors, []);
console.log("PASS no browser JavaScript exceptions");
await browser.close();
