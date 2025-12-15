// javascript
import { TreeSkillView } from "@/ui/TreeSkill";
import { PanelView } from "@/ui/Panel";
import { htmlToDOM } from "@/lib/utils.js";
import template from "./template.html?raw";
import Panel from "./panel.js";
import { enableZoomAndPan } from "./zoom.js";
import ACData from "@/data/AC.json";
import { ParcoursSelector } from "./ParcourSelector.js";

let C = {};
let V = {
  rootPage: null,
  Treeskill: null,
  PanelView: null,
  zoom: { min: 0.6, max: 3, current: 1.8 }
};

C.init = () => V.init();

C.filterTreeByParcours = (choice, treeDom) => {
  if (!treeDom) return;
  const hidden = {
    dev: ['2', '3'],
    des: ['2', '4'],
    com: ['3', '4']
  }[choice] || [];

  const nodes = treeDom.querySelectorAll('*');
  const acRegex = /(AC(\d)(\d)(?:\.\d+)?)/i;

  nodes.forEach(node => {
    let match = null;
    if (node.id && acRegex.test(node.id)) match = node.id.match(acRegex);
    else if (node.dataset?.code && acRegex.test(node.dataset.code)) match = node.dataset.code.match(acRegex);

    if (!match) return;
    const annee = match[2];
    const num = match[3];
    node.classList.remove('node-hidden');
    if (annee === '3' && hidden.includes(num)) node.classList.add('node-hidden');
  });
};

V.init = function() {
  V.rootPage = htmlToDOM(template);
  V.Treeskill = new TreeSkillView();
  V.PanelView = new PanelView();

  let treeDom = V.Treeskill.dom();
  if (typeof treeDom === "string") treeDom = htmlToDOM(treeDom);
  if (!treeDom || !(treeDom instanceof Element)) return V.rootPage;

  const slot = V.rootPage.querySelector('slot[name="svg"]');
  if (slot) slot.replaceWith(treeDom);
  else {
    const viewport = V.rootPage.querySelector(".viewport") || V.rootPage;
    if (viewport?.appendChild) viewport.appendChild(treeDom);
    else if (viewport?.append) viewport.append(treeDom);
  }

  // Utiliser showIfNeeded pour éviter de redemander si déjà choisi
  ParcoursSelector.showIfNeeded(choice => C.filterTreeByParcours(choice, treeDom), V.rootPage);

  // Écoute globale au cas où d'autres modules déclencheraient l'événement
  window.addEventListener('parcours:selected', e => {
    const choice = e?.detail?.choice;
    if (choice) C.filterTreeByParcours(choice, treeDom);
  });

  const acRegex = /(AC\d+(?:\.\d+)?)/i;
  const dataKeys = 'code';

  const findAC = (el) => {
    let cur = el;
    while (cur && cur !== treeDom && cur !== document) {
      if (cur.id) {
        const m = String(cur.id).match(acRegex);
        if (m) return { element: cur, code: m[1].toUpperCase() };
      }
      if (cur.dataset) {
        for (const k of dataKeys) {
          const v = cur.dataset[k];
          if (v) {
            const m = String(v).match(acRegex);
            return { element: cur, code: (m ? m[1].toUpperCase() : String(v).toUpperCase()) };
          }
        }
      }
      if (cur.querySelector) {
        const titleEl = cur.querySelector("title");
        if (titleEl?.textContent) {
          const m = titleEl.textContent.match(acRegex);
          if (m) return { element: cur, code: m[1].toUpperCase() };
        }
      }
      cur = cur.parentNode || cur.parentElement || (cur.ownerSVGElement || null);
    }
    return null;
  };

  const getColor = (node) => {
    const fallback = "#00ff41";
    try {
      const styleVal = node?.style?.getPropertyValue?.("--active-color") ||
        window.getComputedStyle(node)?.getPropertyValue?.("--active-color");
      return styleVal?.trim() || fallback;
    } catch {
      return fallback;
    }
  };

  const handleNodeEvent = (e) => {
    const found = findAC(e.target);
    if (!found) return;
    const group = found.element || e.target;
    if (group.classList.contains('node-hidden')) return;
    const color = getColor(group);
    if (found.code) {
      Panel.selectNode(found.code, color, group, ACData);
    }
  };

  treeDom.addEventListener("click", handleNodeEvent);
  treeDom.addEventListener("pointerdown", handleNodeEvent, { passive: true });

  setTimeout(() => enableZoomAndPan(treeDom, V.rootPage, V.zoom), 0);

  const panelSlot = V.rootPage.querySelector('slot[name="panel"]');
  const panelDom = (V.PanelView && typeof V.PanelView.dom === 'function') ? V.PanelView.dom() : null;
  if (panelSlot && panelDom instanceof Element) panelSlot.replaceWith(panelDom);
  else if (panelDom instanceof Element) {
    const container = V.rootPage.querySelector('.Treeskill-container') || V.rootPage;
    if (container?.appendChild) container.appendChild(panelDom);
  }

  if (typeof Panel.init === 'function') Panel.init(V.rootPage);

  return V.rootPage;
};

export function TreeSkill() {
  return C.init();
}
