// Vercel Edge Function: proxies Gemini API calls so the API key stays server-side
// and never reaches the browser. Set GEMINI_API_KEY in the Vercel project's
// environment variables (Settings -> Environment Variables).
export const config = { runtime: "edge" };

const ALLOWED_MODELS = new Set(["gemini-flash-latest", "gemini-2.5-flash-image"]);

export default async function handler(req) {
	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		return new Response(JSON.stringify({ error: "Server is missing GEMINI_API_KEY" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	let body;

	try {
		body = await req.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const { model, ...payload } = body || {};

	if (!ALLOWED_MODELS.has(model)) {
		return new Response(JSON.stringify({ error: "Model not allowed" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const data = await upstream.text();

	return new Response(data, {
		status: upstream.status,
		headers: { "Content-Type": "application/json" },
	});
}
