// Local dev server: serves the static site and runs api/gemini.js as a real
// endpoint, so the Design tab's AI flow works the same as it will on Vercel.
//
// Usage:
//   1. Copy .env.local.example to .env.local and fill in GEMINI_API_KEY
//   2. node dev-server.mjs
//   3. Open http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

function loadEnvLocal() {
	const envPath = path.join(projectRoot, ".env.local");

	if (!fs.existsSync(envPath)) {
		return;
	}

	const lines = fs.readFileSync(envPath, "utf8").split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const eq = trimmed.indexOf("=");

		if (eq === -1) {
			continue;
		}

		const key = trimmed.slice(0, eq).trim();
		const value = trimmed.slice(eq + 1).trim();

		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}

loadEnvLocal();

if (!process.env.GEMINI_API_KEY) {
	console.warn("Warning: GEMINI_API_KEY is not set. Copy .env.local.example to .env.local and fill it in, or the Design tab's AI step will fail.");
}

const { default: geminiHandler } = await import(pathToFileURL(path.join(projectRoot, "api/gemini.js")).href);

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

const server = http.createServer(async (req, res) => {
	if (req.url.startsWith("/api/gemini")) {
		const chunks = [];

		for await (const chunk of req) {
			chunks.push(chunk);
		}

		const fetchRequest = new Request("http://localhost/api/gemini", {
			method: req.method,
			headers: { "Content-Type": "application/json" },
			body: chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined,
		});

		try {
			const fetchResponse = await geminiHandler(fetchRequest);
			const text = await fetchResponse.text();
			res.writeHead(fetchResponse.status, { "Content-Type": "application/json" });
			res.end(text);
		} catch (error) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: String(error) }));
		}

		return;
	}

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
});
