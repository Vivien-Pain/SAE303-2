import { htmlToDOM } from "@/lib/utils.js";

const template = `
<div class="parcours-modal-overlay">
  <div class="parcours-modal">
    <h2>Choisissez votre parcours de 3ème année</h2>
    <p>Cela adaptera l'arbre de compétences à votre spécialisation.</p>
    <div class="parcours-choices">
      <button data-target="dev" class="btn-parcours developper">
        <span class="text">Développement Web</span>
        <small>(Focus: Développer)</small>
      </button>
      <button data-target="des" class="btn-parcours exprimer">
        <span class="text">Création Numérique</span>
        <small>(Focus: Exprimer)</small>
      </button>
      <button data-target="com" class="btn-parcours concevoir">
        <span class="text">Stratégie Com.</span>
        <small>(Focus: Concevoir)</small>
      </button>
    </div>
    <button class="btn-reset">Voir tout</button>
  </div>
</div>
`;

export class ParcoursSelector {
  constructor(onSelectCallback) {
    this.element = htmlToDOM(template);
    this.callback = onSelectCallback;
    this.initEvents();
  }

  dom() {
    return this.element;
  }

  initEvents() {
    const buttons = this.element.querySelectorAll(".btn-parcours");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        this.select(target);
      });
    });

    const resetBtn = this.element.querySelector(".btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.select("all"));
    }
  }

  select(choice) {
    try {
      if (choice === "all") {
        localStorage.removeItem("parcours");
      } else {
        localStorage.setItem("parcours", choice);
      }
    } catch (e) {
    }

    if (this.callback) {
      setTimeout(() => {
        try {
          this.callback(choice);
        } catch (e) {
        }
      }, 0);
    }

    try {
      const evt = new CustomEvent("parcours:selected", { detail: { choice }, bubbles: true });
      window.dispatchEvent(evt);
    } catch (e) {
    }

    this.element.classList.add("fade-out");
    setTimeout(() => {
      if (this.element && this.element.remove) this.element.remove();
    }, 500);
  }

  show(parent = document.body) {
    if (!this.element.isConnected) {
      parent.appendChild(this.dom());
    }
  }

  static showIfNeeded(onSelectCallback, parent = document.body) {
    const saved = ParcoursSelector.getSaved();
    if (saved) {
      if (onSelectCallback) {
        try { onSelectCallback(saved); } catch (e) {}
      }
      try {
        const evt = new CustomEvent("parcours:selected", { detail: { choice: saved }, bubbles: true });
        window.dispatchEvent(evt);
      } catch (e) {}
      return null;
    }
    const selector = new ParcoursSelector(onSelectCallback);
    selector.show(parent);
    return selector;
  }

  static getSaved() {
    try {
      return localStorage.getItem("parcours");
    } catch (e) {
      return null;
    }
  }
}
