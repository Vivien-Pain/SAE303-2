import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable);


export function enableZoomAndPan(svgElement, container) {
  if (!svgElement || !container) return;

  let state = { scale: 1, pX: 0, pY: 0, isDragging: false, sX: 0, sY: 0 };

  const view = container.querySelector(".viewport") || container;

  const shouldIgnore = (e) => {
    return e.target.closest(".panel-container") ||
      e.target.closest("aside") ||
      e.target.closest(".ui-layer") ||
      e.target.closest(".no-zoom") ||
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT";
  };

  const update = () => {
    svgElement.style.transform = `translate(${state.pX}px, ${state.pY}px) scale(${state.scale})`;
  };

  container.addEventListener("wheel", (e) => {
    if (shouldIgnore(e)) return;

    e.preventDefault();
    const s = Math.exp(e.deltaY * -0.001);
    state.scale = Math.min(Math.max(0.5, state.scale * s), 4);
    update();
  }, { passive: false });

  container.addEventListener("mousedown", (e) => {
    if (shouldIgnore(e)) return;

    state.isDragging = true;
    state.sX = e.clientX - state.pX;
    state.sY = e.clientY - state.pY;
    container.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!state.isDragging) return;
    e.preventDefault();
    state.pX = e.clientX - state.sX;
    state.pY = e.clientY - state.sY;
    update();
  });

  window.addEventListener("mouseup", () => {
    state.isDragging = false;
    container.style.cursor = "grab";
  });
}