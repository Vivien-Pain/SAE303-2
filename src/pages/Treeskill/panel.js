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
    if (s) s.addEventListener("input", (e) => this.updateInterface(e.target.value));
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

  _buildInfoFragment(match, name, storedScore) {
    const frag = document.createDocumentFragment();

    const row = (label, val) => {
      const r = document.createElement('div');
      r.className = 'info-row';
      const l = document.createElement('span');
      l.className = 'info-label';
      l.innerText = label;
      const v = document.createElement('span');
      v.className = 'info-val';
      v.innerText = val ?? '';
      r.appendChild(l);
      r.appendChild(document.createTextNode(' '));
      r.appendChild(v);
      return r;
    };

    frag.appendChild(row('ID', name));
    frag.appendChild(row('NOM', match ? (match.ac.libelle || '') : ''));

    const hr1 = document.createElement('hr');
    hr1.style.border = '0';
    hr1.style.borderTop = '1px dashed #333';
    hr1.style.margin = '10px 0';
    frag.appendChild(hr1);

    if (match) {
      frag.appendChild(row('COMPÉTENCE', match.group.libelle_long || ''));
      frag.appendChild(row('ANNÉE', match.niveau.annee || ''));

      if (Array.isArray(match.group.composantes_essentielles) && match.group.composantes_essentielles.length) {
        const hr2 = document.createElement('hr');
        hr2.style.border = '0';
        hr2.style.borderTop = '1px dashed #333';
        hr2.style.margin = '10px 0';
        frag.appendChild(hr2);

        const wrapper = document.createElement('div');
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.color = '#aaa';
        const strong = document.createElement('strong');
        strong.innerText = 'Composantes Essentielles :';
        wrapper.appendChild(strong);

        const ul = document.createElement('ul');
        match.group.composantes_essentielles.forEach(s => {
          const li = document.createElement('li');
          li.innerText = s;
          ul.appendChild(li);
        });
        wrapper.appendChild(ul);
        frag.appendChild(wrapper);
      }
    } else {
      const none = document.createElement('div');
      none.style.fontSize = '0.9rem';
      none.style.color = '#888';
      none.innerText = 'Aucune donnée AC trouvée pour ce code.';
      frag.appendChild(none);
    }

    const hr3 = document.createElement('hr');
    hr3.style.border = '0';
    hr3.style.borderTop = '1px dashed #333';
    hr3.style.margin = '10px 0';
    frag.appendChild(hr3);

    const status = document.createElement('div');
    status.style.fontSize = '0.8rem';
    status.style.color = '#888';
    status.innerText = storedScore === 100 ? 'COMPÉTENCE VALIDÉE.' : 'ACQUISITION EN COURS...';
    frag.appendChild(status);

    return frag;
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
      // insertion via DOM (plus propre, pas de HTML brut)
      this.dom.display.innerHTML = '';
      const frag = this._buildInfoFragment(match, name, storedScore);
      this.dom.display.appendChild(frag);
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
    this._setStoredScore(key, val);

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
