// javascript
const Panel = {
  dom: {},
  activeSelection: null,
  root: null,

  init(root) {
    this.root = root;
    this.dom = {
      header: root.querySelector(".panel-header"),
      status: root.querySelector("#sys-status"),
      display: root.querySelector("#data-display"),
      controls: root.querySelector("#controls"),
      slider: root.querySelector("#score-slider"),
      scoreVal: root.querySelector("#score-val"),
      btnSave: root.querySelector("#btn-save"),
      globalScore: root.querySelector("#global-score"),
      globalBar: root.querySelector("#global-bar")
    };

    if (this.dom.slider) {
      this.dom.slider.addEventListener("input", (e) => this.updateInterface(e.target.value));
    }
    if (this.dom.btnSave) {
      this.dom.btnSave.addEventListener("click", () => this.saveData());
    }

    this.updateGlobal();
  },

  findAC(code, acData) {
    if (!acData || !code) return null;
    for (const key in acData) {
      const group = acData[key];
      if (!group || !group.niveaux) continue;
      for (const niveau of group.niveaux) {
        if (!niveau.acs) continue;
        for (const ac of niveau.acs) {
          if (ac.code === code) return { group, niveau, ac };
        }
      }
    }
    return null;
  },

  resolveColor(defaultColor, element, match) {
    // Priorité: data-color, data-category / data-name / classes, puis match.group
    try {
      if (element) {
        const el = element;
        const ds = el.dataset || {};

        if (ds.color) return ds.color;
      }

      if (match.group) {
        const g = (match.group.libelle_long || '').toString().toLowerCase();
        if (g.includes('comprendre')) return '#ff77d1';
        if (g.includes('concevoir')) return '#ffd700';
        if (g.includes('exprimer')) return '#8a2be2';
        if (g.includes('développer')) return '#00ff41';
        if (g.includes('entreprendre')) return '#06D1FF';
      }
    } catch (e) { /* silent */ }

    return defaultColor || '#00ff41';
  },

  selectNode(code, color = "#8a2be2", element = null, acData = null) {
    this.activeSelection = { code, element, color };
    const storedScore = parseInt(localStorage.getItem(code) || 0, 10) || 0;

    let name = code;
    try {
      if (element) {
        if (element.dataset && element.dataset.name) name = element.dataset.name;
        name = element.getAttribute('data-name') || name;
        const titleEl = element.querySelector && element.querySelector('title');
        if (titleEl && titleEl.textContent) name = titleEl.textContent.trim();
        const labelEl = element.querySelector && element.querySelector('.label');
        if (labelEl && labelEl.textContent) name = labelEl.textContent.trim();
      }
    } catch (e) { /* silent */ }

    const match = this.findAC(code, acData);
    const resolvedColor = this.resolveColor(color, element, match);
    this.activeSelection.color = resolvedColor;

    if (this.dom.header) this.dom.header.style.borderTopColor = resolvedColor;
    if (this.dom.status) {
      this.dom.status.innerText = "EDITING";
      this.dom.status.style.color = resolvedColor;
    }

    if (this.dom.display) {
      this.dom.display.style.color = resolvedColor;
      this.dom.display.style.borderColor = resolvedColor;

      let infoHtml = `
        <div class="info-row"><span class="info-label">ID</span> <span class="info-val">${name}</span></div>
        <div class="info-row"><span class="info-label">NOM</span> <span class="info-val">${match ? match.ac.libelle : ''}</span></div>
        <hr style="border:0; border-top:1px dashed #333; margin:10px 0;">
      `;

      if (match) {
        const { group, niveau, ac } = match;
        infoHtml += `
          <div class="info-row"><span class="info-label">COMPÉTENCE</span> <span class="info-val">${group.nom_court || group.libelle_long || ''}</span></div>
          <div class="info-row"><span class="info-label">ANNÉE</span> <span class="info-val">${niveau.annee}</span></div>
        `;
        if (group.composantes_essentielles && group.composantes_essentielles.length) {
          infoHtml += `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;"><div style="font-size:0.85rem; color:#aaa;"><strong>Composantes Essentielles :</strong><ul>`;
          group.composantes_essentielles.forEach(s => { infoHtml += `<li>${s}</li>`; });
          infoHtml += `</ul></div>`;
        }
      } else {
        infoHtml += `<div style="font-size:0.9rem; color:#888;">Aucune donnée AC trouvée pour ce code.</div>`;
      }

      infoHtml += `<hr style="border:0; border-top:1px dashed #333; margin:10px 0;">
        <div style="font-size:0.8rem; color:#888;">${storedScore === 100 ? "COMPÉTENCE VALIDÉE." : "ACQUISITION EN COURS..."}</div>
      `;

      this.dom.display.innerHTML = infoHtml;
    }

    if (this.dom.controls) {
      this.dom.controls.style.display = "block";
      this.dom.controls.classList.remove("hidden");
    }

    if (this.dom.slider) {
      this.dom.slider.value = storedScore;
      try { this.dom.slider.style.accentColor = resolvedColor; } catch (e) { /* ignore */ }
    }

    if (this.dom.btnSave) {
      this.dom.btnSave.style.borderColor = resolvedColor;
      this.dom.btnSave.style.color = resolvedColor;
      this.dom.btnSave.innerText = "[ SAUVEGARDER ]";
    }

    this.updateInterface(storedScore);
  },

  updateInterface(val) {
    if (this.dom.scoreVal) this.dom.scoreVal.innerText = val + "mV";
  },

  saveData() {
    if (!this.activeSelection) return;
    const val = this.dom.slider ? this.dom.slider.value : 0;
    localStorage.setItem(this.activeSelection.code, val);

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
          const key = localStorage.key(i);
          if (key && key.startsWith('AC')) count++;
        }
      }

      if (nodes.length > 0) {
        nodes.forEach(n => {
          const key = n.getAttribute('id');
          const val = parseInt(localStorage.getItem(key) || 0, 10) || 0;
          total += val;
        });
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('AC')) {
            const val = parseInt(localStorage.getItem(key) || 0, 10) || 0;
            total += val;
          }
        }
      }

      const p = count > 0 ? Math.round(total / count) : 0;

      if (this.dom.globalScore) this.dom.globalScore.innerText = p + "mV";
      if (this.dom.globalBar) {
        this.dom.globalBar.style.width = p + "mV";
        this.dom.globalBar.style.backgroundColor = p === 100 ? "#00ff41" : "#fff";
      }
    } catch (e) { }
  }
};

export default Panel;
