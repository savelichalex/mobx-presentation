// @flow
const registry = {
  mapping: new Map(),

  activeObserversStack: [],

  addActiveObserver(fn: () => void) {
    this.activeObserversStack.push(fn);
  },

  removeActiveObserver() {
    this.activeObserversStack.pop();
  },

  getLastObserver() {
    return this.activeObserversStack[this.activeObserversStack.length - 1];
  }
};

type Atom<T> = {
  get: () => T,
  set: T => void
};

let id = 0;
function atom<T>(initial: T): Atom<T> {
  let value = initial;
  const internalId = ++id;
  return {
    get() {
      if (registry.activeObserversStack.length) {
        const topObserver = registry.getLastObserver();
        if (!registry.mapping.has(internalId)) {
          registry.mapping.set(internalId, new Set([topObserver]));
        } else {
          registry.mapping.get(internalId).add(topObserver);
        }
      }
      return value;
    },
    set(newValue) {
      value = newValue;
      if (registry.mapping.has(internalId)) {
        registry.mapping.get(internalId).forEach(observer => {
          registry.addActiveObserver(observer);
          observer();
          registry.removeActiveObserver();
        });
      }
    }
  };
}

function autorun(fn: () => void) {
  registry.addActiveObserver(fn);
  fn();
  registry.removeActiveObserver();
}

const value = atom(0);
const printIt = atom(false);

autorun(() => {
  (() => {
    console.log(`Got: ${value.get()}`);
  })();
});

value.set(1);
value.set(2);
value.set(3);
