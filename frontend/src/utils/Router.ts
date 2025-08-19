import { state } from '@/state';

type RouteRenderFn = (containerId: string, params?: Record<string, string>) => void;

export function initRouter(
  routes: Record<string, RouteRenderFn>,
  renderTargetId: string
): (path: string) => void {
  // track current path to run leave hooks (e.g., leaving /game)
  let currentPath = window.location.pathname;
  function matchRoute(path: string) {
    for (const route in routes) {
      // match dynamic segment like /profile/:username
      const routeParts = route.split('/');
      const pathParts = path.split('/');
      if (routeParts.length === pathParts.length) {
        let params: Record<string, string> = {};
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
          } else if (routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }
        if (match) return { render: routes[route], params };
      }
    }
    return { render: undefined, params: {} };
  }

  function isAuthenticated() {
    return !!state?.userData?.accessToken;
  }

  function renderRoute(path: string) {
    // if navigating away from game page, leave multiplayer room cleanly
    try {
      if (currentPath === '/game' && path !== '/game') {
        const mgr = (window as any).remoteMultiplayerManager;
        if (mgr && typeof mgr.isInRoom === 'function' && mgr.isInRoom()) {
          if (typeof mgr.leaveRoom === 'function') mgr.leaveRoom();
        }
      }
    } catch {}
    // protect all routes except login
    // TODO: in the future, we might want to leave home unprotected
    if (!isAuthenticated() && path !== '/login') {
      window.history.replaceState({}, '', '/login');
      path = '/login';
    }
    if (isAuthenticated() && path === '/login') {
      window.history.replaceState({}, '', '/');
      path = '/';
    }

    const { render, params } = matchRoute(path);
    const contentDiv = document.getElementById(renderTargetId);
    
    // Clean up previous page if cleanup function exists
    if ((window as any).cleanupGame) {
      (window as any).cleanupGame();
      (window as any).cleanupGame = undefined;
    }
    
    if (render && contentDiv) {
      render(renderTargetId, params);
    } else if (contentDiv) {
      contentDiv.innerHTML = `<h1>404 Not Found</h1>`;
    }

    // notify backend of current page for presence-aware features
    try {
      const wss = (window as any).websocketService;
      if (wss && typeof wss.emit === 'function') {
        wss.emit('updatePresence', { path });
      }
    } catch {}

    // update current path after successful navigation
    currentPath = path;
  }

  window.addEventListener('popstate', () => {
    renderRoute(window.location.pathname);
  });

  // initial render
  renderRoute(window.location.pathname);

  // navigation helper
  return function navigate(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      renderRoute(path);
    }
  };
}
