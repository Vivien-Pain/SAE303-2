import { gsap } from 'gsap';
export function animateFan(el, litCount = 0, total = 1, opts = {}) {
  if (!el) return;
  const targets = el.querySelectorAll('[id^="pale"]');
  if (!targets.length) return;

  if (!el._fanInit) {
    gsap.set(targets, { transformOrigin: "center", svgOrigin: "383.75 1489.75" });
    el._fanInit = true;
  }

  const safeTotal = Math.max(1, total);
  const ratio = Math.min(1, Math.max(0, litCount) / safeTotal);

  const config = {
    baseDuration: opts.baseDuration ?? 2,
    maxSpeed: opts.maxSpeed ?? 4,
    accelPower: opts.accelPower ?? 2
  };

  const targetTimeScale = Math.pow(ratio, config.accelPower) * config.maxSpeed;

  if (!el._fanTween) {
    el._fanTween = gsap.to(targets, {
      rotation: 360,
      duration: config.baseDuration,
      repeat: -1,
      ease: "none",
      paused: true
    });
  }

  if (litCount === 0) {
    gsap.to(el._fanTween, { timeScale: 0, duration: 1, onComplete: () => el._fanTween.pause() });
  } else {
    el._fanTween.play();
    gsap.to(el._fanTween, { timeScale: Math.max(0.1, targetTimeScale), duration: 0.4, ease: "power2.out" });
  }
}

export function animateNodeSelect(element) {
  if (!element) return;
  gsap.fromTo(element,
    { scale: 1 },
    { scale: 1.15, duration: 0.4, ease: "elastic.out(1, 0.5)", yoyo: true, repeat: 1 }
  );
}

export function animatePanelOpen(domParts) {
  const elementsToAnimate = [domParts.header, domParts.display, domParts.controls].filter(el => el && el.style.display !== 'none');

  gsap.fromTo(elementsToAnimate,
    { opacity: 0, x: 20 },
    { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out", clearProps: "transform" }
  );
}

export function animateSaveFeedback(btn, successColor) {
  if (!btn) return;
  const originalText = btn.innerText;
  const originalColor = btn.style.color;

  const tl = gsap.timeline();

  tl.to(btn, {
    backgroundColor: successColor,
    color: "#000",
    scale: 1.05,
    duration: 0.1,
    onStart: () => { btn.innerText = "SAVED"; }
  })
    .to(btn, {
      backgroundColor: "transparent",
      color: originalColor || successColor,
      scale: 1,
      duration: 0.3,
      delay: 0.5,
      onComplete: () => { btn.innerText = originalText; }
    });
}

export function animateHistoryTimeline(listElement) {
  if (!listElement) return;

  const line = listElement.querySelector('.timeline-line');
  const items = listElement.querySelectorAll('.history-item');

  const tl = gsap.timeline();

  if (line) {
    tl.fromTo(line,
      { scaleY: 0 },
      { scaleY: 1, duration: 0.6, ease: "power2.inOut", transformOrigin: "top" }
    );
  }

  if (items.length) {
    tl.fromTo(items,
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: "back.out(1.2)", clearProps: "transform" },
      "-=0.4"
    );
  }
}

export function animateNewHistoryEntry(itemElement) {
  if (!itemElement) return;

  gsap.fromTo(itemElement,
    { height: 0, opacity: 0, x: -20, marginBottom: 0, backgroundColor: "rgba(255,255,255,0.2)" },
    {
      height: "auto",
      opacity: 1,
      x: 0,
      marginBottom: "12px",
      backgroundColor: "transparent",
      duration: 0.6,
      ease: "power3.out",
      clearProps: "backgroundColor, height, transform"
    }
  );
}

export function typeWriter(element, text, speed = 20) {
  return new Promise((resolve) => {
    let i = 0;
    element.innerHTML = "";
    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }
    type();
  });
}

export function bootSequence(container) {
  const lines = [
    "> INITIALIZING SYSTEM...",
    "> LOADING KERNEL...",
    "> CHECKING MEMORY... OK",
    "> LOADING ASSETS...",
    "> INITIALIZING MMI MODULE...",
    "> SYSTEM READY."
  ];

  return async () => {
    for (const line of lines) {
      const p = document.createElement('p');
      p.style.margin = "2px 0";
      container.appendChild(p);
      await typeWriter(p, line, 30);
    }
  };
}

export async function startBootSequence(rootPage, opts = {}) {
  if (!rootPage) return;
  const bootOverlay = rootPage.querySelector('.boot-screen');
  const logContainer = rootPage.querySelector('#boot-log');

  if (!bootOverlay || !logContainer) return;

  await bootSequence(logContainer)();

  return new Promise((resolve) => {
    gsap.to(bootOverlay, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        bootOverlay.remove();
        try {
          const saved = localStorage.getItem("parcours");
          if (!saved && typeof opts.showSelector === 'function') {
            opts.showSelector();
          }
        } catch (e) {}
        resolve();
      }
    });
  });
}