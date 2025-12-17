// javascript
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable);


export function enableZoomAndPan(svgElement, container) {
  if (!svgElement || !container) return;

  // Configuration initiale
  let state = { scale: 1, pX: 0, pY: 0, isDragging: false, sX: 0, sY: 0 };

  // Si le container n'est pas la viewport, on essaie de la trouver, sinon on utilise le container
  const view = container.querySelector(".viewport") || container;

  // Fonction pour vérifier si on doit ignorer l'événement
  // (Si on clique/scroll sur un élément d'interface, on ne veut pas zoomer)
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

  // --- GESTION DU ZOOM (WHEEL) ---
  container.addEventListener("wheel", (e) => {
    // Si on est sur le panel, on laisse le scroll naturel se faire
    if (shouldIgnore(e)) return;

    e.preventDefault();
    const s = Math.exp(e.deltaY * -0.001);
    state.scale = Math.min(Math.max(0.5, state.scale * s), 4);
    update();
  }, { passive: false }); // Important pour que preventDefault fonctionne

  // --- GESTION DU PAN (DRAG) ---
  container.addEventListener("mousedown", (e) => {
    // Si on clique sur le panel, on ne déclenche pas le drag du fond
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