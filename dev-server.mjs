// Local static file server for the site. Run alongside `npx wrangler dev`
// (which serves the Gemini proxy worker at http://127.0.0.1:8787) so the
// Design tab's AI flow works the same as it will in production.
//
// Usage:
//   node dev-server.mjs
//   Open http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
	const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
	const filePath = path.join(projectRoot, decodeURIComponent(urlPath));

	fs.readFile(filePath, (error, data) => {
		if (error) {
			res.writeHead(404);
			res.end("Not found");
			return;
		}

		const ext = path.extname(filePath);
		res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
		res.end(data);
	});
});

server.listen(PORT, () => {
	console.log(`Dev server running at http://localhost:${PORT}`);
	console.log("Run `npx wrangler dev` in another terminal to serve the Gemini proxy at http://127.0.0.1:8787");
});
