import { htmlToDOM } from "../../lib/utils.js";
import template from "./template.html?raw";
import { TreeSkillView, initWiring } from "../../ui/TreeSkill/index.js";
import { PanelView, PanelController } from "../../ui/Panel/index.js";
import { enableZoomAndPan } from "../../lib/zoom.js";
import { startBootSequence, animateNodeSelect } from "../../lib/animation.js";
import { pn } from "../../data/pn.js";

let M = {
  rootPage: null,
  treeDom: null,
  wiring: null,
  zoom: { min: 0.6, max: 3, current: 1.8 }
};

let C = {};
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

  const label = pn.getACLibelle(found.code);
  if (label) {
    found.element.dataset.acLibelle = label;
    found.element.setAttribute("title", label);
  }

  // --- GSAP Trigger ---
  animateNodeSelect(found.element);

  PanelController.selectNode(found.code, color, found.element, pn);
};

let V = {};
V.init = function() {
  M.rootPage = htmlToDOM(template);

  const bootHTML = `<div class="boot-screen"><div id="boot-log"></div></div>`;
  M.rootPage.appendChild(htmlToDOM(bootHTML));

  const treeView = new TreeSkillView();
  let treeDom = treeView.dom();
  if (typeof treeDom === "string") treeDom = htmlToDOM(treeDom);
  if (!(treeDom instanceof Element)) return M.rootPage;

  M.treeDom = treeDom;

  const slot = M.rootPage.querySelector('slot[name="svg"]');
  if (slot) slot.replaceWith(treeDom);
  else M.rootPage.querySelector(".viewport")?.appendChild(treeDom);

  try { M.wiring = initWiring(M.treeDom, pn); } catch (e) {}

  const panelView = new PanelView();
  const panelDom = panelView.dom();
  const panelSlot = M.rootPage.querySelector('slot[name="panel"]');
  if (panelSlot && panelDom instanceof Element) panelSlot.replaceWith(panelDom);
  PanelController.init?.(M.rootPage, pn);

  M.treeDom.addEventListener("click", C.handleNodeClick);
  window.addEventListener('ac:updated', () => M.wiring?.update());

  setTimeout(() => enableZoomAndPan(M.treeDom, M.rootPage, M.zoom), 0);
  setTimeout(() => startBootSequence(M.rootPage), 100);

  return M.rootPage;
};

export function TreeSkill() {
  return V.init();
}