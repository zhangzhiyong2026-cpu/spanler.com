export function onRequest({ request }) {
  const url = new URL(request.url);
  const langs = (request.headers.get("Accept-Language") || "zh")
    .split(",")
    .map((s) => {
      const [tag, q] = s.trim().split(";q=");
      return { tag: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const lang =
    langs.find((x) => ["zh", "en", "es"].includes(x.tag) && x.q > 0)?.tag ||
    "en";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${lang}/${url.search}`,
      "Cache-Control": "private,no-store",
      Vary: "Accept-Language",
    },
  });
}
