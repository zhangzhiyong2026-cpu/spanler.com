export async function onRequest({ request, env }) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405 });
  if (!env.MEDIA) return new Response("Media unavailable", { status: 503 });
  const key = decodeURIComponent(new URL(request.url).pathname.slice(7));
  if (!/^[a-f0-9-]+\/[a-zA-Z0-9._-]+$/.test(key))
    return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key, { range: request.headers });
  if (!object) return new Response("Not found", { status: 404 });
  const h = new Headers();
  object.writeHttpMetadata(h);
  h.set("ETag", object.httpEtag);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Cache-Control", "public,max-age=31536000,immutable");
  h.set("Accept-Ranges", "bytes");
  h.set("Content-Security-Policy", "default-src 'none'; sandbox");
  let status = 200;
  if (request.headers.has("Range") && object.range) {
    const start =
        object.range.offset ?? Math.max(0, object.size - object.range.suffix),
      length = object.range.length ?? object.range.suffix;
    h.set(
      "Content-Range",
      `bytes ${start}-${start + length - 1}/${object.size}`,
    );
    h.set("Content-Length", String(length));
    status = 206;
  } else h.set("Content-Length", String(object.size));
  return new Response(request.method === "HEAD" ? null : object.body, {
    status,
    headers: h,
  });
}
