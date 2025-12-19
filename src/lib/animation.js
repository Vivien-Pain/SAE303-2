import { gsap } from 'gsap';

export function animateFan(el, litCount = 0, total = 1, opts = {}) {
  if (!el) return;

  const targets = el.querySelectorAll('[id^="pale"]');
  if (!targets.length) return;

  if (!el._fanInit) {
    gsap.set(targets, {
      transformOrigin: "center",
      svgOrigin: "383.75 1489.75"
    });
    el._fanInit = true;
  }
  const safeTotal = Math.max(1, total);
  const safeLit = Math.max(0, litCount);
  const ratio = Math.min(1, safeLit / safeTotal);
  const baseDuration = opts.baseDuration ?? 2;
  const maxSpeed = opts.maxSpeed ?? 4;
  const accelPower = opts.accelPower ?? 2;
  const adjRatio = Math.pow(ratio, accelPower);
  const targetTimeScale = adjRatio * maxSpeed;

  if (!el._fanTween) {
    el._fanTween = gsap.to(targets, {
      rotation: 360,
      duration: baseDuration,
      repeat: -1,
      ease: "none",
      paused: true
    });
  }

  if (safeLit === 0) {
    gsap.to(el._fanTween, {
      timeScale: 0,
      duration: 1,
      onComplete: () => el._fanTween.pause()
    });
  }
  else {
    el._fanTween.play();
    gsap.to(el._fanTween, {
      timeScale: Math.max(0.1, targetTimeScale),
      duration: 0.4,
      ease: "power2.out"
    });
  }
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

  const runBoot = bootSequence(logContainer);
  await runBoot();

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
