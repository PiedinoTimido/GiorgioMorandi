const presentationRoot = document.getElementById("presentation");
let slides = [];
const counter = document.getElementById("slide-counter");

let currentIndex = 0;
let zoomOpen = false;
let opereAudio = null;
let opereAudioSource = "";
let sharedOpereAudioSource = "";
let touchStartX = 0;
let touchEndX = 0;

const zoomOverlay = document.createElement("div");
zoomOverlay.id = "image-zoom-overlay";
zoomOverlay.setAttribute("aria-hidden", "true");

const zoomedImage = document.createElement("img");
zoomedImage.alt = "Immagine ingrandita";
zoomOverlay.appendChild(zoomedImage);
document.body.appendChild(zoomOverlay);

const audioToggleButton = document.createElement("button");
audioToggleButton.id = "opere-audio-toggle";
audioToggleButton.type = "button";
audioToggleButton.hidden = true;
audioToggleButton.textContent = "🔊 Audio ON";
document.body.appendChild(audioToggleButton);

function openImageZoom(imageElement) {
	zoomedImage.src = imageElement.currentSrc || imageElement.src;
	zoomedImage.alt = imageElement.alt || "Immagine ingrandita";
	zoomOverlay.classList.add("open");
	zoomOverlay.setAttribute("aria-hidden", "false");
	zoomOpen = true;
}

function closeImageZoom() {
	zoomOverlay.classList.remove("open");
	zoomOverlay.setAttribute("aria-hidden", "true");
	zoomedImage.removeAttribute("src");
	zoomOpen = false;
}

function getAudioSourceForOpereSlide(slide) {
	if (!slide) {
		return "";
	}

	const explicitSource = slide.dataset.audio || slide.dataset.music;
	if (explicitSource) {
		return explicitSource;
	}

	const candidateLink = Array.from(slide.querySelectorAll("a[href]")).find((link) => {
		return /\.(mp3|ogg|wav|m4a|aac)(\?|#|$)/i.test(link.href);
	});

	return candidateLink ? candidateLink.href : "";
}

function refreshSharedOpereAudioSource() {
	const firstSource = slides
		.filter((slide) => slide.classList.contains("opere"))
		.map((slide) => getAudioSourceForOpereSlide(slide))
		.find((source) => Boolean(source));

	sharedOpereAudioSource = firstSource || "";
}

function updateAudioToggleButton() {
	if (!opereAudio || !opereAudioSource) {
		audioToggleButton.textContent = "🔇 Audio non disponibile";
		audioToggleButton.disabled = true;
		return;
	}

	audioToggleButton.disabled = false;
	audioToggleButton.textContent = opereAudio.muted ? "🔇 Audio OFF" : "🔊 Audio ON";
}

function syncOpereAudio(activeSlide) {
	const isOpereSlide = Boolean(activeSlide && activeSlide.classList.contains("opere"));
	audioToggleButton.hidden = !isOpereSlide;

	if (!isOpereSlide) {
		if (opereAudio) {
			opereAudio.pause();
		}
		return;
	}

	const localSource = getAudioSourceForOpereSlide(activeSlide);
	const audioSource = localSource || sharedOpereAudioSource;

	if (!audioSource) {
		if (opereAudio) {
			opereAudio.pause();
		}
		opereAudioSource = "";
		updateAudioToggleButton();
		return;
	}

	if (localSource) {
		sharedOpereAudioSource = localSource;
	}

	const normalizedSource = new URL(audioSource, window.location.href).href;

	if (!opereAudio) {
		opereAudio = new Audio();
		opereAudio.loop = true;
		opereAudio.preload = "auto";
	}

	if (opereAudioSource !== normalizedSource) {
		opereAudio.pause();
		opereAudio.src = normalizedSource;
		opereAudioSource = normalizedSource;
		opereAudio.currentTime = 0;
	}

	updateAudioToggleButton();
	opereAudio.play().catch(() => {
		updateAudioToggleButton();
	});
}

function structureSlide(slide) {
	if (slide.classList.contains("slide-ready")) {
		return;
	}

	const title = document.createElement("div");
	title.className = "slide-title";

	const content = document.createElement("div");
	content.className = "slide-content";

	const textArea = document.createElement("div");
	textArea.className = "slide-text";

	const mediaArea = document.createElement("div");
	mediaArea.className = "slide-media";

	const heading = slide.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6");
	const originalChildren = Array.from(slide.children);

	if (heading) {
		title.appendChild(heading);
	}

	originalChildren.forEach((element) => {
		if (element === heading) {
			return;
		}

		if (element.matches("img, figure")) {
			mediaArea.appendChild(element);
			return;
		}

		textArea.appendChild(element);
	});

	const hasImage = mediaArea.children.length > 0;
	slide.replaceChildren(title, content);
	content.appendChild(textArea);

	if (hasImage) {
		slide.classList.add("has-image");
		content.appendChild(mediaArea);
	} else {
		slide.classList.remove("has-image");
	}

	slide.classList.add("slide-ready");
}

function fitSlideText(slide) {
	const textArea = slide.querySelector(".slide-text");
	if (!textArea) {
		return;
	}

	const maxFontSize = slide.classList.contains("has-image") ? 27 : 33;
	const minFontSize = 12;
	const step = 0.5;

	let currentFontSize = maxFontSize;
	textArea.style.fontSize = `${currentFontSize}px`;

	while (currentFontSize > minFontSize && textArea.scrollHeight > textArea.clientHeight) {
		currentFontSize -= step;
		textArea.style.fontSize = `${currentFontSize}px`;
	}
}

function refreshSlides() {
	if (!presentationRoot) {
		slides = [];
		return;
	}

	slides = Array.from(presentationRoot.querySelectorAll(":scope > div"));
	slides.forEach((slide) => {
		structureSlide(slide);
		fitSlideText(slide);
	});

	refreshSharedOpereAudioSource();

	if (slides.length === 0) {
		currentIndex = 0;
		if (counter) {
			counter.textContent = "0 / 0";
		}
		return;
	}

	if (currentIndex >= slides.length) {
		currentIndex = slides.length - 1;
	}
}

function renderSlide() {
	slides.forEach((slide, index) => {
		slide.classList.toggle("active", index === currentIndex);
	});

	syncOpereAudio(slides[currentIndex]);

	if (counter) {
		counter.textContent = `${currentIndex + 1} / ${slides.length}`;
	}
}

function goToSlide(index) {
	if (index < 0 || index >= slides.length) {
		return;
	}
	currentIndex = index;
	fitSlideText(slides[currentIndex]);
	renderSlide();
}

function nextSlide() {
	goToSlide(currentIndex + 1);
}

function prevSlide() {
	goToSlide(currentIndex - 1);
}

document.addEventListener("keydown", (event) => {
	if (zoomOpen && event.key === "Escape") {
		event.preventDefault();
		closeImageZoom();
		return;
	}

	if (zoomOpen) {
		return;
	}

	const nextKeys = ["ArrowRight", "ArrowDown"];
	const prevKeys = ["ArrowLeft", "ArrowUp"];

	if (nextKeys.includes(event.key)) {
		event.preventDefault();
		nextSlide();
	}

	if (prevKeys.includes(event.key)) {
		event.preventDefault();
		prevSlide();
	}
});

document.addEventListener("click", (event) => {
	if (zoomOpen) {
		return;
	}

	const clickedImage = event.target.closest("#presentation img");
	if (clickedImage) {
		event.preventDefault();
		event.stopPropagation();
		openImageZoom(clickedImage);
		return;
	}
});

zoomOverlay.addEventListener("click", closeImageZoom);

document.addEventListener("touchstart", (event) => {
	touchStartX = event.changedTouches[0].clientX;
}, false);

document.addEventListener("touchend", (event) => {
	if (zoomOpen) {
		return;
	}

	touchEndX = event.changedTouches[0].clientX;
	const swipeDistance = touchStartX - touchEndX;
	const minSwipeDistance = 50;

	if (Math.abs(swipeDistance) < minSwipeDistance) {
		return;
	}

	if (swipeDistance > 0) {
		nextSlide();
	} else {
		prevSlide();
	}
}, false);

audioToggleButton.addEventListener("click", () => {
	if (!opereAudio || !opereAudioSource) {
		return;
	}

	opereAudio.muted = !opereAudio.muted;
	updateAudioToggleButton();
});

if (presentationRoot) {
	const observer = new MutationObserver(() => {
		const oldLength = slides.length;
		refreshSlides();
		renderSlide();

		if (slides.length !== oldLength && counter) {
			counter.textContent = `${currentIndex + 1} / ${slides.length}`;
		}
	});

	observer.observe(presentationRoot, { childList: true });
}

window.addEventListener("resize", () => {
	slides.forEach((slide) => fitSlideText(slide));
});

refreshSlides();
renderSlide();
