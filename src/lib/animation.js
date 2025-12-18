// `src/lib/animation.js`
import { gsap } from 'gsap';
const GREY = '#6f7a84';

export function animateRamSegment(seg, lit, color, duration = 0.35) {
  const c = lit ? (color || '#00ff41') : GREY;
  gsap.to(seg, {
    duration,
    backgroundColor: c,
    fill: c,
    opacity: 1,
    ease: 'power1.out'
  });
}

export function animateFan(el, litCount = 0, total = 1, opts = {}) {
  if (!el) {
    console.error('[animateFan] Élément null/undefined');
    return;
  }

  let targets = el.querySelectorAll('[id^="pale"]');
  if (targets.length === 0) {
    console.warn('[animateFan] Aucune pale trouvée, abandon');
    return;
  }

  if (!el._fanInit) {
    const grandRond = el.querySelector('#GrandRond');
    gsap.set(targets, {
      transformOrigin: "center",
      svgOrigin: "383.75 1489.75"
    });

    el._fanInit = true;
  }

  const safeTotal = Math.max(1, total);
  const safeLit = Math.max(0, litCount);
  const ratio = Math.min(1, safeLit / safeTotal);

  const minDur = opts.minDuration || 1.5;
  const maxDur = opts.maxDuration || 5.0;
  const targetDuration = maxDur - (ratio * (maxDur - minDur));

  if (!el._fanTween) {
    el._fanTween = gsap.to(targets, {
      rotation: 360,
      duration: targetDuration,
      repeat: -1,
      ease: 'none',
      paused: true
    });
  }
  if (safeLit === 0) {
    if (el._fanTween.isActive()) {
      gsap.to(el._fanTween, {
        timeScale: 0,
        duration: 1.5,
        onComplete: () => el._fanTween.pause()
      });
    }
  } else {
    if (el._fanTween.paused() || el._fanTween.timeScale() === 0) {
      el._fanTween.play();
      gsap.to(el._fanTween, { timeScale: 1, duration: 0.5 });
    }
    if (Math.abs(el._fanTween.duration() - targetDuration) > 0.05) {
      el._fanTween.duration(targetDuration);
    }
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

/* Nouvelle fonction exportée pour gérer l'overlay de boot et la suppression */
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
