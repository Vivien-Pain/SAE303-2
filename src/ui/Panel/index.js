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

  init(root, acData = null) {
    this.root = root;
    this.acData = acData;
    this.dom = this._getDom(root);
    this._bindEvents();
    this.updateGlobal();
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

  _bindEvents() {
    this.dom.slider?.addEventListener("input", e => {
      const val = Number(e.target.value);
      this.updateInterface(val);

      if (this.activeSelection?.code) {
        localStorage.setItem(this.activeSelection.code, val);
        this.updateGlobal();
        window.dispatchEvent(new CustomEvent('ac:updated', {
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

    for (const group of Object.values(data)) {
      if (!group?.niveaux) continue;
      for (const niveau of group.niveaux) {
        const ac = niveau.acs?.find(ac => ac.code === code);
        if (ac) return { group, niveau, ac };
      }
    }
    return null;
  },

  resolveColor(defaultColor, element = null, match = null) {
    if (element?.dataset?.color) return element.dataset.color;

    if (match?.group) {
      const colorMap = {
        comprendre: '#ff77d1', concevoir: '#ffd700', exprimer: '#8a2be2',
        développer: '#00ff41', entreprendre: '#06D1FF'
      };
      const label = match.group.libelle_long?.toLowerCase() || '';
      for (const [key, color] of Object.entries(colorMap)) {
        if (label.includes(key)) return color;
      }
    }
    return defaultColor || '#00ff41';
  },

  selectNode(code, color = "#8a2be2", element = null, acData = null) {
    const storedScore = Number(localStorage.getItem(code)) || 0;
    const storedNote = localStorage.getItem(code + "_note") || "";
    const name = element?.querySelector?.('title')?.textContent?.trim() ||
        element?.querySelector?.('.label')?.textContent?.trim() ||
        element?.dataset?.name || code;

    const match = this.findAC(code, acData);
    const resolvedColor = this.resolveColor(color, element, match);

    this.activeSelection = { code, element, color: resolvedColor };

    if (this.dom.display) {
      Object.assign(this.dom.display.style, {
        color: resolvedColor,
        borderColor: resolvedColor
      });
      this.dom.display.innerHTML = this._buildInfoHtml(match, name, storedScore, storedNote);
    }

    if (this.dom.slider) this.dom.slider.value = storedScore;
    if (this.dom.justification) this.dom.justification.value = storedNote;

    Object.assign(this.dom.header?.style || {}, { borderTopColor: resolvedColor });
    Object.assign(this.dom.status || {}, { innerText: "EDITING", style: { color: resolvedColor } });
    Object.assign(this.dom.controls?.style || {}, { display: "block" });
    this.dom.controls?.classList.remove("hidden");
    Object.assign(this.dom.btnSave?.style || {}, {
      borderColor: resolvedColor,
      color: resolvedColor
    });
    if (this.dom.btnSave) this.dom.btnSave.innerText = "[ SAUVEGARDER ]";
    if (this.dom.slider) this.dom.slider.style.accentColor = resolvedColor;

    this.updateInterface(storedScore);
  },

  _buildInfoHtml(match, name, storedScore, storedNote = "") {
    const parts = [
      `<div class="info-row"><span class="info-label">ID</span> <span class="info-val">${name}</span></div>`,
      `<div class="info-row"><span class="info-label">NOM</span> <span class="info-val">${match?.ac.libelle || ''}</span></div>`,
      `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;">`
    ];

    if (match) {
      parts.push(
          `<div class="info-row"><span class="info-label">COMPÉTENCE</span> <span class="info-val">${match.group.libelle_long}</span></div>`,
          `<div class="info-row"><span class="info-label">ANNÉE</span> <span class="info-val">${match.niveau.annee}</span></div>`
      );

      if (match.group.composantes_essentielles?.length) {
        const items = match.group.composantes_essentielles.map(s => `<li>${s}</li>`).join('');
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

    return parts.join('');
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

    if (this.dom.btnSave) {
      const originalText = this.dom.btnSave.innerText;
      Object.assign(this.dom.btnSave.style, { background: color, color: "#000" });
      this.dom.btnSave.innerText = "SAVED";

      setTimeout(() => {
        Object.assign(this.dom.btnSave.style, { background: "#111", color });
        this.dom.btnSave.innerText = originalText;
      }, 800);
    }

    this.updateGlobal();
    window.dispatchEvent(new CustomEvent('ac:updated', { detail: { code, value: val } }));
  },

  updateGlobal() {
    const nodes = Array.from(this.root?.querySelectorAll("[id^='AC']") || []);
    const acKeys = nodes.length ?
        nodes.map(n => n.id) :
        Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
            .filter(k => k?.startsWith('AC'));

    const total = acKeys.reduce((sum, key) => sum + (Number(localStorage.getItem(key)) || 0), 0);
    const average = acKeys.length ? Math.round(total / acKeys.length) : 0;

    if (this.dom.globalScore) this.dom.globalScore.innerText = average + "mV";
    if (this.dom.globalBar) {
      Object.assign(this.dom.globalBar.style, {
        width: average + "mV",
        backgroundColor: average === 100 ? "#00ff41" : "#fff"
      });
    }
  }
};

export { PanelView, PanelController };
