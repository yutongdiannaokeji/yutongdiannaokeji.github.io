const revealNodes = [...document.querySelectorAll(".reveal")];

const isInitiallyVisible = (node) => {
  const rect = node.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.16, rootMargin: "0px 0px -60px 0px" },
);

for (const node of revealNodes) {
  if (isInitiallyVisible(node)) {
    node.classList.add("in-view");
  } else {
    revealObserver.observe(node);
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion) {
  const depthNodes = [...document.querySelectorAll("[data-depth]")];
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );

  const tick = () => {
    currentX += (pointerX - currentX) * 0.08;
    currentY += (pointerY - currentY) * 0.08;

    for (const node of depthNodes) {
      const depth = Number(node.dataset.depth || 0);
      node.style.setProperty("--parallax-x", `${currentX * depth}px`);
      node.style.setProperty("--parallax-y", `${currentY * depth}px`);
      node.style.transform = `translate3d(var(--parallax-x), var(--parallax-y), 0)`;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate3d(${x * 0.08}px, ${y * 0.12}px, 0)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

const topbar = document.querySelector(".topbar");
let lastScrollY = window.scrollY;

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    topbar.style.boxShadow =
      y > 24 ? "0 18px 54px rgba(52, 70, 120, 0.18)" : "0 18px 50px rgba(52, 70, 120, 0.13)";
    topbar.style.transform = `translateX(-50%) translateY(${y > lastScrollY && y > 260 ? "-88px" : "0"})`;
    lastScrollY = y;
  },
  { passive: true },
);
