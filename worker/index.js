// Cloudflare Worker: proxies Gemini API calls so the API key stays server-side
// and never reaches the browser. The GitHub Pages site calls this worker
// instead of calling Gemini directly.
//
// Deploy:
//   1. npx wrangler secret put GEMINI_API_KEY
//   2. npx wrangler deploy
//
// Local dev:
//   1. Copy .dev.vars.example to .dev.vars and fill in GEMINI_API_KEY
//   2. npx wrangler dev   (serves at http://127.0.0.1:8787)

const ALLOWED_MODELS = new Set(["gemini-flash-latest", "gemini-2.5-flash-image"]);

// Origins allowed to call this worker. Add your GitHub Pages origin here.
const ALLOWED_ORIGINS = new Set(["https://thstjdndev-il.github.io", "http://localhost:3000", "http://127.0.0.1:3000"]);

function corsHeaders(origin) {
	return {
		"Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

export default {
	async fetch(request, env) {
		const origin = request.headers.get("Origin") || "";
		const headers = corsHeaders(origin);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers });
		}

		if (request.method !== "POST") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		if (!env.GEMINI_API_KEY) {
			return new Response(JSON.stringify({ error: "Server is missing GEMINI_API_KEY" }), {
				status: 500,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		let body;

		try {
			body = await request.json();
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
				status: 400,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		const { model, ...payload } = body || {};

		if (!ALLOWED_MODELS.has(model)) {
			return new Response(JSON.stringify({ error: "Model not allowed" }), {
				status: 400,
				headers: { ...headers, "Content-Type": "application/json" },
			});
		}

		const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const data = await upstream.text();

		return new Response(data, {
			status: upstream.status,
			headers: { ...headers, "Content-Type": "application/json" },
		});
	},
};
