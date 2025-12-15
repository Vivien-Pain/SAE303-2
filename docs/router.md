# Documentation du Router

## Vue d'ensemble

Le Router est un système de routage côté client (SPA) qui gère la navigation entre les pages sans rechargement du navigateur. Il supporte :

- ✅ Routes simples et dynamiques
- ✅ Paramètres d'URL (slugs)
- ✅ Layouts hiérarchiques
- ✅ Guards d'authentification
- ✅ Routes 404 (catch-all)
- ✅ Handlers synchrones et asynchrones
- ✅ Contenu HTML string ou DocumentFragment

---

## Initialisation

### Syntaxe de base

```javascript
import { Router } from "./lib/router.js";

const router = new Router('app', options);
```

### Paramètres

- **`id`** (string, requis) : ID de l'élément DOM où injecter le contenu des pages
- **`options`** (object, optionnel) :
  - `loginPath` (string) : Chemin de la page de connexion (défaut: `/login`)

### Exemple

```javascript
const router = new Router('app', { loginPath: '/signin' });
```

---

## Routes simples

### Ajouter une route

```javascript
router.addRoute(path, handler, options);
```

#### Paramètres

- **`path`** (string) : Chemin de la route (ex: `/`, `/about`, `/products`)
- **`handler`** (function) : Fonction qui retourne le contenu de la page
- **`options`** (object, optionnel) :
  - `requireAuth` (boolean) : Nécessite une authentification (défaut: `false`)
  - `useLayout` (boolean) : Utilise un layout (défaut: `true`)

### Exemples

```javascript
// Route statique simple
router.addRoute("/", HomePage);

// Route statique avec page
router.addRoute("/about", AboutPage);

// Route sans layout
router.addRoute("/login", LoginPage, { useLayout: false });

// Route protégée (authentification requise)
router.addRoute("/dashboard", DashboardPage, { requireAuth: true });
```

---

## Routes dynamiques (avec paramètres)

### Syntaxe

Utilisez `:paramName` pour définir un paramètre dynamique dans le chemin.

```javascript
router.addRoute("/products/:id", ProductDetailPage);
router.addRoute("/users/:userId/posts/:postId", UserPostPage);
```

### Récupération des paramètres

Les paramètres sont passés automatiquement au handler sous forme d'objet.

```javascript
export function ProductDetailPage(params) {
  console.log(params.id); // Accès au paramètre :id
  // ...
}
```

### Exemple complet

**Route :**
```javascript
router.addRoute("/products/:id", ProductDetailPage);
```

**Handler :**
```javascript
export function ProductDetailPage(params) {
  const productId = params.id;
  
  // Charger le produit avec l'ID
  return fetch(`/api/products/${productId}`)
    .then(res => res.json())
    .then(product => {
      return `<h1>${product.name}</h1>`;
    });
}
```

**Utilisation :**
```html
<a href="/products/123" data-link>Voir le produit 123</a>
```

---

## Layouts

### Concept

Les layouts permettent de définir une structure commune (header, footer, sidebar) pour un ensemble de routes.

### Ajouter un layout

```javascript
router.addLayout(pathPrefix, layoutFunction);
```

#### Paramètres

- **`pathPrefix`** (string) : Préfixe de route (ex: `/`, `/dashboard`)
- **`layoutFunction`** (function) : Fonction qui retourne un DocumentFragment

### Règles de correspondance

Le router choisit le layout avec le **préfixe le plus long** qui correspond à la route.

```javascript
router.addLayout("/", RootLayout);           // Pour toutes les routes
router.addLayout("/dashboard", DashboardLayout); // Plus spécifique
```

**Exemples :**
- `/` → Utilise `RootLayout`
- `/about` → Utilise `RootLayout`
- `/dashboard` → Utilise `DashboardLayout`
- `/dashboard/profile` → Utilise `DashboardLayout`

### Exemple de layout

**Layout avec slots :**
```javascript
import { htmlToFragment } from "../../lib/utils.js";
import template from "./template.html?raw";
import { HeaderView } from "../../ui/header/index.js";
import { FooterView } from "../../ui/footer/index.js";

export function RootLayout() {
  let layout = htmlToFragment(template);
  
  // Remplacer les slots nommés
  layout.querySelector('slot[name="header"]').replaceWith(HeaderView.dom());
  layout.querySelector('slot[name="footer"]').replaceWith(FooterView.dom());
  
  return layout;
}
```

**Template du layout :**
```html
<div class="layout">
  <slot name="header"></slot>
  <main>
    <slot></slot> <!-- Le contenu de la page sera inséré ici -->
  </main>
  <slot name="footer"></slot>
</div>
```

### Désactiver le layout pour une route

```javascript
router.addRoute("/login", LoginPage, { useLayout: false });
```

---

## Authentification

### Configuration

Le router gère l'authentification avec un système de guards.

```javascript
const router = new Router('app', { loginPath: '/login' });
```

### Définir l'état d'authentification

```javascript
router.setAuth(true);  // Utilisateur connecté
router.setAuth(false); // Utilisateur déconnecté
```

### Routes protégées

```javascript
router.addRoute("/dashboard", DashboardPage, { requireAuth: true });
router.addRoute("/profile", ProfilePage, { requireAuth: true });
```

### Comportement

1. L'utilisateur accède à une route protégée sans être connecté
2. Le router sauvegarde l'URL dans `sessionStorage`
3. Le router redirige vers `loginPath`
4. Après connexion (`router.login()`), l'utilisateur est redirigé vers l'URL sauvegardée

### Exemple complet

**Configuration :**
```javascript
const router = new Router('app', { loginPath: '/login' });

// Routes publiques
router.addRoute("/", HomePage);
router.addRoute("/about", AboutPage);

// Page de connexion (sans layout)
router.addRoute("/login", LoginPage, { useLayout: false });

// Routes protégées
router.addRoute("/dashboard", DashboardPage, { requireAuth: true });
router.addRoute("/profile", ProfilePage, { requireAuth: true });

router.start();
```

**Page de login :**
```javascript
export function LoginPage() {
  return `
    <div class="login-page">
      <h1>Connexion</h1>
      <button id="loginBtn">Se connecter</button>
    </div>
  `;
}
```

**Event listener (géré automatiquement par le router) :**

Le router écoute automatiquement les clics sur `#loginBtn` et appelle `router.login()`.

**Déconnexion :**

Le router écoute automatiquement les clics sur `#logoutBtn` et appelle `router.logout()`.

---

## Navigation

### Navigation par liens

Ajoutez l'attribut `data-link` aux liens pour une navigation SPA.

```html
<a href="/" data-link>Accueil</a>
<a href="/products" data-link>Produits</a>
<a href="/products/123" data-link>Produit 123</a>
```

Le router intercepte automatiquement les clics et empêche le rechargement de la page.

### Navigation programmatique

```javascript
router.navigate('/products');
router.navigate('/products/123');
```

### Boutons de navigation du navigateur

Le router gère automatiquement les boutons précédent/suivant du navigateur grâce à l'événement `popstate`.

---

## Route 404 (catch-all)

### Syntaxe

Utilisez `*` comme chemin pour capturer toutes les routes non définies.

```javascript
router.addRoute("*", The404Page);
```

### Exemple

```javascript
export function The404Page() {
  return `
    <div class="error-page">
      <h1>404 - Page non trouvée</h1>
      <p>La page que vous recherchez n'existe pas.</p>
      <a href="/" data-link>Retour à l'accueil</a>
    </div>
  `;
}
```

**Important :** La route 404 doit être définie **en dernier** car elle capture toutes les routes.

---

## Handlers asynchrones

Le router supporte les handlers qui retournent des **Promises**.

### Exemple

```javascript
export async function ProductsPage() {
  // Charger les données depuis une API
  const products = await fetch('/api/products').then(r => r.json());
  
  // Générer le contenu
  return `
    <h1>Produits</h1>
    <div class="products">
      ${products.map(p => `<div>${p.name}</div>`).join('')}
    </div>
  `;
}
```

Le router attend automatiquement la résolution de la Promise avant d'afficher le contenu.

---

## Types de contenu supportés

Le router accepte deux types de contenu retournés par les handlers :

### 1. HTML String

```javascript
export function HomePage() {
  return `<h1>Bienvenue</h1>`;
}
```

### 2. DocumentFragment

```javascript
import { htmlToFragment } from "../../lib/utils.js";

export function HomePage() {
  return htmlToFragment(`<h1>Bienvenue</h1>`);
}
```

**Recommandation :** Utilisez `DocumentFragment` pour les pages complexes car il permet la manipulation du DOM avant insertion.

---

## Démarrage du router

Une fois toutes les routes et layouts configurés, démarrez le router :

```javascript
router.start();
```

Cette méthode :
1. Analyse l'URL actuelle
2. Trouve la route correspondante
3. Exécute le handler
4. Applique le layout
5. Insère le contenu dans le DOM

---

## Exemple complet

```javascript
import { Router } from "./lib/router.js";
import { HomePage } from "./pages/home/page.js";
import { AboutPage } from "./pages/about/page.js";
import { ProductsPage } from "./pages/products/page.js";
import { ProductDetailPage } from "./pages/productDetail/page.js";
import { DashboardPage } from "./pages/dashboard/page.js";
import { LoginPage } from "./pages/login/page.js";
import { The404Page } from "./pages/404/page.js";
import { RootLayout } from "./layouts/root/layout.js";
import { DashboardLayout } from "./layouts/dashboard/layout.js";

// Initialisation
const router = new Router('app', { loginPath: '/login' });

// Layouts
router.addLayout("/", RootLayout);
router.addLayout("/dashboard", DashboardLayout);

// Routes publiques
router.addRoute("/", HomePage);
router.addRoute("/about", AboutPage);
router.addRoute("/products", ProductsPage);
router.addRoute("/products/:id", ProductDetailPage);

// Page de connexion (sans layout)
router.addRoute("/login", LoginPage, { useLayout: false });

// Routes protégées
router.addRoute("/dashboard", DashboardPage, { requireAuth: true });
router.addRoute("/dashboard/profile", ProfilePage, { requireAuth: true });

// Route 404 (toujours en dernier)
router.addRoute("*", The404Page);

// Démarrage
router.start();
```

---

## API complète

### Constructeur

```javascript
new Router(id, options)
```

### Méthodes publiques

| Méthode | Description |
|---------|-------------|
| `addRoute(path, handler, options)` | Ajoute une route |
| `addLayout(pathPrefix, layoutFn)` | Ajoute un layout |
| `navigate(path)` | Navigue vers une route |
| `setAuth(isAuth)` | Définit l'état d'authentification |
| `login()` | Connecte l'utilisateur |
| `logout()` | Déconnecte l'utilisateur |
| `start()` | Démarre le router |

### Options de route

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `requireAuth` | boolean | `false` | Route protégée par authentification |
| `useLayout` | boolean | `true` | Utilise le layout correspondant |

---

## Bonnes pratiques

### 1. Ordre de déclaration

```javascript
// 1. Layouts (du plus général au plus spécifique)
router.addLayout("/", RootLayout);
router.addLayout("/admin", AdminLayout);

// 2. Routes spécifiques
router.addRoute("/products/:id", ProductDetailPage);

// 3. Routes générales
router.addRoute("/products", ProductsPage);

// 4. Route 404 (toujours en dernier)
router.addRoute("*", The404Page);
```

### 2. Toujours utiliser `data-link`

```html
<!-- ✅ Bon -->
<a href="/products" data-link>Produits</a>

<!-- ❌ Mauvais (recharge la page) -->
<a href="/products">Produits</a>
```

### 3. Gérer les erreurs dans les handlers asynchrones

```javascript
export async function ProductsPage() {
  try {
    const products = await fetch('/api/products').then(r => r.json());
    return ProductView.dom(products);
  } catch (error) {
    console.error('Erreur de chargement:', error);
    return `<div class="error">Erreur de chargement des produits</div>`;
  }
}
```

### 4. Utiliser les layouts pour la cohérence visuelle

Regroupez les routes avec une structure similaire sous le même layout.

### 5. Séparer les routes publiques et protégées

```javascript
// Routes publiques
router.addRoute("/", HomePage);
router.addRoute("/about", AboutPage);

// Routes protégées
router.addRoute("/dashboard", DashboardPage, { requireAuth: true });
router.addRoute("/profile", ProfilePage, { requireAuth: true });
```

---

## Dépannage

### Le contenu ne s'affiche pas

- ✅ Vérifiez que l'élément DOM avec l'ID spécifié existe
- ✅ Vérifiez que `router.start()` est appelé
- ✅ Vérifiez que le handler retourne bien du contenu

### Les liens rechargent la page

- ✅ Ajoutez l'attribut `data-link` aux liens

### Le layout ne s'applique pas

- ✅ Vérifiez que le layout contient un `<slot></slot>`
- ✅ Vérifiez que le layout retourne un `DocumentFragment`
- ✅ Vérifiez que l'option `useLayout` n'est pas à `false`

### Les paramètres ne sont pas récupérés

- ✅ Vérifiez la syntaxe du chemin : `/products/:id` (avec `:`)
- ✅ Vérifiez que le handler accepte un paramètre `params`

---

## Conclusion

Le Router offre un système de routing complet et flexible pour les SPA, avec support des layouts, de l'authentification et des routes dynamiques. Il s'intègre parfaitement avec l'architecture modulaire de l'application.

Pour plus d'informations sur l'architecture générale, consultez `ARCHITECTURE.md`.
