const stage = document.getElementById("stage");
const stageOuter = document.getElementById("stage-outer");
const STAGE_DESIGN_WIDTH = 1920;

// 사이트는 1920x1080 기준 고정 레이아웃으로 제작되어 있고, 반응형으로 재배치하지 않는다.
// 대신 실제 화면 크기에 맞춰 스테이지 전체를 확대/축소해서 항상 화면을 꽉 채운다.
// - Home/Design(고정 높이 한 화면 뷰): 화면을 완전히 덮도록 cover 방식으로 확대하고 넘치는 부분은 잘라낸다.
// - Background/Solution(세로로 긴 문서형 뷰): 가로 폭에 맞춰 확대하고 세로는 스크롤한다.
function updateStageScale() {
	const isScrollView = document.body.classList.contains("is-scroll-view");
	const naturalHeight = stage.scrollHeight;
	const scaleX = window.innerWidth / STAGE_DESIGN_WIDTH;

	if (isScrollView) {
		stage.style.transform = `scale(${scaleX})`;
		stageOuter.style.height = `${naturalHeight * scaleX}px`;
	} else {
		const scaleY = window.innerHeight / naturalHeight;
		const scale = Math.max(scaleX, scaleY);
		stage.style.transform = `scale(${scale})`;
		stageOuter.style.height = "";
	}
}

window.addEventListener("resize", updateStageScale);
updateStageScale();

const hand = document.querySelector(".hand");
const viewTriggers = document.querySelectorAll("[data-view]");
const pages = {
	home: document.querySelector(".home"),
	background: document.querySelector(".background-page"),
	solution: document.querySelector(".solution-page"),
	design: document.querySelector(".design-page"),
};

const designSteps = {
	1: document.querySelector(".design-step-1"),
	2: document.querySelector(".design-step-2"),
	3: document.querySelector(".design-step-3"),
	5: document.querySelector(".design-step-5"),
};
const designNameInput = document.querySelector(".design-name-input");
const designHint = document.querySelector(".design-hint");
const designNameValue = document.querySelector(".design-name-value");
const designTypewriter = document.querySelector(".design-typewriter");
const designComposeBox = document.querySelector(".design-compose-box");
const designRememberBtn = document.querySelector(".design-remember-btn");
const designLoadingOverlay = document.querySelector("#designLoadingOverlay");
const designReportImage = document.querySelector("#designReportImage");
const designReportDate = document.querySelector("#designReportDate");
const designReportTitle = document.querySelector("#designReportTitle");
const designReportText = document.querySelector("#designReportText");
const designReportTags = document.querySelector("#designReportTags");

const DESIGN_REVEAL_MS = 1400;
const DESIGN_HOLD_MS = 3000;
const DESIGN_NAME_MAX_LENGTH = 12;
const GEMINI_TEXT_MODEL = "gemini-flash-latest";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

let currentDesignStep = 1;
let designAdvanceTimer = null;

function goToDesignStep(step) {
	const current = designSteps[currentDesignStep];
	const next = designSteps[step];

	if (!next || next === current) {
		return;
	}

	next.hidden = false;
	next.classList.remove("is-leaving");
	void next.offsetWidth;
	next.classList.add("is-active");

	if (current) {
		current.classList.remove("is-active");
		current.classList.add("is-leaving");
		current.addEventListener(
			"transitionend",
			() => {
				current.hidden = true;
				current.classList.remove("is-leaving");
			},
			{ once: true }
		);
	}

	currentDesignStep = step;

	if (step === 2) {
		playDesignGreeting();
	}
}

function playDesignGreeting() {
	designTypewriter.classList.remove("is-revealed");
	void designTypewriter.offsetWidth;
	designTypewriter.classList.add("is-revealed");

	clearTimeout(designAdvanceTimer);
	designAdvanceTimer = setTimeout(() => {
		goToDesignStep(3);
	}, DESIGN_REVEAL_MS + DESIGN_HOLD_MS);
}

function resetDesignFlow() {
	clearTimeout(designAdvanceTimer);
	currentDesignStep = 1;
	designNameInput.textContent = "";
	designHint.textContent = "이름을 입력해주세요";
	designTypewriter.classList.remove("is-revealed");
	designComposeBox.textContent = "";
	designLoadingOverlay.classList.remove("is-visible");
	designReportImage.removeAttribute("src");
	designReportDate.textContent = "";
	designReportTitle.textContent = "";
	designReportText.textContent = "";
	designReportTags.innerHTML = "";

	Object.entries(designSteps).forEach(([key, step]) => {
		step.classList.remove("is-leaving");
		if (key === "1") {
			step.hidden = false;
			step.classList.add("is-active");
		} else {
			step.hidden = true;
			step.classList.remove("is-active");
		}
	});

	designNameInput.focus();
}

// GitHub Pages is static-only (no server to hide a key behind), so this key
// is called directly from the browser and is publicly visible in the page
// source to anyone who looks. Restrict it to the Generative Language API only
// and set a quota/budget alert on it in Google AI Studio.
const GEMINI_API_KEY = "AQ.Ab8RN6LWyqhWY-hScVnPpFoOsLxaUazLOdbH-5wvv_kW8vKP7w";

async function callGeminiApi(model, body) {
	const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data?.error?.message || `요청 실패 (${response.status})`);
	}

	return data;
}

async function generateDreamTitleAndTags(text) {
	const prompt = [
		"당신은 사용자의 꿈 일기를 분석해서 요약하는 어시스턴트입니다.",
		"아래는 사용자가 방금 꾼 꿈을 자유롭게 적은 기록입니다.",
		"이 내용은 현실이 아니라 '꿈'이므로 비논리적이거나 기이한 내용이라도 있는 그대로 받아들여서, 그 꿈 속에서 실제로 일어난 사건을 요약하세요.",
		"절대로 조언, 추천, 현실적인 해석을 하지 마세요.",
		"",
		"꿈 기록:",
		`"""${text}"""`,
		"",
		"다음 JSON 형식으로만 응답하세요 (다른 설명 금지):",
		'{"title": "꿈에서 벌어진 일을 그대로 요약한 한 줄 제목 (명사형으로 끝내기, 15~25자, 예: \'토끼로 변한 친구가 강아지를 안고 있는 꿈\')", "tags": ["꿈에 등장한 핵심 소재/인물/사물 단어 1", "핵심 소재 2", "핵심 소재 3"]}',
	].join("\n");

	const data = await callGeminiApi(GEMINI_TEXT_MODEL, {
		contents: [{ parts: [{ text: prompt }] }],
		generationConfig: { responseMimeType: "application/json" },
	});

	const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

	if (!raw) {
		throw new Error("제목 생성 응답이 비어있어요");
	}

	const parsed = JSON.parse(raw);

	return {
		title: parsed.title || "제목 없는 꿈",
		tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean).slice(0, 4) : [],
	};
}

const GEMINI_IMAGE_RETRY_ATTEMPTS = 3;

async function requestDreamImage(text) {
	const prompt = `다음 꿈 내용을 바탕으로, 몽환적이고 부드러운 파스텔톤의 일러스트를 그려주세요. 글자나 텍스트는 절대 포함하지 마세요.\n\n꿈 내용: ${text}`;

	const data = await callGeminiApi(GEMINI_IMAGE_MODEL, {
		contents: [{ parts: [{ text: prompt }] }],
	});

	const parts = data.candidates?.[0]?.content?.parts || [];
	const imagePart = parts.find((part) => part.inlineData);

	if (!imagePart) {
		throw new Error("이미지 데이터를 받지 못했어요");
	}

	return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

async function generateDreamImage(text) {
	let lastError;

	for (let attempt = 1; attempt <= GEMINI_IMAGE_RETRY_ATTEMPTS; attempt += 1) {
		try {
			return await requestDreamImage(text);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

function formatDesignDate(date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${month}${day}`;
}

async function startDreamReport() {
	const text = designComposeBox.textContent.trim();

	if (!text) {
		designComposeBox.focus();
		return;
	}

	designLoadingOverlay.classList.add("is-visible");

	try {
		const [textResult, imageDataUrl] = await Promise.all([generateDreamTitleAndTags(text), generateDreamImage(text)]);

		designReportDate.textContent = formatDesignDate(new Date());
		designReportTitle.textContent = textResult.title;
		designReportText.textContent = text;
		designReportTags.innerHTML = "";

		textResult.tags.forEach((tag) => {
			const tagEl = document.createElement("span");
			tagEl.className = "design-report-tag";
			tagEl.textContent = tag;
			designReportTags.appendChild(tagEl);
		});

		designReportImage.src = imageDataUrl;

		designLoadingOverlay.classList.remove("is-visible");
		goToDesignStep(5);
	} catch (error) {
		console.error(error);
		designLoadingOverlay.classList.remove("is-visible");
		window.alert(`꿈을 정리하는 중 문제가 발생했어요.\n${error.message}`);
	}
}

designRememberBtn.addEventListener("click", startDreamReport);

designNameInput.addEventListener("input", () => {
	if (designNameInput.textContent.length > DESIGN_NAME_MAX_LENGTH) {
		designNameInput.textContent = designNameInput.textContent.slice(0, DESIGN_NAME_MAX_LENGTH);
		placeCaretAtEnd(designNameInput);
	}

	designHint.textContent = designNameInput.textContent.trim() ? "엔터를 쳐주세요" : "이름을 입력해주세요";
});

designNameInput.addEventListener("paste", (event) => {
	event.preventDefault();
	const text = (event.clipboardData || window.clipboardData).getData("text").replace(/\s/g, "");
	document.execCommand("insertText", false, text);
});

designNameInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		const name = designNameInput.textContent.trim();

		if (name) {
			designNameValue.textContent = name;
			goToDesignStep(2);
		}
	}
});

function placeCaretAtEnd(el) {
	const range = document.createRange();
	const selection = window.getSelection();
	range.selectNodeContents(el);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
}

function setView(view) {
	if (!pages[view]) {
		return;
	}

	clearTimeout(designAdvanceTimer);

	const isHome = view === "home";
	const isScrollView = view === "background" || view === "solution";

	Object.entries(pages).forEach(([key, page]) => {
		page.hidden = key !== view;
	});
	document.body.classList.toggle("is-scroll-view", isScrollView);

	if (view === "design") {
		resetDesignFlow();
	}

	if (isHome) {
		hand.style.transform = "none";
	} else {
		window.scrollTo(0, 0);
	}

	updateStageScale();
}

viewTriggers.forEach((trigger) => {
	trigger.addEventListener("click", (event) => {
		const view = trigger.dataset.view;

		if (!view) {
			return;
		}

		event.preventDefault();
		setView(view);
	});
});

document.querySelectorAll(".background-card-head").forEach((head) => {
	function toggle() {
		const expanded = head.getAttribute("aria-expanded") === "true";
		head.setAttribute("aria-expanded", String(!expanded));
	}

	head.addEventListener("click", toggle);
	head.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			toggle();
		}
	});
});

window.addEventListener(
	"wheel",
	(event) => {
		if (!hand || pages.home.hidden || event.deltaY === 0) {
			return;
		}

		event.preventDefault();
		const direction = event.deltaY > 0 ? 1 : -1;
		hand.style.transform = `translateY(${direction * 20}px)`;
	},
	{ passive: false }
);
