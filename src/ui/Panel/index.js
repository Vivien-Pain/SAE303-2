import { htmlToDOM } from "../../lib/utils.js";
import template from "./template.html?raw";

class PanelView {
  constructor() {
    this.root = htmlToDOM(template);
  }
  dom() {
    return this.root;
  }
}
const PanelController = {
  dom: {},
  activeSelection: null,
  root: null,
  acData: null,

  history: [],
  maxHistory: 100,
  historyContainer: null,
  HISTORY_KEY: "ac_history",

  init(root, acData = null) {
    this.root = root;
    this.acData = acData;
    this.dom = this._getDom(root);
    this._ensureHistoryContainer();
    this.loadHistory();
    this._bindEvents();
    this.updateGlobal();
    this.renderHistory();
  },

  _getDom(root) {
    if (!root) return {};
    const q = s => root.querySelector(s);
    return {
      header: q(".panel-header"),
      status: q("#sys-status"),
      display: q("#data-display"),
      controls: q("#controls"),
      slider: q("#score-slider"),
      scoreVal: q("#score-val"),
      btnSave: q("#btn-save"),
      globalScore: q("#global-score"),
      globalBar: q("#global-bar"),
      justification: q("#justification")
    };
  },

  _ensureHistoryContainer() {
    if (!this.root) return;
    const existing = this.root.querySelector("#ac-history");
    if (existing) {
      this.historyContainer = existing;
      return;
    }

    const container = document.createElement("div");
    container.id = "ac-history";
    container.className = "ac-history";
    container.style.cssText = "margin-top:12px;border-top:1px solid rgba(255,255,255,0.03);padding-top:8px;";

    const header = document.createElement("div");
    header.className = "history-header";
    header.textContent = "HISTORIQUE";
    header.style.cssText = "font-weight:700;margin:4px 0;color:#ccc;font-size:0.85rem";
    container.appendChild(header);

    const list = document.createElement("ul");
    list.className = "history-list";
    list.style.cssText = "list-style:none;padding:0;margin:0;max-height:160px;overflow:auto";
    container.appendChild(list);

    const body = this.root.querySelector(".panel-body") || this.root;
    body.appendChild(container);
    this.historyContainer = container;
  },

  _bindEvents() {
    this.dom.slider?.addEventListener("input", e => {
      const val = Number(e.target.value);
      this.updateInterface(val);

      if (this.activeSelection?.code) {
        // mise à jour courante sans historique
        localStorage.setItem(this.activeSelection.code, val);
        this.updateGlobal();
        window.dispatchEvent(new CustomEvent("ac:updated", {
          detail: { code: this.activeSelection.code, value: val }
        }));
      }
    });

    this.dom.justification?.addEventListener("input", e => {
      if (this.activeSelection?.code) {
        localStorage.setItem(this.activeSelection.code + "_note", e.target.value || "");
      }
    });

    this.dom.btnSave?.addEventListener("click", () => this.saveData());
  },

  findAC(code, acData = null) {
    const data = acData || this.acData;
    if (!data || !code) return null;
    const codeNorm = String(code).toUpperCase().trim();

    for (const group of Object.values(data)) {
      if (!group?.niveaux) continue;
      for (const niveau of group.niveaux) {
        const ac = (niveau.acs || []).find(a => String(a?.code || "").toUpperCase().trim() === codeNorm);
        if (ac) return { group, niveau, ac };
      }
    }
    return null;
  },

  resolveColor(defaultColor, element = null, match = null) {
    if (element?.dataset?.color) return element.dataset.color;
    if (match?.group) {
      const colorMap = {
        comprendre: "#ff77d1",
        concevoir: "#ffd700",
        exprimer: "#8a2be2",
        développer: "#00ff41",
        entreprendre: "#06D1FF"
      };
      const label = (match.group.libelle_long || "").toLowerCase();
      for (const [k, v] of Object.entries(colorMap)) if (label.includes(k)) return v;
    }
    return defaultColor || "#00ff41";
  },

  selectNode(code, color = "#8a2be2", element = null, acData = null) {
    const codeNorm = String(code).toUpperCase().trim();
    const storedScore = Number(localStorage.getItem(codeNorm)) || 0;
    const storedNote = localStorage.getItem(codeNorm + "_note") || "";
    const name = element?.querySelector?.("title")?.textContent?.trim()
        || element?.querySelector?.(".label")?.textContent?.trim()
        || element?.dataset?.name || codeNorm;

    const match = this.findAC(codeNorm, acData);
    const resolvedColor = this.resolveColor(color, element, match);

    this.activeSelection = { code: codeNorm, element, color: resolvedColor };

    if (this.dom.display) {
      this.dom.display.style.color = resolvedColor;
      this.dom.display.style.borderColor = resolvedColor;
      this.dom.display.innerHTML = this._buildInfoHtml(match, name, storedScore, storedNote);
    }

    if (this.dom.slider) this.dom.slider.value = storedScore;
    if (this.dom.justification) this.dom.justification.value = storedNote;

    if (this.dom.header) this.dom.header.style.borderTopColor = resolvedColor;
    if (this.dom.status) { this.dom.status.innerText = "EDITING"; this.dom.status.style.color = resolvedColor; }
    if (this.dom.controls) { this.dom.controls.style.display = "block"; this.dom.controls.classList.remove("hidden"); }
    if (this.dom.btnSave) { this.dom.btnSave.style.borderColor = resolvedColor; this.dom.btnSave.style.color = resolvedColor; this.dom.btnSave.innerText = "[ SAUVEGARDER ]"; }
    if (this.dom.slider) this.dom.slider.style.accentColor = resolvedColor;

    this.updateInterface(storedScore);
  },

  _buildInfoHtml(match, name, storedScore, storedNote = "") {
    const parts = [
      `<div class="info-row"><span class="info-label">ID</span> <span class="info-val">${name}</span></div>`,
      `<div class="info-row"><span class="info-label">NOM</span> <span class="info-val">${match?.ac?.libelle || ""}</span></div>`,
      `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;">`
    ];

    if (match) {
      parts.push(
          `<div class="info-row"><span class="info-label">COMPÉTENCE</span> <span class="info-val">${match.group.libelle_long}</span></div>`,
          `<div class="info-row"><span class="info-label">ANNÉE</span> <span class="info-val">${match.niveau.annee}</span></div>`
      );

      if (match.group.composantes_essentielles?.length) {
        const items = match.group.composantes_essentielles.map(s => `<li>${s}</li>`).join("");
        parts.push(
            `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;">`,
            `<div style="font-size:0.85rem; color:#aaa;"><strong>Composantes Essentielles :</strong><ul>${items}</ul></div>`
        );
      }
    } else {
      parts.push(`<div>Aucune donnée AC trouvée pour ce code.</div>`);
    }

    if (storedNote) {
      parts.push(
          `<hr>`,
          `<div class="info-row justification-display-row">`,
          `<span class="info-label">JUSTIFICATION</span>`,
          `<div class="info-val justification-display" style="white-space:pre-wrap;">${storedNote}</div>`,
          `</div>`
      );
    }

    parts.push(
        `<hr>`,
        `<div>${storedScore === 100 ? "COMPÉTENCE VALIDÉE." : "ACQUISITION EN COURS..."}</div>`
    );

    return parts.join("");
  },

  updateInterface(val) {
    if (this.dom.scoreVal) this.dom.scoreVal.innerText = val + "mV";
  },

  saveData() {
    if (!this.activeSelection) return;
    const { code, color } = this.activeSelection;
    const val = Number(this.dom.slider?.value) || 0;
    localStorage.setItem(code, val);
    const note = this.dom.justification?.value || "";
    localStorage.setItem(code + "_note", note);

    this.addHistoryEntry({ code, value: val, note, color, time: new Date().toISOString() });

    if (this.dom.btnSave) {
      const originalText = this.dom.btnSave.innerText;
      this.dom.btnSave.style.background = color;
      this.dom.btnSave.style.color = "#000";
      this.dom.btnSave.innerText = "SAVED";
      setTimeout(() => {
        this.dom.btnSave.style.background = "";
        this.dom.btnSave.style.color = color;
        this.dom.btnSave.innerText = originalText;
      }, 800);
    }

    this.updateGlobal();
    window.dispatchEvent(new CustomEvent("ac:updated", { detail: { code, value: val } }));
  },

  updateGlobal() {
    const nodesAll = Array.from(this.root?.querySelectorAll("*") || []);
    const acNodes = nodesAll.filter(n => /AC\d+/i.test(String(n.id || n.dataset?.code || "")));

    const acKeys = acNodes.length
        ? acNodes.map(n => String(n.id || n.dataset?.code || "").toUpperCase())
        : Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(k => /^AC/i.test(k));

    const total = acKeys.reduce((sum, key) => sum + (Number(localStorage.getItem(key)) || 0), 0);
    const average = acKeys.length ? Math.round(total / acKeys.length) : 0;

    if (this.dom.globalScore) this.dom.globalScore.innerText = average + "mV";
    if (this.dom.globalBar) {
      this.dom.globalBar.style.width = average + "mV";
      this.dom.globalBar.style.backgroundColor = average === 100 ? "#00ff41" : "#fff";
    }
  },

  loadHistory() {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      this.history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this.history)) this.history = [];
      if (this.history.length > this.maxHistory) this.history.length = this.maxHistory;
    } catch {
      this.history = [];
    }
  },

  saveHistory() {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history.slice(0, this.maxHistory)));
    } catch {}
  },

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  },

  addHistoryEntry(entry) {
    if (!entry?.code) return;
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) this.history.length = this.maxHistory;
    this.saveHistory();
    this.renderHistory();
  },

  renderHistory() {
    if (!this.historyContainer) return;
    const list = this.historyContainer.querySelector(".history-list");
    if (!list) return;
    list.innerHTML = "";

    for (const h of this.history) {
      const li = document.createElement("li");
      li.className = "history-item";
      li.style.cssText = "display:flex;flex-direction:column;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.85rem;color:#ddd";

      const top = document.createElement("div");
      top.style.cssText = "display:flex;align-items:center;gap:8px;";

      const swatch = document.createElement("span");
      swatch.style.cssText = `width:12px;height:12px;background:${h.color || "#fff"};display:inline-block;border-radius:2px;flex:0 0 12px`;
      top.appendChild(swatch);

      const title = document.createElement("span");
      title.textContent = `${h.code} — ${h.value}mV`;
      title.style.cssText = "font-weight:700;color:#fff";
      top.appendChild(title);

      const timeSpan = document.createElement("span");
      timeSpan.textContent = `à ${new Date(h.time).toLocaleTimeString()}`;
      timeSpan.style.cssText = "color:#aaa;margin-left:auto;font-size:0.8rem";
      top.appendChild(timeSpan);

      li.appendChild(top);

      if (h.note) {
        const note = document.createElement("div");
        note.textContent = h.note;
        note.style.cssText = "color:#bbb;white-space:pre-wrap;margin-top:6px;font-size:0.82rem";
        li.appendChild(note);
      }

      list.appendChild(li);
    }
  }
};

export { PanelView, PanelController };
