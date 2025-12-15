# Architecture Frontend - SAE3.01

## Vue d'ensemble

Cette application est une Single Page Application (SPA) construite avec une architecture modulaire et scalable. Elle repose sur trois concepts principaux :

- **Layouts** : Structures de page réutilisables (header, footer, sidebar)
- **Pages** : Composants de haut niveau représentant une route
- **UI Components** : Composants réutilisables pour construire les pages

## Structure des dossiers

```
client/src/
├── layouts/           # Structures de page réutilisables
│   └── root/
│       ├── layout.js
│       └── template.html
│
├── pages/            # Pages de l'application (une par route)
│   ├── home/
│   │   ├── page.js
│   │   └── template.html
│   ├── products/
│   │   ├── page.js
│   │   └── template.html
│   └── productDetail/
│       ├── page.js
│       └── template.html
│
├── ui/               # Composants UI réutilisables
│   ├── header/
│   │   ├── index.js
│   │   └── template.html
│   ├── footer/
│   │   ├── index.js
│   │   └── template.html
│   ├── product/
│   │   ├── index.js
│   │   └── template.html
│   └── detail/
│       ├── index.js
│       └── template.html
│
├── data/             # Chargeurs de données (API calls)
│   └── product.js
│
├── lib/              # Utilitaires et helpers
│   ├── router.js
│   └── utils.js
│
└── main.js          # Point d'entrée (configuration des routes)
```

---

## 1. Layouts

### Concept

Les layouts définissent la **structure globale** d'une ou plusieurs pages (header, footer, sidebar, etc.). Ils utilisent des **slots** pour indiquer où insérer :
- Le contenu de la page (slot par défaut `<slot></slot>`)
- Des composants spécifiques (slots nommés `<slot name="header"></slot>`)

### Exemple : Layout Root

**`layouts/root/template.html`**
```html
<div style="min-height: 100vh; display: flex; flex-direction: column;">
  <slot name="header"></slot>
  <main style="flex: 1; padding: 2rem;">
    <slot></slot>
  </main>
  <slot name="footer"></slot>
</div>
```

**`layouts/root/layout.js`**
```javascript
import template from "./template.html?raw";
import { htmlToFragment } from "../../lib/utils.js";
import { HeaderView } from "../../ui/header/index.js";
import { FooterView } from "../../ui/footer/index.js";

export function RootLayout() {
  let layout = htmlToFragment(template);
  
  // Générer les composants
  let header = HeaderView.dom();
  let footer = FooterView.dom();
  
  // Remplacer les slots nommés
  layout.querySelector('slot[name="header"]').replaceWith(header);
  layout.querySelector('slot[name="footer"]').replaceWith(footer);
  
  return layout;
}
```

### Enregistrement d'un layout

Dans `main.js` :
```javascript
import { RootLayout } from "./layouts/root/layout.js";

router.addLayout("/", RootLayout);
```

Toutes les routes commençant par "/" utiliseront ce layout automatiquement.

---

## 2. Pages

### Concept

Les pages représentent le **contenu principal** d'une route. Elles peuvent être :

- **Statiques** : contenu fixe en HTML (ex: page d'accueil, à propos)
- **Dynamiques** : contenu généré depuis des données (ex: liste de produits, détail produit)

Les pages suivent le pattern **MVC** :
- **Model (M)** : Données de la page
- **Controller (C)** : Logique métier et orchestration
- **View (V)** : Génération du DOM et gestion des événements

### Exemple : Page statique (Home)

**`pages/home/template.html`**
```html
<div class="mx-auto max-w-4xl p-6">
  <h1 class="mb-6 text-4xl font-bold">Accueil</h1>
  <img src="https://images.unsplash.com/..." alt="..." class="mb-6 rounded-lg" />
  <nav class="flex gap-4">
    <a href="/about" data-link class="btn">À propos</a>
    <a href="/products" data-link class="btn">Voir les produits</a>
  </nav>
</div>
```

**`pages/home/page.js`**
```javascript
import template from "./template.html?raw";

export function HomePage() {
  return template;
}
```

### Exemple : Page dynamique (Products)

**`pages/products/template.html`**
```html
<div>
  <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 2rem;">
    Tous nos produits !
  </h1>
  <slot name="products"></slot>
</div>
```

**`pages/products/page.js`**
```javascript
import { ProductData } from "../../data/product.js";
import { ProductView } from "../../ui/product/index.js";
import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

let M = {
  products: []
};

let C = {};

C.handler_clickOnProduct = function(ev) {
  if (ev.target.dataset.buy !== undefined) {
    let id = ev.target.dataset.buy;
    alert(`Le produit d'identifiant ${id} ? Excellent choix !`);
  }
}

C.init = async function() {
  M.products = await ProductData.fetchAll(); 
  return V.init(M.products);
}

let V = {};

V.init = function(data) {
  let fragment = V.createPageFragment(data);
  V.attachEvents(fragment);
  return fragment;
}

V.createPageFragment = function(data) {
  // Créer le fragment depuis le template
  let pageFragment = htmlToFragment(template);
  
  // Générer les produits via le composant UI
  let productsDOM = ProductView.dom(data);
  
  // Remplacer le slot par les produits
  pageFragment.querySelector('slot[name="products"]').replaceWith(productsDOM);
  
  return pageFragment;
}

V.attachEvents = function(pageFragment) {
  let root = pageFragment.firstElementChild;
  root.addEventListener("click", C.handler_clickOnProduct);
  return pageFragment;
}

export function ProductsPage(params) {
  return C.init();
}
```

### Enregistrement d'une page

Dans `main.js` :
```javascript
import { HomePage } from "./pages/home/page.js";
import { ProductsPage } from "./pages/products/page.js";

router.addRoute("/", HomePage);
router.addRoute("/products", ProductsPage);
```

---

## 3. Composants UI

### Concept

Les composants UI sont des **éléments réutilisables** utilisés dans les pages ou layouts. Ils exposent deux méthodes :

- **`html(data)`** : Retourne le HTML sous forme de string
- **`dom(data)`** : Retourne un DocumentFragment

### Types de composants

#### Composant statique (sans données dynamiques)

**`ui/header/template.html`**
```html
<header style="background: #333; color: white; padding: 1rem;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <h2 style="margin: 0;">Click & Collect</h2>
    <nav style="display: flex; gap: 1rem;">
      <a href="/" data-link>Accueil</a>
      <a href="/products" data-link>Produits</a>
      <a href="/about" data-link>À propos</a>
    </nav>
  </div>
</header>
```

**`ui/header/index.js`**
```javascript
import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

let HeaderView = {
  html: function() {
    return template;
  },

  dom: function() {
    return htmlToFragment(template);
  }
};

export { HeaderView };
```

#### Composant dynamique (avec placeholders)

**`ui/product/template.html`**
```html
<article class="rounded-lg bg-white p-6 shadow-md">
  <span class="text-sm text-gray-500">ID: {{id}}</span>
  <h3 class="mb-4 text-xl font-bold">{{name}}</h3>
  <button 
    data-buy="{{id}}" 
    class="w-full rounded-lg bg-green-600 px-4 py-2 text-white"
  >
    Acheter
  </button>
</article>
```

**`ui/product/index.js`**
```javascript
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";

let ProductView = {
  html: function(data) {
    let htmlString = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">';
    for (let obj of data) {
      htmlString += genericRenderer(template, obj);
    }
    return htmlString + '</div>';
  },

  dom: function(data) {
    return htmlToFragment(ProductView.html(data));
  }
};

export { ProductView };
```

**Note :** `genericRenderer(template, data)` remplace les placeholders `{{key}}` par les valeurs de l'objet `data`.

---

## Guides pratiques

### Ajouter un nouveau composant UI

1. **Créer le dossier** : `ui/mon-composant/`
2. **Créer le template** : `ui/mon-composant/template.html`
   ```html
   <div class="mon-composant">
     <h2>{{title}}</h2>
     <p>{{content}}</p>
   </div>
   ```
3. **Créer l'index.js** : `ui/mon-composant/index.js`
   ```javascript
   import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
   import template from "./template.html?raw";

   let MonComposantView = {
     html: function(data) {
       return genericRenderer(template, data);
     },

     dom: function(data) {
       return htmlToFragment(MonComposantView.html(data));
     }
   };

   export { MonComposantView };
   ```
4. **Utiliser le composant** dans une page ou un layout :
   ```javascript
   import { MonComposantView } from "../../ui/mon-composant/index.js";
   
   let html = MonComposantView.html({ title: "Titre", content: "Contenu" });
   let dom = MonComposantView.dom({ title: "Titre", content: "Contenu" });
   ```

### Ajouter une nouvelle page statique

1. **Créer le dossier** : `pages/ma-page/`
2. **Créer le template** : `pages/ma-page/template.html`
   ```html
   <div>
     <h1>Ma nouvelle page</h1>
     <p>Contenu statique</p>
   </div>
   ```
3. **Créer page.js** : `pages/ma-page/page.js`
   ```javascript
   import template from "./template.html?raw";

   export function MaPage() {
     return template;
   }
   ```
4. **Enregistrer la route** dans `main.js` :
   ```javascript
   import { MaPage } from "./pages/ma-page/page.js";
   
   router.addRoute("/ma-page", MaPage);
   ```

### Ajouter une nouvelle page dynamique

1. **Créer le dossier** : `pages/ma-page-dynamique/`
2. **Créer le template** : `pages/ma-page-dynamique/template.html`
   ```html
   <div>
     <h1>Ma page dynamique</h1>
     <slot name="contenu"></slot>
   </div>
   ```
3. **Créer page.js** : `pages/ma-page-dynamique/page.js`
   ```javascript
   import { MonDataLoader } from "../../data/mon-data.js";
   import { MonComposantView } from "../../ui/mon-composant/index.js";
   import { htmlToFragment } from "../../lib/utils.js";
   import template from "./template.html?raw";

   let M = {
     data: []
   };

   let C = {};

   C.init = async function() {
     M.data = await MonDataLoader.fetchAll();
     return V.init(M.data);
   }

   let V = {};

   V.init = function(data) {
     let fragment = V.createPageFragment(data);
     V.attachEvents(fragment);
     return fragment;
   }

   V.createPageFragment = function(data) {
     let pageFragment = htmlToFragment(template);
     let contenuDOM = MonComposantView.dom(data);
     pageFragment.querySelector('slot[name="contenu"]').replaceWith(contenuDOM);
     return pageFragment;
   }

   V.attachEvents = function(pageFragment) {
     // Attacher les event listeners ici
     return pageFragment;
   }

   export function MaPageDynamique(params) {
     return C.init();
   }
   ```
4. **Enregistrer la route** dans `main.js` :
   ```javascript
   import { MaPageDynamique } from "./pages/ma-page-dynamique/page.js";
   
   router.addRoute("/ma-page-dynamique", MaPageDynamique);
   ```

### Ajouter un nouveau layout

1. **Créer le dossier** : `layouts/mon-layout/`
2. **Créer le template** : `layouts/mon-layout/template.html`
   ```html
   <div class="mon-layout">
     <slot name="header"></slot>
     <aside class="sidebar">
       <slot name="sidebar"></slot>
     </aside>
     <main>
       <slot></slot>
     </main>
     <slot name="footer"></slot>
   </div>
   ```
3. **Créer layout.js** : `layouts/mon-layout/layout.js`
   ```javascript
   import template from "./template.html?raw";
   import { htmlToFragment } from "../../lib/utils.js";
   import { HeaderView } from "../../ui/header/index.js";
   import { FooterView } from "../../ui/footer/index.js";
   import { SidebarView } from "../../ui/sidebar/index.js";

   export function MonLayout() {
     let layout = htmlToFragment(template);
     let header = HeaderView.dom();
     let footer = FooterView.dom();
     let sidebar = SidebarView.dom();
     
     layout.querySelector('slot[name="header"]').replaceWith(header);
     layout.querySelector('slot[name="footer"]').replaceWith(footer);
     layout.querySelector('slot[name="sidebar"]').replaceWith(sidebar);
     
     return layout;
   }
   ```
4. **Enregistrer le layout** dans `main.js` :
   ```javascript
   import { MonLayout } from "./layouts/mon-layout/layout.js";
   
   router.addLayout("/admin", MonLayout);
   ```

---

## Flux de données

### Page statique
```
Route → Handler → Page (template HTML) → Layout → DOM
```

### Page dynamique
```
Route → Handler → Page (MVC)
                    ↓
        Model ← Data Loader (API)
                    ↓
        View ← UI Components
                    ↓
        Controller → DOM Events
                    ↓
                  Layout → DOM
```

---

## Concepts clés

### Slots

Les **slots** sont des emplacements réservés dans un template HTML qui seront remplacés par du contenu dynamique.

- **Slot par défaut** : `<slot></slot>` (pour le contenu principal)
- **Slot nommé** : `<slot name="header"></slot>` (pour des zones spécifiques)

Remplacement d'un slot :
```javascript
pageFragment.querySelector('slot[name="header"]').replaceWith(headerDOM);
```

### genericRenderer

Fonction utilitaire qui remplace les placeholders `{{key}}` dans un template HTML par les valeurs d'un objet.

```javascript
let template = "<h1>{{title}}</h1><p>{{content}}</p>";
let data = { title: "Titre", content: "Contenu" };
let html = genericRenderer(template, data);
// Résultat : "<h1>Titre</h1><p>Contenu</p>"
```

### htmlToFragment

Fonction utilitaire qui convertit une chaîne HTML en DocumentFragment.

```javascript
let html = "<div><h1>Titre</h1></div>";
let fragment = htmlToFragment(html);
// Résultat : DocumentFragment contenant le DOM
```

**Avantage** : Le DocumentFragment peut être manipulé (querySelector, replaceWith, etc.) avant d'être inséré dans le DOM.

---

## Bonnes pratiques

### 1. Séparation des responsabilités

- **Layouts** : Structure globale uniquement
- **Pages** : Orchestration et logique métier
- **UI Components** : Rendu visuel réutilisable

### 2. Pattern MVC dans les pages dynamiques

- **Model (M)** : Stockage des données
- **Controller (C)** : Logique métier et handlers
- **View (V)** : Génération du DOM et attachement des événements

### 3. Utiliser les slots

Privilégier les slots pour les layouts et les pages avec des parties modulaires.

### 4. Utiliser DocumentFragment

Les pages et layouts doivent retourner des `DocumentFragment` pour permettre la manipulation avant insertion dans le DOM.

### 5. Nommer les event handlers

Préfixer les handlers avec `handler_` pour la lisibilité :
```javascript
C.handler_clickOnButton = function(ev) { ... }
```

### 6. Séparer création du DOM et attachement des événements

```javascript
V.init = function(data) {
  let fragment = V.createPageFragment(data);  // Création
  V.attachEvents(fragment);                    // Événements
  return fragment;
}
```

---

## Outils utilitaires

### `genericRenderer(template, data)`

Remplace les placeholders dans un template.

**Localisation** : `lib/utils.js`

### `htmlToFragment(htmlString)`

Convertit une chaîne HTML en DocumentFragment.

**Localisation** : `lib/utils.js`

---

## Conclusion

Cette architecture modulaire permet de :
- ✅ Réutiliser facilement des composants
- ✅ Maintenir une séparation claire des responsabilités
- ✅ Ajouter de nouvelles pages/composants facilement
- ✅ Gérer des pages statiques et dynamiques de manière cohérente
- ✅ Faciliter les tests et la maintenance

Pour plus d'informations sur le système de routing, consultez la documentation dédiée au Router.
