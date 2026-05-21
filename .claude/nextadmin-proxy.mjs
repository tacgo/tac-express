// Minimal forward proxy for demo.nextadmin.co so Claude Preview can audit it
// under a same-origin localhost view. Used for one-off design audits only.
import http from "node:http";
import { Readable } from "node:stream";

const ORIGIN = "https://demo.nextadmin.co";

const server = http.createServer(async (req, res) => {
  try {
    const upstream = new URL(req.url, ORIGIN);
    upstream.protocol = "https:";
    upstream.host = "demo.nextadmin.co";
    const fwd = await fetch(upstream.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "accept":
          req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    res.statusCode = fwd.status;
    const contentType = fwd.headers.get("content-type") || "application/octet-stream";
    res.setHeader("content-type", contentType);
    if (contentType.includes("text/html")) {
      let html = await fwd.text();
      html = html
        .replace(/https?:\/\/demo\.nextadmin\.co/gi, "")
        .replace(/<head>/i, '<head><base href="/">');
      res.end(html);
    } else if (contentType.startsWith("text/") || contentType.includes("javascript") || contentType.includes("json") || contentType.includes("svg")) {
      const text = await fwd.text();
      res.end(text);
    } else {
      if (fwd.body) Readable.fromWeb(fwd.body).pipe(res); else res.end();
    }
  } catch (err) {
    res.statusCode = 502;
    res.setHeader("content-type", "text/plain");
    res.end("proxy error: " + (err?.message || err));
  }
});

const PORT = Number(process.env.PORT || 8765);
server.listen(PORT, () => console.log(`nextadmin proxy on http://localhost:${PORT}`));
