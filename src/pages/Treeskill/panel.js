// javascript
const Panel = {
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
    const q = selector => root.querySelector(selector);
    return {
      header: q(".panel-header"),
      status: q("#sys-status"),
      display: q("#data-display"),
      controls: q("#controls"),
      slider: q("#score-slider"),
      scoreVal: q("#score-val"),
      btnSave: q("#btn-save"),
      globalScore: q("#global-score"),
      globalBar: q("#global-bar")
    };
  },

  _bindEvents() {
    const s = this.dom.slider;
    const b = this.dom.btnSave;
    if (s) {
      s.addEventListener("input", (e) => {
        const val = e.target.value;
        this.updateInterface(val);
        // Sauvegarde immédiate et notification si une sélection est active
        if (this.activeSelection && this.activeSelection.code) {
          const key = this.activeSelection.code;
          const numVal = parseInt(val, 10) || 0;
          this._setStoredScore(key, numVal);
          // Mettre à jour le global d'UI immédiatement
          this.updateGlobal();
          // Notifier les autres modules (wiring écoute 'ac:updated')
          try {
            window.dispatchEvent(new CustomEvent('ac:updated', { detail: { code: key, value: numVal } }));
          } catch (e) {}
        }
      });
    }
    if (b) b.addEventListener("click", () => this.saveData());
  },

  _getStoredScore(key) {
    return parseInt(localStorage.getItem(key), 10) || 0;
  },

  _setStoredScore(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
  },

  findAC(code, acData = null) {
    const data = acData || this.acData;
    if (!data || !code) return null;
    for (const k in data) {
      const group = data[k];
      if (!group || !group.niveaux) continue;
      for (const niveau of group.niveaux || []) {
        for (const ac of niveau.acs || []) {
          if (ac.code === code) return { group, niveau, ac };
        }
      }
    }
    return null;
  },

  resolveColor(defaultColor, element = null, match = null) {
    try {
      if (element && element.dataset && element.dataset.color) return element.dataset.color;
      if (match && match.group) {
        const g = String(match.group.libelle_long || '').toLowerCase();
        if (g.includes('comprendre')) return '#ff77d1';
        if (g.includes('concevoir')) return '#ffd700';
        if (g.includes('exprimer')) return '#8a2be2';
        if (g.includes('développer')) return '#00ff41';
        if (g.includes('entreprendre')) return '#06D1FF';
      }
    } catch (e) {}
    return defaultColor || '#00ff41';
  },

  _buildInfoHtml(match, name, storedScore) {
    let html = `
      <div class="info-row"><span class="info-label">ID</span> <span class="info-val">${name}</span></div>
      <div class="info-row"><span class="info-label">NOM</span> <span class="info-val">${match ? match.ac.libelle : ''}</span></div>
      <hr style="border:0; border-top:1px dashed #333; margin:10px 0;">
    `;
    if (match) {
      const { group, niveau } = match;
      html += `
        <div class="info-row"><span class="info-label">COMPÉTENCE</span> <span class="info-val">${group.libelle_long}</span></div>
        <div class="info-row"><span class="info-label">ANNÉE</span> <span class="info-val">${niveau.annee}</span></div>
      `;
      if (Array.isArray(group.composantes_essentielles) && group.composantes_essentielles.length) {
        html += `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;"><div style="font-size:0.85rem; color:#aaa;"><strong>Composantes Essentielles :</strong><ul>`;
        group.composantes_essentielles.forEach(s => { html += `<li>${s}</li>`; });
        html += `</ul></div>`;
      }
    } else {
      html += `<div>Aucune donnée AC trouvée pour ce code.</div>`;
    }
    html += `<hr>
      <div>${storedScore === 100 ? "COMPÉTENCE VALIDÉE." : "ACQUISITION EN COURS..."}</div>
    `;
    return html;
  },

  _applySelectionStyles(color) {
    if (this.dom.header) this.dom.header.style.borderTopColor = color;
    if (this.dom.status) { this.dom.status.innerText = "EDITING"; this.dom.status.style.color = color; }
    if (this.dom.controls) { this.dom.controls.style.display = "block"; this.dom.controls.classList.remove("hidden"); }
    if (this.dom.btnSave) {
      this.dom.btnSave.style.borderColor = color;
      this.dom.btnSave.style.color = color;
      this.dom.btnSave.innerText = "[ SAUVEGARDER ]";
    }
    if (this.dom.slider) {
      try { this.dom.slider.style.accentColor = color; } catch (e) {}
    }
  },

  selectNode(code, color = "#8a2be2", element = null, acData = null) {
    this.activeSelection = { code, element, color };
    const storedScore = this._getStoredScore(code);

    let name = code;
    try {
      if (element) {
        name = element.dataset?.name || element.getAttribute?.('data-name') || name;
        const titleEl = element.querySelector?.('title');
        if (titleEl?.textContent) name = titleEl.textContent.trim();
        const labelEl = element.querySelector?.('.label');
        if (labelEl?.textContent) name = labelEl.textContent.trim();
      }
    } catch (e) {}

    const match = this.findAC(code, acData);
    const resolvedColor = this.resolveColor(color, element, match);
    this.activeSelection.color = resolvedColor;

    if (this.dom.display) {
      this.dom.display.style.color = resolvedColor;
      this.dom.display.style.borderColor = resolvedColor;
      this.dom.display.innerHTML = this._buildInfoHtml(match, name, storedScore);
    }

    if (this.dom.slider) this.dom.slider.value = storedScore;
    this._applySelectionStyles(resolvedColor);
    this.updateInterface(storedScore);
  },

  updateInterface(val) {
    if (this.dom.scoreVal) this.dom.scoreVal.innerText = val + "mV";
  },

  saveData() {
    if (!this.activeSelection) return;
    const key = this.activeSelection.code;
    const val = this.dom.slider ? this.dom.slider.value : 0;
    const numVal = parseInt(val, 10) || 0;
    this._setStoredScore(key, numVal);

    const btn = this.dom.btnSave;
    if (btn) {
      const oldText = btn.innerText;
      btn.innerText = "SAVED";
      btn.style.background = this.activeSelection.color;
      btn.style.color = "#000";
      setTimeout(() => {
        btn.innerText = oldText;
        btn.style.background = "#111";
        btn.style.color = this.activeSelection.color;
      }, 800);
    }

    this.updateGlobal();

    // notifier wiring / autres listeners
    try {
      window.dispatchEvent(new CustomEvent('ac:updated', { detail: { code: key, value: numVal } }));
    } catch (e) {}
  },

  updateGlobal() {
    try {
      const nodes = this.root ? Array.from(this.root.querySelectorAll("[id^='AC']")) : [];
      let total = 0;
      let count = nodes.length;

      if (count === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('AC')) count++;
        }
      }

      if (nodes.length > 0) {
        nodes.forEach(n => {
          const key = n.getAttribute('id');
          total += this._getStoredScore(key);
        });
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('AC')) total += this._getStoredScore(k);
        }
      }

      const p = count > 0 ? Math.round(total / count) : 0;
      if (this.dom.globalScore) this.dom.globalScore.innerText = p + "mV";
      if (this.dom.globalBar) {
        this.dom.globalBar.style.width = p + "mV";
        this.dom.globalBar.style.backgroundColor = p === 100 ? "#00ff41" : "#fff";
      }
    } catch (e) {}
  }
};

export default Panel;
