// javascript
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
gsap.registerPlugin(Draggable);


export const CONTENT = {
  WIDTH: 4124,
  HEIGHT: 3107
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


export function enableZoomAndPan(targetElement, rootPage, zoom) {
  const container = rootPage.querySelector('.svg-wrapper') || rootPage;

  gsap.set(targetElement, {
    scale: zoom.current,
    transformOrigin: "center center",
    x: 0,
    y: 0
  });

  function computeBounds(scale) {
    const contentW = CONTENT.WIDTH * scale;
    const contentH = CONTENT.HEIGHT * scale;

    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    const overflowX = Math.max(0, contentW - cw);
    const overflowY = Math.max(0, contentH - ch);

    const minX = -overflowX / 2;
    const maxX = overflowX / 2;
    const minY = -overflowY / 2;
    const maxY = overflowY / 2;

    return { minX, maxX, minY, maxY };
  }

  function clampAndApply(draggable, bounds) {
    draggable.x = clamp(draggable.x, bounds.minX, bounds.maxX);
    draggable.y = clamp(draggable.y, bounds.minY, bounds.maxY);
    gsap.set(draggable.target, { x: draggable.x, y: draggable.y });
  }

  const draggableInstance = Draggable.create(targetElement, {
    type: "x,y",
    edgeResistance: 0.65,
    inertia: true,
    cursor: "grab",
    activeCursor: "grabbing",
    trigger: container,
    onPress: function() {
      this.startDrag();
    },
    onDrag: function() {
      const bounds = computeBounds(zoom.current);
      clampAndApply(this, bounds);
    },
    onThrowUpdate: function() {
      const bounds = computeBounds(zoom.current);
      clampAndApply(this, bounds);
    }
  })[0];

  (function initialClamp() {
    const bounds = computeBounds(zoom.current);
    const startX = clamp(50, bounds.minX, bounds.maxX);
    const startY = clamp(0, bounds.minY, bounds.maxY);

    gsap.set(targetElement, { x: startX, y: startY });

    if (draggableInstance) {
      draggableInstance.update();
    }
  })();

  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newScale = zoom.current + (direction * zoomSpeed);

    if (newScale < zoom.min) newScale = zoom.min;
    if (newScale > zoom.max) newScale = zoom.max;

    if (newScale !== zoom.current) {
      zoom.current = newScale;

      gsap.to(targetElement, {
        scale: newScale,
        duration: 0.3,
        overwrite: "auto",
        transformOrigin: "center center",
        onComplete: () => {
          const bounds = computeBounds(newScale);
          if (draggableInstance) {
            clampAndApply(draggableInstance, bounds);
            draggableInstance.update();
          } else {
            const currentX = gsap.getProperty(targetElement, "x");
            const currentY = gsap.getProperty(targetElement, "y");
            gsap.set(targetElement, {
              x: clamp(currentX, bounds.minX, bounds.maxX),
              y: clamp(currentY, bounds.minY, bounds.maxY)
            });
          }
        }
      });
    }
  }, { passive: false });

  window.addEventListener("resize", () => {
    const bounds = computeBounds(zoom.current);
    if (draggableInstance) {
      clampAndApply(draggableInstance, bounds);
      draggableInstance.update();
    } else {
      const currentX = gsap.getProperty(targetElement, "x");
      const currentY = gsap.getProperty(targetElement, "y");
      gsap.set(targetElement, {
        x: clamp(currentX, bounds.minX, bounds.maxX),
        y: clamp(currentY, bounds.minY, bounds.maxY)
      });
    }
  });
}
