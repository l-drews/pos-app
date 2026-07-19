/**
 * Wraps a connect() factory in a stable, deeply-delegating proxy so that
 * long-lived consumers — including captured nested references like
 * `client.cart.addItem` — keep working after the underlying target is
 * replaced. connect() receives a reconnect callback that swaps in a fresh
 * target; used by the Electron oRPC client to survive message-port channel
 * loss.
 *
 * Property paths are re-resolved against the CURRENT target on every access
 * and every call: primitives are returned live, objects and functions are
 * wrapped in callable path proxies.
 */
export function createReconnectingProxy<T extends object>(
  connect: (reconnect: () => void) => T,
): T {
  let current: T;
  const reconnect = () => {
    current = connect(reconnect);
  };
  reconnect();

  const resolve = (path: PropertyKey[]): unknown =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path.reduce<any>((acc, key) => (acc == null ? acc : acc[key]), current);

  const makePathProxy = (path: PropertyKey[]): unknown =>
    new Proxy(function () {}, {
      get(_target, prop) {
        // Symbols (e.g. well-known protocol checks) are answered live rather
        // than extending the path.
        if (typeof prop === "symbol") {
          const parent = resolve(path);
          return parent == null ? undefined : Reflect.get(parent as object, prop);
        }
        const value = resolve([...path, prop]);
        if (value === null || value === undefined) return value;
        if (typeof value === "object" || typeof value === "function") {
          return makePathProxy([...path, prop]);
        }
        return value;
      },
      apply(_target, _thisArg, args) {
        const fn = resolve(path);
        if (typeof fn !== "function") {
          throw new TypeError(`${String(path.join("."))} is not a function`);
        }
        const parent = path.length > 1 ? resolve(path.slice(0, -1)) : current;
        return Reflect.apply(fn, parent, args);
      },
      has(_target, prop) {
        const parent = resolve(path);
        return parent == null ? false : Reflect.has(parent as object, prop);
      },
    });

  return makePathProxy([]) as T;
}
