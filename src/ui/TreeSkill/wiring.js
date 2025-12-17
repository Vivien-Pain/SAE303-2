import { animateShape, animateRamSegment } from '../../lib/animation.js';
const M = {
  data: null,
  init(d) {
    this.data = d;
    console.debug('M.init', { dataProvided: !!d });
  },
  parse(v) {
    const s = String(v).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') || '0';
    const num = Number(s);
    console.debug('M.parse', { input: v, parsed: num });
    return num;
  },

  read() {
    console.debug('M.read start');
    const out = Object.keys(localStorage).reduce((acc, k) => {
      if (/^AC\d+/i.test(k)) {
        acc[k.toUpperCase()] = this.parse(localStorage.getItem(k));
      }
      return acc;
    }, {});
    console.debug('M.read result', out);
    return out;
  },

  get(code) {
    const k = String(code || '').toUpperCase().trim();
    if (!k) return 0;
    const raw = localStorage.getItem(k);
    if (raw != null) {
      const parsed = this.parse(raw);
      console.debug('M.get direct', { code: k, raw, parsed });
      return parsed;
    }
    const all = this.read();
    const match = Object.keys(all).find(key => key.includes(k) || k.includes(key));
    const res = match ? all[match] : 0;
    console.debug('M.get fallback', { code: k, match, result: res });
    return res;
  }
};

const V = {
  COLORS: { comprendre: '#ff77d1', concevoir: '#ffd700', exprimer: '#8a2be2', developper: '#00ff41', développer: '#00ff41', entreprendre: '#06D1FF' },
  GREY: '#6f7a84',

  qsa: (el, s) => Array.from(el?.querySelectorAll(s) || []),
  col: (c, p) => p > 0 ? (c || V.GREY) : V.GREY,

  setContrast(el) {
    const c = this.GREY;
    this.qsa(el, '.label, text').forEach(n => { n.style.color = c; n.style.fill = c; });

    if (el?.classList?.contains('ac-chip') || /AC\d+/.test(el?.id)) {
      el.style.color = c;
      if (!el.classList.contains('has-current')) {
        this.qsa(el, 'path, rect, circle, ellipse, polygon, polyline, line').forEach(s => {
          const isBgFg = /^background|^forground/i.test(s.id || '');
          if (isBgFg) {
            s.style.stroke = c;
          } else {
            s.style.fill = c;
          }
        });
      }
    }
  },

  applyState(el, color, prog, isCable = false) {
    if (!el) return;
    const done = prog >= 100;
    el.classList.toggle('has-current', done);
    el.classList.toggle('no-current', !done);

    console.debug('V.applyState', { id: el.id || null, color, prog, isCable, done });

    let shapes = this.qsa(el, 'path, rect, circle, ellipse, polygon, polyline, line');
    if (!shapes.length && /path|rect|circle|line/i.test(el.tagName)) shapes = [el];

    const dColor = this.col(color, prog);

    shapes.forEach(s => {
      try {
        s.dataset.os = s.dataset.os || s.getAttribute('stroke') || '';
        s.dataset.osw = s.dataset.osw || s.getAttribute('stroke-width') || s.style.strokeWidth || '2';

        if (isCable) {
          s.style.stroke = prog > 0 ? dColor : this.GREY;
          s.style.strokeOpacity = done ? '1' : (prog > 0 ? '0.75' : '0.6');
          s.style.opacity = done ? '1' : (prog > 0 ? '0.85' : '0.9');
          s.style.fill = 'none';
        } else {
          const isBgFg = /^background|^forground/i.test(s.id || '');
          if (isBgFg) {
            s.style.stroke = (done || prog > 0) ? dColor : this.GREY;
            s.style.opacity = done ? '1' : (prog > 0 ? '0.7' : '1');
            s.style.fill = '#000';
          } else {
            s.style.fill = (done || prog > 0) ? dColor : '';
            s.style.stroke = done ? '' : (prog > 0 ? dColor : this.GREY);
            s.style.opacity = done ? '1' : (prog > 0 ? '0.6' : '1');
            if (!done && prog <= 0) s.style.stroke = this.GREY;
          }
        }
      } catch(e) {
        console.debug('V.applyState shape error', e);
      }
    });

    if (isCable) el.style.setProperty('--wiring-color', dColor);
    this.setContrast(el);
  },

  updateRam(el, codes, m, overrideColor) {
    const segs = this.qsa(el, '.ram-seg');
    const n = codes.reduce((a, c) => a + (m.get(c) >= 100 ? 1 : 0), 0);
    console.debug('V.updateRam', { id: el.id || null, codes, litCount: n, overrideColor, datasetColor: el.dataset?.color });
    segs.forEach((s, i) => {
      const lit = i < n;
      s.classList.toggle('lit', lit);
      s.classList.toggle('no-current', !lit);

      // Utiliser dans l'ordre : dataset.color, overrideColor fourni par C.update, puis fallback '#00ff41'
      const c = lit ? (el.dataset.color || overrideColor || '#00ff41') : this.GREY;
      s.style.background = c;
      s.style.fill = c;
      s.style.opacity = '1';
    });
  }
};

const C = {
  root: null, map: {},

  init(root, data) {
    this.root = root || document;
    console.info('C.init', { rootProvided: !!root, rootIsDocument: this.root === document });
    if (!this.root) return { update: () => {} };
    M.init(data);
    this.update();
    this.listeners();
    return { update: () => this.update() };
  },

  getCode(el) {
    if (!el) return null;
    const m = (el.id || '').match(/(AC\d+(?:\.\d+)?)/i);
    if (m) return m[1].toUpperCase();
    const ds = el.dataset || {};
    const val = ds.code || ds.ac || ds.dataCode || ds.name;
    if (val) return (val.match(/(AC\d+(?:\.\d+)?)/i)?.[1] || val).toUpperCase();
    return el.querySelector?.('title')?.textContent?.match(/(AC\d+(?:\.\d+)?)/i)?.[1]?.toUpperCase();
  },

  getCodes: s => (s || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean),

  buildMap() {
    console.debug('C.buildMap start');
    const m = {};
    V.qsa(this.root, '*').forEach(n => {
      const c = this.getCode(n);
      if (c) {
        const col = n.dataset?.color || getComputedStyle(n).getPropertyValue('--active-color').trim() || m[c];
        m[c] = col;
        console.debug('C.buildMap mapEntry', { code: c, color: col, elementId: n.id || null });
      }
    });

    const d = M.data;
    if (d && typeof d === 'object') {
      Object.values(d).forEach(g => {
        if (!g) return;
        const lbl = (g.libelle_long || '').toLowerCase();
        const col = Object.entries(V.COLORS).find(([k]) => lbl.includes(k))?.[1];
        if (col) (g.niveaux || []).forEach(n => (n.acs || []).forEach(ac => ac?.code && (m[String(ac.code).toUpperCase()] = col)));
      });
      console.debug('C.buildMap from data', m);
    }
    console.debug('C.buildMap done');
    return m;
  },

  getColor(code) {
    const c = String(code || '').toUpperCase().trim();
    if (this.map[c]) {
      console.debug('C.getColor mapHit', { code: c, color: this.map[c] });
      return this.map[c];
    }
    const el = V.qsa(this.root, '*').find(n => this.getCode(n) === c);
    const result = el?.dataset?.color || (el && getComputedStyle(el).getPropertyValue('--active-color').trim()) || '#00ff41';
    console.debug('C.getColor computed', { code: c, color: result });
    return result;
  },

  update() {
    console.info('C.update start');
    this.map = this.buildMap();

    // Câbles
    V.qsa(this.root, '[data-ac]').forEach(el => {
      const codes = this.getCodes(el.dataset.ac);
      if (!codes.length) return;
      const progs = codes.map(c => M.get(c));
      const appliedProg = Math.max(0, ...progs);
      console.debug('C.update cable', { id: el.id || null, codes, progs, appliedProg });
      V.applyState(el, this.getColor(codes[0]), appliedProg, true);
    });

    // Éléments
    V.qsa(this.root, '*').forEach(el => {
      const c = this.getCode(el);
      if (c) {
        const prog = M.get(c);
        console.debug('C.update element', { id: el.id || null, code: c, prog });
        V.applyState(el, this.getColor(c), prog, false);
      }
    });

    // RAMs — on calcule et on passe la couleur effective
    V.qsa(this.root, '.ram').forEach(el => {
      const codes = this.getCodes(el.dataset.acs || el.dataset.ac);
      const color = el.dataset.color || (codes[0] ? this.getColor(codes[0]) : undefined);
      console.debug('C.update ram', { id: el.id || null, codes, chosenColor: color });
      V.updateRam(el, codes, M, color);
    });
    console.info('C.update done');
  },

  listeners() {
    const u = () => this.update();
    window.addEventListener('storage', e => {
      const relevant = (/AC\d+/i.test(e.key || '') || /AC\d+/.test((e.newValue || '') + (e.oldValue || '')));
      if (relevant) {
        console.debug('C.listeners storage event', { key: e.key, newValue: e.newValue, oldValue: e.oldValue });
        u();
      }
    });
    ['ac:updated', 'parcours:selected'].forEach(evt => {
      window.addEventListener(evt, () => {
        console.debug('C.listeners custom event', evt);
        u();
      });
    });

    if (!this.root.isConnected && this.root !== document) {
      const w = () => this.root.isConnected ? u() : requestAnimationFrame(w);
      requestAnimationFrame(w);
    }
  }
};

export function initWiring(root = document, initialACData = null) {
  console.info('initWiring called', { rootProvided: !!root, initialACDataProvided: !!initialACData });
  return C.init(root, initialACData);
}
