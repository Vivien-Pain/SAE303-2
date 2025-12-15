import { htmlToDOM } from "../../lib/utils.js";
import template from "./template.html?raw";
import { TreeSkillView } from "../../ui/TreeSkill/index.js";
import { PanelView } from "../../ui/Panel/index.js";
import Panel from "./panel.js";
import { enableZoomAndPan } from "./zoom.js";
import ACData from "../../data/AC.json";
import { ParcoursSelectorView } from "../../ui/ParcourSelector/index.js";

let M = {
  rootPage: null,
  treeDom: null,
  selectorEl: null,
  zoom: { min: 0.6, max: 3, current: 1.8 }
};

let C = {};

C.handler_filterTreeByParcours = function(choice) {
  if (!M.treeDom) return;
  const hidden = {
    dev: ['2', '3'],
    des: ['2', '4'],
    com: ['3', '4']
  }[choice] || [];

  const nodes = M.treeDom.querySelectorAll('*');
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

C.getSavedParcours = function() {
  try { return localStorage.getItem("parcours"); } catch (e) { return null; }
};

C.handler_selectParcours = function(choice) {
  try {
    if (choice === "all") localStorage.removeItem("parcours");
    else localStorage.setItem("parcours", choice);
  } catch (e) {}

  try {
    const evt = new CustomEvent("parcours:selected", { detail: { choice }, bubbles: true });
    window.dispatchEvent(evt);
  } catch (e) {}

  if (choice && choice !== "all") {
    C.handler_filterTreeByParcours(choice);
  } else if (choice === "all") {
    C.handler_filterTreeByParcours(null);
  }

  if (typeof V.hideSelector === "function") {
    try { V.hideSelector(); } catch (e) {}
  }
};

C.findAC = function(el) {
  const acRegex = /(AC\d+(?:\.\d+)?)/i;
  const dataKeys = ['code'];

  let cur = el;
  while (cur && cur !== M.treeDom && cur !== document) {
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

C.getColor = function(node) {
  const fallback = "#00ff41";
  try {
    const styleVal = node?.style?.getPropertyValue?.("--active-color") ||
      window.getComputedStyle(node)?.getPropertyValue?.("--active-color");
    return styleVal?.trim() || fallback;
  } catch {
    return fallback;
  }
};

C.handler_nodeEvent = function(e) {
  const found = C.findAC(e.target);
  if (!found) return;
  const group = found.element || e.target;
  if (group.classList.contains('node-hidden')) return;
  const color = C.getColor(group);
  if (found.code) {
    Panel.selectNode(found.code, color, group, ACData);
  }
};

C.init = async function() {
  return V.init();
};

let V = {};

V.init = function() {
  M.rootPage = htmlToDOM(template);

  const treeView = new TreeSkillView();
  const panelView = new PanelView();

  let treeDom = treeView.dom();
  if (typeof treeDom === "string") treeDom = htmlToDOM(treeDom);
  if (!treeDom || !(treeDom instanceof Element)) return M.rootPage;

  M.treeDom = treeDom;

  const slot = M.rootPage.querySelector('slot[name="svg"]');
  if (slot) slot.replaceWith(treeDom);
  else {
    const viewport = M.rootPage.querySelector(".viewport") || M.rootPage;
    if (viewport?.appendChild) viewport.appendChild(treeDom);
    else if (viewport?.append) viewport.append(treeDom);
  }

  const panelSlot = M.rootPage.querySelector('slot[name="panel"]');
  const panelDom = (panelView && typeof panelView.dom === 'function') ? panelView.dom() : null;
  if (panelSlot && panelDom instanceof Element) panelSlot.replaceWith(panelDom);
  else if (panelDom instanceof Element) {
    const container = M.rootPage.querySelector('.Treeskill-container') || M.rootPage;
    if (container?.appendChild) container.appendChild(panelDom);
  }

  if (typeof Panel.init === 'function') Panel.init(M.rootPage);

  M.selectorEl = ParcoursSelectorView.dom();

  const saved = C.getSavedParcours();
  if (saved) {
    try { C.handler_filterTreeByParcours(saved); } catch (e) {}
    try {
      const evt = new CustomEvent("parcours:selected", { detail: { choice: saved }, bubbles: true });
      window.dispatchEvent(evt);
    } catch (e) {}
  } else {
    V.showSelector(M.selectorEl, M.rootPage);
  }
  V.attachEvents();

  setTimeout(() => enableZoomAndPan(M.treeDom, M.rootPage, M.zoom), 0);

  return M.rootPage;
};

V.showSelector = function(el, parent = document.body) {
  if (!el) return;
  if (!el.isConnected) {
    parent.appendChild(el);
  }
  V.attachSelectorEvents(el);
};

V.attachSelectorEvents = function(el) {
  if (!el) return;
  const buttons = el.querySelectorAll(".btn-parcours");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const target = btn.dataset.target;
      C.handler_selectParcours(target);
    });
  });

  const resetBtn = el.querySelector(".btn-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => C.handler_selectParcours("all"));
  }
};

V.hideSelector = function() {
  if (!M.selectorEl) return;
  try {
    M.selectorEl.classList.add("fade-out");
  } catch (e) {}
  setTimeout(() => {
    try { if (M.selectorEl && M.selectorEl.remove) M.selectorEl.remove(); } catch (e) {}
    M.selectorEl = null;
  }, 500);
};

V.attachEvents = function() {
  if (!M.treeDom) return M.rootPage;

  M.treeDom.addEventListener("click", C.handler_nodeEvent);
  M.treeDom.addEventListener("pointerdown", C.handler_nodeEvent, { passive: true });

  window.addEventListener('parcours:selected', e => {
    const choice = e?.detail?.choice;
    if (choice) C.handler_filterTreeByParcours(choice);
  });

  return M.rootPage;
};

export function TreeSkill() {
  return C.init();
}
