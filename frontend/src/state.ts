/*
  States responsabilities:
  - persist state in localStorage
  - store user preferences (language, theme, sound, etc)
  - store game state (current level, score, etc)
  - provide a way to access and modify state
  - watch for changes and rerender UI accordingly (?)
  - provide a way to reset state (e.g. on logout)
  - provide a way to initialize state (e.g. on first load) (?)

  Do not:
  - handle user authentication or session management directly
*/

const savedState = localStorage.getItem('appState');
const initialState = savedState ? JSON.parse(savedState) : {
  language: 'en',
  translations: {} as any,
  availableLanguages: [] as string[],
  theme: 'primary',
  soundEnabled: true,
  scaleFactor: {},
  // TODO: add other state properties that we need to persist
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
export const state = new Proxy(initialState, {
  set(target, prop, value) {
    target[prop as keyof typeof target] = value;
    localStorage.setItem('appState', JSON.stringify(target));
    return true;
  }
});
