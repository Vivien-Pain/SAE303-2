// javascript
import { gsap } from 'gsap';

const GREY = '#6f7a84';

// Récupère shapes dans un élément (ou l'élément lui‑même s'il est une shape)
function getShapes(el) {
  const shapes = Array.from(el?.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line') || []);
  if (!shapes.length && el && /path|rect|circle|line/i.test(el.tagName)) return [el];
  return shapes;
}

// Anime un élément (éléments SVG) : couleur, opacité, stroke pour câbles vs éléments
export function animateShape(el, color, prog = 0, isCable = false, duration = 0.45) {
  if (!el) return;
  const done = prog >= 100;
  const dColor = prog > 0 || done ? (color || GREY) : GREY;
  const shapes = getShapes(el);

  if (isCable) {
    gsap.to(shapes, {
      duration,
      stroke: prog > 0 ? dColor : GREY,
      strokeOpacity: done ? 1 : (prog > 0 ? 0.75 : 0.6),
      opacity: done ? 1 : (prog > 0 ? 0.85 : 0.9),
      ease: 'power1.out'
    });
    // mise à jour de la variable CSS pour utilisation dans le style
    gsap.to(el, { duration, css: { '--wiring-color': dColor }, ease: 'power1.out' });
  } else {
    gsap.to(shapes, {
      duration,
      fill: (done || prog > 0) ? dColor : '',
      stroke: done ? '' : (prog > 0 ? dColor : GREY),
      opacity: done ? 1 : (prog > 0 ? 0.6 : 1),
      ease: 'power1.out'
    });
  }
}

// Animer un segment de RAM (élément DOM non‑SVG) : background / fill
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
