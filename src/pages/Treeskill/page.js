import { htmlToDOM } from "../../lib/utils.js";
import template from "./template.html?raw";
import { TreeSkillView, initWiring } from "../../ui/TreeSkill/index.js";
import { PanelView, PanelController } from "../../ui/Panel/index.js";
import { ParcoursSelectorView } from "../../ui/ParcourSelector/index.js";
import { enableZoomAndPan } from "../../lib/zoom.js";
import ACData from "../../data/AC.json";

let M = {
  rootPage: null,
  treeDom: null,
  selectorEl: null,
  wiring: null,
  zoom: { min: 0.6, max: 3, current: 1.8 }
};

let C = {};

C.filterTreeByParcours = function(choice) {
  if (!M.treeDom) return;

  const hiddenByParcours = {
    dev: ['2', '3'], des: ['2', '4'], com: ['3', '4']
  }[choice] || [];

  const acRegex = /(AC(\d)(\d)(?:\.\d+)?)/i;
  M.treeDom.querySelectorAll('[id*="AC"], [data-code*="AC"]').forEach(node => {
    const code = node.id || node.dataset.code;
    const match = code?.match(acRegex);

    if (match) {
      const [, , year, num] = match;
      node.classList.toggle('node-hidden', year === '3' && hiddenByParcours.includes(num));
    }
  });
};

C.selectParcours = function(choice) {
  try {
    choice === "all" ?
      localStorage.removeItem("parcours") :
      localStorage.setItem("parcours", choice);
  } catch (e) {}

  C.filterTreeByParcours(choice === "all" ? null : choice);
  M.wiring?.update();
  V.hideSelector();

  try {
    window.dispatchEvent(new CustomEvent("parcours:selected", {
      detail: { choice },
      bubbles: true
    }));
  } catch (e) {}
};

C.findAC = function(el) {
  const acRegex = /(AC\d+(?:\.\d+)?)/i;
  let cur = el;

  while (cur && cur !== M.treeDom) {
    const code = cur.id || cur.dataset?.code;
    const match = code?.match(acRegex);
    if (match) return { element: cur, code: match[1].toUpperCase() };

    const titleMatch = cur.querySelector?.("title")?.textContent?.match(acRegex);
    if (titleMatch) return { element: cur, code: titleMatch[1].toUpperCase() };

    cur = cur.parentElement || cur.parentNode;
  }
  return null;
};

C.handleNodeClick = function(e) {
  const found = C.findAC(e.target);
  if (!found || found.element.classList.contains('node-hidden')) return;

  const color = found.element.style.getPropertyValue?.("--active-color") ||
    getComputedStyle(found.element).getPropertyValue?.("--active-color") ||
    "#00ff41";

  PanelController.selectNode(found.code, color, found.element, ACData);
};

let V = {};

V.init = function() {
  M.rootPage = htmlToDOM(template);

  const treeView = new TreeSkillView();
  let treeDom = treeView.dom();
  if (typeof treeDom === "string") treeDom = htmlToDOM(treeDom);
  if (!(treeDom instanceof Element)) return M.rootPage;

  M.treeDom = treeDom;

  // Insertion tree
  const slot = M.rootPage.querySelector('slot[name="svg"]');
  slot ? slot.replaceWith(treeDom) :
    M.rootPage.querySelector(".viewport")?.appendChild(treeDom);

  try { M.wiring = initWiring(M.treeDom, ACData); } catch (e) {}

  const panelView = new PanelView();
  const panelDom = panelView.dom();
  const panelSlot = M.rootPage.querySelector('slot[name="panel"]');
  if (panelSlot && panelDom instanceof Element) panelSlot.replaceWith(panelDom);
  PanelController.init?.(M.rootPage, ACData);

  M.selectorEl = ParcoursSelectorView.dom();
  if (M.selectorEl) {
    M.selectorEl.querySelectorAll(".btn-parcours").forEach(btn => {
      btn.addEventListener("click", () => C.selectParcours(btn.dataset.target));
    });
    M.selectorEl.querySelector(".btn-reset")?.addEventListener("click", () =>
      C.selectParcours("all"));
  }

  const saved = localStorage.getItem("parcours");
  if (saved) {
    C.filterTreeByParcours(saved);
    try {
      window.dispatchEvent(new CustomEvent("parcours:selected", {
        detail: { choice: saved },
        bubbles: true
      }));
    } catch (e) {}
  } else {
    V.showSelector();
  }
  M.treeDom.addEventListener("click", C.handleNodeClick);
  M.treeDom.addEventListener("pointerdown", C.handleNodeClick, { passive: true });

  window.addEventListener('parcours:selected', e => {
    if (e.detail?.choice) C.filterTreeByParcours(e.detail.choice);
  });

  window.addEventListener('ac:updated', () => M.wiring?.update());

  // Zoom
  setTimeout(() => enableZoomAndPan(M.treeDom, M.rootPage, M.zoom), 0);

  return M.rootPage;
};

V.showSelector = function() {
  if (M.selectorEl && !M.selectorEl.isConnected) {
    M.rootPage.appendChild(M.selectorEl);
  }
};

V.hideSelector = function() {
  if (!M.selectorEl) return;
  M.selectorEl.classList.add("fade-out");
  setTimeout(() => {
    M.selectorEl?.remove();
    M.selectorEl = null;
  }, 500);
};

export function TreeSkill() {
  return V.init();
}
