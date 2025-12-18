import { htmlToDOM } from "../../lib/utils.js";
import template from "./template.html?raw";
import { animateFan } from '../../lib/animation.js';

class TreeSkillView {
  constructor() {
    this.root = htmlToDOM(template);
  }

  html() {
    return template;
  }

  dom() {
    return this.root;
  }
}

const WiringModel = {
  data: null,

  init(d) {
    this.data = d;
  },

  parse(v) {
    return Number(String(v).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') || '0');
  },

  get(code) {
    const k = String(code || '').toUpperCase().trim();
    if (!k) return 0;

    const raw = localStorage.getItem(k);
    if (raw != null) return this.parse(raw);

    const all = Object.keys(localStorage)
      .filter(key => /^AC\d+/i.test(key))
      .reduce((acc, key) => {
        acc[key.toUpperCase()] = this.parse(localStorage.getItem(key));
        return acc;
      }, {});

    const match = Object.keys(all).find(key => key.includes(k) || k.includes(key));
    return match ? all[match] : 0;
  }
};

const WiringView = {
  COLORS: {
    comprendre: '#ff77d1',
    concevoir: '#ffd700',
    exprimer: '#8a2be2',
    developper: '#00ff41',
    développer: '#00ff41',
    entreprendre: '#06D1FF'
  },
  GREY: '#6f7a84',

  qsa: (el, s) => Array.from(el?.querySelectorAll(s) || []),

  applyState(el, color, prog, isCable = false) {
    if (!el) return;

    const done = prog >= 100;
    const activeColor = prog > 0 ? (color || this.GREY) : this.GREY;

    el.classList.toggle('has-current', done);
    el.classList.toggle('no-current', !done);

    let shapes = this.qsa(el, 'path, rect, circle, ellipse, polygon, polyline, line');
    if (!shapes.length && /path|rect|circle|line/i.test(el.tagName)) shapes = [el];

    shapes.forEach(s => {
      s.dataset.os = s.dataset.os || s.getAttribute('stroke') || '';
      s.dataset.osw = s.dataset.osw || s.getAttribute('stroke-width') || s.style.strokeWidth || '2';

      if (isCable) {
        Object.assign(s.style, {
          stroke: activeColor,
          strokeOpacity: done ? '1' : (prog > 0 ? '0.75' : '0.6'),
          opacity: done ? '1' : (prog > 0 ? '0.85' : '0.9'),
          fill: 'none'
        });
      } else {
        const isBgFg = /^background|^forground/i.test(s.id || '');
        if (isBgFg) {
          Object.assign(s.style, {
            stroke: (done || prog > 0) ? activeColor : this.GREY,
            opacity: done ? '1' : (prog > 0 ? '0.7' : '1'),
            fill: '#000'
          });
        } else {
          Object.assign(s.style, {
            fill: (done || prog > 0) ? activeColor : '',
            stroke: done ? '' : (prog > 0 ? activeColor : this.GREY),
            opacity: done ? '1' : (prog > 0 ? '0.6' : '1')
          });
          if (!done && prog <= 0) s.style.stroke = this.GREY;
        }
      }
    });

    if (isCable) el.style.setProperty('--wiring-color', activeColor);

    this.qsa(el, '.label, text').forEach(n => {
      n.style.color = this.GREY;
      n.style.fill = this.GREY;
    });

    if (el?.classList?.contains('ac-chip') || /AC\d+/.test(el?.id)) {
      el.style.color = this.GREY;
      if (!el.classList.contains('has-current')) {
        this.qsa(el, 'path, rect, circle, ellipse, polygon, polyline, line').forEach(s => {
          if (/^background|^forground/i.test(s.id || '')) {
            s.style.stroke = this.GREY;
          } else {
            s.style.fill = this.GREY;
          }
        });
      }
    }
  },

  updateRam(el, codes, overrideColor) {
    const segs = this.qsa(el, '.ram-seg');
    const litCount = codes.reduce((sum, c) => sum + (WiringModel.get(c) >= 100 ? 1 : 0), 0);

    segs.forEach((s, i) => {
      const lit = i < litCount;
      s.classList.toggle('lit', lit);
      s.classList.toggle('no-current', !lit);

      const color = lit ? (el.dataset.color || overrideColor || '#00ff41') : this.GREY;
      Object.assign(s.style, {
        background: color,
        fill: color,
        opacity: '1'
      });
    });
  }
};

const WiringController = {
  root: null,
  map: {},

  init(root, data) {
    this.root = root || document;
    if (!this.root) return { update: () => {} };

    WiringModel.init(data);
    this.update();
    this.listeners();
    return { update: () => this.update() };
  },

  getCode(el) {
    if (!el) return null;

    const idMatch = (el.id || '').match(/(AC\d+(?:\.\d+)?)/i);
    if (idMatch) return idMatch[1].toUpperCase();

    const ds = el.dataset || {};
    const val = ds.code || ds.ac || ds.dataCode || ds.name;
    if (val) {
      return (val.match(/(AC\d+(?:\.\d+)?)/i)?.[1] || val).toUpperCase();
    }

    return el.querySelector?.('title')?.textContent?.match(/(AC\d+(?:\.\d+)?)/i)?.[1]?.toUpperCase();
  },

  getCodes: s => (s || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean),

  buildMap() {
    const map = {};

    WiringView.qsa(this.root, '*').forEach(n => {
      const code = this.getCode(n);
      if (code) {
        map[code] = n.dataset?.color ||
          getComputedStyle(n).getPropertyValue('--active-color').trim() ||
          map[code];
      }
    });

    if (WiringModel.data && typeof WiringModel.data === 'object') {
      Object.values(WiringModel.data).forEach(group => {
        if (!group) return;

        const label = (group.libelle_long || '').toLowerCase();
        const color = Object.entries(WiringView.COLORS).find(([k]) => label.includes(k))?.[1];

        if (color) {
          (group.niveaux || []).forEach(niveau => {
            (niveau.acs || []).forEach(ac => {
              if (ac?.code) map[String(ac.code).toUpperCase()] = color;
            });
          });
        }
      });
    }

    return map;
  },

  getColor(code) {
    const c = String(code || '').toUpperCase().trim();
    if (this.map[c]) return this.map[c];

    const el = WiringView.qsa(this.root, '*').find(n => this.getCode(n) === c);
    return el?.dataset?.color ||
      (el && getComputedStyle(el).getPropertyValue('--active-color').trim()) ||
      '#00ff41';
  },

  updateFans() {
    const fanElements = WiringView.qsa(this.root, '.fan');

    fanElements.forEach(el => {
      let codes = [];
      el.querySelectorAll('*').forEach(desc => {
        const code = this.getCode(desc);
        if (code && !codes.includes(code)) {
          codes.push(code);
        }
      });

      if (!codes.length) {
        const fanName = el.id.replace(/^Ventilateur\s*/i, '').toLowerCase().trim();


        const normalize = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedFanName = normalize(fanName);

        Object.keys(this.map).forEach(acCode => {
          const color = this.map[acCode];
          const matchColor = Object.entries(WiringView.COLORS).find(([k, v]) => {
            const normalizedKey = normalize(k);
            return v === color && (
              normalizedFanName.includes(normalizedKey) ||
              normalizedKey.includes(normalizedFanName)
            );
          });

          if (matchColor) {
            codes.push(acCode);
          }
        });
      }

      if (!codes.length) return;

      const litCount = codes.reduce((sum, c) =>
        sum + (WiringModel.get(c) >= 100 ? 1 : 0), 0
      );

      animateFan(el, litCount, codes.length, {
        minDuration: 1.5,
        maxDuration: 5.0
      });
    });
  },

  update() {
    this.map = this.buildMap();

    WiringView.qsa(this.root, '[data-ac]').forEach(el => {
      const codes = this.getCodes(el.dataset.ac);
      if (!codes.length) return;

      const maxProg = Math.max(0, ...codes.map(c => WiringModel.get(c)));
      WiringView.applyState(el, this.getColor(codes[0]), maxProg, true);
    });

    WiringView.qsa(this.root, '*').forEach(el => {
      const code = this.getCode(el);
      if (code) {
        WiringView.applyState(el, this.getColor(code), WiringModel.get(code), false);
      }
    });

    WiringView.qsa(this.root, '.ram').forEach(el => {
      const codes = this.getCodes(el.dataset.acs || el.dataset.ac);
      const color = el.dataset.color || (codes[0] ? this.getColor(codes[0]) : undefined);
      WiringView.updateRam(el, codes, color);
    });

    this.updateFans();
  },

  listeners() {
    const update = () => this.update();

    window.addEventListener('storage', e => {
      if (/AC\d+/i.test(e.key || '') || /AC\d+/.test((e.newValue || '') + (e.oldValue || ''))) {
        update();
      }
    });

    ['ac:updated', 'parcours:selected'].forEach(evt => {
      window.addEventListener(evt, update);
    });

    if (!this.root.isConnected && this.root !== document) {
      const waitForConnection = () => {
        this.root.isConnected ? update() : requestAnimationFrame(waitForConnection);
      };
      requestAnimationFrame(waitForConnection);
    }
  }
};

export function initWiring(root = document, initialACData = null) {
  return WiringController.init(root, initialACData);
}
export { TreeSkillView };
