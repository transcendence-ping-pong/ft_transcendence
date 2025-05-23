// persist state in localStorage
// keep user preferences, game state, etc (?) to be decided

const savedState = localStorage.getItem('appState');
const initialState = savedState ? JSON.parse(savedState) : {
  language: 'en',
  translations: {} as any,
  // TODO: add other state properties that we need to persist
};

export const state = new Proxy(initialState, {
  set(target, prop, value) {
    target[prop as keyof typeof target] = value;
    localStorage.setItem('appState', JSON.stringify(target));
    return true;
  }
});
