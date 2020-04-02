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
  },

  transactionsStack: [],
  transactionsMapping: new WeakMap(),

  addTransaction(fn) {
    this.transactionsStack.push(fn);
    this.transactionsMapping.set(fn, new Set());
  },

  endTransaction() {
    const fn = this.transactionsStack.pop();
    const changed = this.transactionsMapping.get(fn);
    const observers = [...changed].reduce((acc, id) => {
      const observers = this.mapping.get(id);
      if (observers == null) {
        return acc;
      }
      observers.forEach(o => acc.add(o));
      return acc;
    }, new Set());
    observers.forEach(fn => fn());
  },

  getLastTransaction() {
    return this.transactionsStack[this.transactionsStack.length - 1];
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
      if (registry.transactionsStack.length) {
        const activeTransaction = registry.getLastTransaction();
        registry.transactionsMapping.get(activeTransaction).add(internalId);
        return;
      }
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

function transaction(fn: () => void) {
  registry.addTransaction(fn);
  fn();
  registry.endTransaction();
}

const value = atom(0);

autorun(() => {
  console.log(`Got: ${value.get()}`);
});

value.set(1);

transaction(() => {
  value.set(2);
  value.set(3);
  value.set(4);
});
