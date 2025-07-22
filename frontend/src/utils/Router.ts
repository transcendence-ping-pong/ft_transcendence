type RouteRenderFn = (containerId: string) => void;

export function initRouter(
  routes: Record<string, RouteRenderFn>,
  renderTargetId: string
): (path: string) => void {
  function renderRoute(path: string) {
    const render = routes[path];
    const contentDiv = document.getElementById(renderTargetId);
    if (render && contentDiv) {
      render(renderTargetId);
    } else if (contentDiv) {
      contentDiv.innerHTML = `<h1>404 Not Found</h1>`;
    }
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
