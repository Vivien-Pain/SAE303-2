// Classe Router avec paramètres dynamiques, guards et layouts
class Router {
  constructor(id, options = {}) {
    let root = document.getElementById(id);

    if (!root) {
      root = document.createElement('div');
      console.warn(`Element with id "${id}" not found. Creating a new div as root.`);
      document.body.appendChild(root);
    }

    this.root = root;
    this.routes = [];
    this.layouts = {};
    this.currentRoute = null;
    this.isAuthenticated = false;
    this.loginPath = options.loginPath || '/login';
    
    // Écouter les changements d'URL
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Intercepter les clics sur les liens
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        this.navigate(e.target.getAttribute('href'));
      }
    });
  }
  
  // Définir l'état d'authentification
  setAuth(isAuth) {
    this.isAuthenticated = isAuth;
  }
  
  // Enregistrer un layout pour un segment de route
  addLayout(pathPrefix, layoutFn) {
    this.layouts[pathPrefix] = layoutFn;
    return this;
  }
  
  // Trouver le layout correspondant à un chemin
  findLayout(path) {
    // Chercher le segment le plus spécifique (le plus long qui match)
    let matchedLayout = null;
    let longestMatch = 0;
    
    for (const [prefix, layout] of Object.entries(this.layouts)) {
      if (path.startsWith(prefix) && prefix.length > longestMatch) {
        matchedLayout = layout;
        longestMatch = prefix.length;
      }
    }
    
    return matchedLayout;
  }
  
  // Ajouter une route
  addRoute(path, handler, options = {}) {
    const regex = this.pathToRegex(path);
    const keys = this.extractParams(path);
    this.routes.push({ 
      path, 
      regex, 
      keys, 
      handler,
      requireAuth: options.requireAuth || false,
      useLayout: options.useLayout !== false // true par défaut
    });
    return this;
  }

  pathToRegex(path) {
    if (path === '*') return /.*/;
    
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '([^\\/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp('^' + pattern + '$');
  }

  extractParams(path) {
    const params = [];
    const matches = path.matchAll(/:(\w+)/g);
    for (const match of matches) {
      params.push(match[1]);
    }
    return params;
  }

  getParams(route, path) {
    const matches = path.match(route.regex);
    if (!matches) return {};
    
    const params = {};
    route.keys.forEach((key, i) => {
      params[key] = matches[i + 1];
    });
    return params;
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    this.handleRoute();
  }

  handleRoute() {
    const path = window.location.pathname;

    for (const route of this.routes) {
      if (route.regex.test(path)) {
        if (route.requireAuth && !this.isAuthenticated) {
          sessionStorage.setItem('redirectAfterLogin', path);
          this.navigate(this.loginPath);
          return;
        }
        
        this.currentRoute = path;
        const params = this.getParams(route, path);

        const content = route.handler(params);
        
        if (content instanceof Promise) {
          content.then(res => {
            this.renderContent(res, route, path);
          });
        } else {
          this.renderContent(content, route, path);
        }
        return;
      }
    }

    const notFound = this.routes.find(r => r.path === '*');
    if (notFound) {
      const content = notFound.handler({});
      this.root.innerHTML = content;
    }
  }

  renderContent(content, route, path) {
    const isFragment = content instanceof DocumentFragment;
    const isElement = content instanceof HTMLElement;
    
    if (route.useLayout) {
      const layoutFn = this.findLayout(path);
      if (layoutFn) {

        const layoutFragment = layoutFn();

        const contentSlot = layoutFragment.querySelector('slot');
        
        if (contentSlot) {
          if (isElement ||isFragment) {
            contentSlot.replaceWith(content);
          } else {
            const tempFragment = document.createElement('template');
            tempFragment.innerHTML = content;
            contentSlot.replaceWith(tempFragment.content);
          }
        } else {
          console.warn('Layout does not contain a <slot> element. Content will not be inserted.');
        }

        this.root.innerHTML = '';
        this.root.appendChild(layoutFragment);
      } else {
        // Pas de layout trouvé, afficher directement
        if (isElement) {
          this.root.innerHTML = '';
          this.root.appendChild(content);
        } else {
          this.root.innerHTML = content;
        }
      }
    } else {
      // Pas de layout, afficher directement
      if (isElement || isFragment) {
        this.root.innerHTML = '';
        this.root.appendChild(content);
      } else {
        this.root.innerHTML = content;
      }
    }
    
    // Attacher les event listeners après le rendu
    this.attachEventListeners(path);
  }
  
  // Attacher les event listeners après le rendu
  attachEventListeners(path) {
    // Event listener pour le bouton de login
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.login();
      });
    }
    
    // Event listener pour le bouton de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }
  
  // Se connecter et rediriger vers la page demandée
  login() {
    this.setAuth(true);
    const redirect = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    this.navigate(redirect || '/dashboard');
  }
  
  // Se déconnecter
  logout() {
    this.setAuth(false);
    this.navigate(this.loginPath);
  }
  
  // Démarrer le routeur
  start() {
    this.handleRoute();
  }
}

export { Router };