import { TreeSkillView } from "@/ui/TreeSkill";
import { PanelView } from "@/ui/Panel";
import { htmlToDOM } from "@/lib/utils.js";
import template from "./template.html?raw";
import Panel from "./panel.js";
import { enableZoomAndPan } from "./zoom.js";
import ACData from "@/data/AC.json";

let C = {};
let V = {
  rootPage: null,
  Treeskill: null,
  PanelView: null,
  zoom: {
    min: 0.6,
    max: 3,
    current: 1.8
  }
};

C.init = function() {
  return V.init();
};

V.init = function() {
  V.rootPage = htmlToDOM(template);
  V.Treeskill = new TreeSkillView();
  V.Panel = new PanelView();

  let treeDom = V.Treeskill.dom();

  if (typeof treeDom === "string") {
    treeDom = htmlToDOM(treeDom);
  }

  if (!treeDom || !(treeDom instanceof Element)) {
    return V.rootPage;
  } else {
    const slot = V.rootPage.querySelector('slot[name="svg"]');
    if (slot) {
      slot.replaceWith(treeDom);
    } else {
      const viewport = V.rootPage.querySelector(".viewport") || V.rootPage;
      if (viewport && typeof viewport.appendChild === "function") {
        viewport.appendChild(treeDom);
      } else if (viewport && typeof viewport.append === "function") {
        viewport.append(treeDom);
      }
    }

    const handleNodeEvent = (e) => {
      try {
        const target = e.target;

        const ancestors = [];
        let n = target;
        while (n && n !== document) {
          ancestors.push({
            tag: n.tagName || null,
            id: n.id || null,
            classes: typeof n.className === "string" ? n.className : null,
            dataset: n.dataset ? { ...n.dataset } : null
          });
          n = n.parentNode || n.parentElement || (n.ownerSVGElement ? n.ownerSVGElement : null);
          if (!n || ancestors.length > 40) break;
        }

        let cur = target;
        let found = null;
        const acRegex = /(AC\d+(?:\.\d+)?)/i;

        while (cur && cur !== treeDom && cur !== document) {
          if (cur.id) {
            const m = String(cur.id).match(acRegex);
            if (m) {
              found = { element: cur, code: m[1].toUpperCase() };
              break;
            }
          }

          if (cur.dataset) {
            const dataCode =
              cur.dataset.code ||
              cur.dataset.ac ||
              cur.dataset.acCode ||
              cur.dataset["ac-code"] ||
              cur.dataset["ac_code"] ||
              null;
            if (dataCode) {
              const m2 = String(dataCode).match(acRegex);
              found = { element: cur, code: (m2 ? m2[1].toUpperCase() : String(dataCode).toUpperCase()) };
              break;
            }
          }

          try {
            if (cur.querySelector) {
              const titleEl = cur.querySelector("title");
              if (titleEl && titleEl.textContent) {
                const m3 = titleEl.textContent.match(acRegex);
                if (m3) {
                  found = { element: cur, code: m3[1].toUpperCase() };
                  break;
                }
              }
            }
          } catch (errTitle) {
          }

          cur = cur.parentNode || cur.parentElement || (cur.ownerSVGElement ? cur.ownerSVGElement : null);
        }

        if (!found) {
          for (const a of ancestors) {
            if (a && a.id) {
              const m = String(a.id).match(acRegex);
              if (m) {
                const el = document.getElementById(a.id) || (target.closest && target.closest(`#${CSS.escape(a.id)}`));
                found = { element: el || target, code: m[1].toUpperCase() };
                break;
              }
            }
          }
        }

        if (!found) {
          return;
        }

        const nodeGroup = found.element || target;
        const code = found.code;

        let color = "#00ff41";
        try {
          const styleVal =
            (nodeGroup && nodeGroup.style && nodeGroup.style.getPropertyValue && nodeGroup.style.getPropertyValue("--active-color")) ||
            (nodeGroup && window.getComputedStyle && window.getComputedStyle(nodeGroup).getPropertyValue && window.getComputedStyle(nodeGroup).getPropertyValue("--active-color")) ||
            null;
          color = styleVal || color;
        } catch (err) {
        }

        try {
          if (nodeGroup && nodeGroup.attributes) {
            for (const attr of nodeGroup.attributes) { }
          }
        } catch (err) {
        }

        if (code) {
          const match = Panel.findAC ? Panel.findAC(code, ACData) : null;
          try {
            Panel.selectNode(code, (color && color.trim) ? color.trim() : color, nodeGroup, ACData);
          } catch (err) {
          }
        }
      } catch (err) {
      }
    };

    treeDom.addEventListener("click", handleNodeEvent);
    treeDom.addEventListener("pointerdown", handleNodeEvent, { passive: true });

    setTimeout(() => {
      try {
        enableZoomAndPan(treeDom, V.rootPage, V.zoom);
      } catch (e) {
      }
    }, 0);
  }

  try {
    const panelSlot = V.rootPage.querySelector('slot[name="panel"]');
    const panelDom = V.Panel && typeof V.Panel.dom === 'function' ? V.Panel.dom() : null;
    if (panelSlot && panelDom instanceof Element) {
      panelSlot.replaceWith(panelDom);
    } else if (panelDom instanceof Element) {
      const container = V.rootPage.querySelector('.Treeskill-container') || V.rootPage;
      if (container && typeof container.appendChild === 'function') {
        container.appendChild(panelDom);
      }
    }
  } catch (e) {
  }

  try {
    Panel.init(V.rootPage);
  } catch (e) {
  }

  return V.rootPage;
};

export function TreeSkill() {
  return C.init();
}
