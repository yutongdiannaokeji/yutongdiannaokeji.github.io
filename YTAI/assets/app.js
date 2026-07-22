(() => {
  const DOWNLOADS = {
    android: "https://pub-5d19ea8d9a094a03840b7d49b7628fe1.r2.dev/releases/yt-ai-android-v18-f16-arm64.apk",
    gguf: "https://pub-5d19ea8d9a094a03840b7d49b7628fe1.r2.dev/releases/yt-ai-v14-f16.gguf",
  };

  const root = document.documentElement;
  const searchParams = new URLSearchParams(location.search);
  const hashTarget = ["#top", "#work", "#download"].includes(location.hash) ? location.hash : "";
  const initialTarget = hashTarget || (searchParams.get("view") === "download" ? "#download" : "");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toast = document.getElementById("toast");
  let frame = 0;
  let toastTimer = 0;

  function updateScrollEffects() {
    frame = 0;
    const y = window.scrollY;
    const height = Math.max(window.innerHeight, 1);
    const max = Math.max(root.scrollHeight - height, 1);
    const heroProgress = Math.min(Math.max(y / height, 0), 1);
    root.style.setProperty("--hero-progress", heroProgress.toFixed(4));
    root.style.setProperty("--page-progress", `${Math.min((y / max) * 100, 100)}%`);
    root.classList.toggle("past-hero", y > height * 0.72);

    if (!reducedMotion) {
      document.querySelectorAll("[data-parallax]").forEach((image) => {
        const rect = image.parentElement.getBoundingClientRect();
        const progress = (height - rect.top) / (height + rect.height);
        const shift = (Math.min(Math.max(progress, 0), 1) - 0.5) * 9;
        image.style.setProperty("--scene-shift", `${shift.toFixed(2)}%`);
      });
    }
  }

  function requestUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updateScrollEffects);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function startDownload(url, message) {
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(message);
  }

  document.querySelectorAll("[data-reveal]").forEach((element) => {
    if (reducedMotion) {
      element.classList.add("is-visible");
      return;
    }
    new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 }).observe(element);
  });

  document.querySelectorAll("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      const format = button.dataset.format;
      if (format === "android") return startDownload(DOWNLOADS.android, "APK 开始下载");
      if (format === "gguf") return startDownload(DOWNLOADS.gguf, "GGUF 模型开始下载");
      document.getElementById(`${format}-panel`)?.showModal();
    });
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.getElementById("copy-command")?.addEventListener("click", async () => {
    const command = "ollama create yt-ai -f Modelfile";
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(command);
    } else {
      const input = document.createElement("textarea");
      input.value = command;
      input.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    showToast("命令已复制");
  });

  const requestedPanel = searchParams.get("panel");
  if (requestedPanel === "ollama" || requestedPanel === "pocketpal") {
    document.getElementById(`${requestedPanel}-panel`)?.showModal();
  }

  if (initialTarget) {
    document.querySelector(initialTarget)?.scrollIntoView({ behavior: "auto" });
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.addEventListener("pageshow", () => {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    });
  }

  updateScrollEffects();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
})();
