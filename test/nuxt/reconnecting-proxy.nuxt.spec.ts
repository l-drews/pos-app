import { describe, it, expect } from "vitest";
import { createReconnectingProxy } from "~/utils/reconnecting-proxy";

describe("createReconnectingProxy", () => {
  it("delegates property access to the current target", () => {
    const proxy = createReconnectingProxy(() => ({
      value: 42,
      nested: { deep: "yes" },
    }));

    expect(proxy.value).toBe(42);
    expect(proxy.nested.deep).toBe("yes");
  });

  it("swaps to a fresh target when reconnect is invoked", () => {
    let reconnectFn!: () => void;
    let generation = 0;
    const proxy = createReconnectingProxy((reconnect) => {
      reconnectFn = reconnect;
      const id = ++generation;
      return { which: () => id, nested: { id } };
    });

    expect(proxy.which()).toBe(1);
    expect(proxy.nested.id).toBe(1);

    // Simulates the message-port "close" event firing.
    reconnectFn();

    expect(proxy.which()).toBe(2);
    expect(proxy.nested.id).toBe(2);
  });

  it("re-resolves captured nested functions through the current target", () => {
    // The oRPC vue-colada utils capture procedure references once at store
    // setup; after a reconnect those captures must hit the NEW client.
    let reconnectFn!: () => void;
    let generation = 0;
    const proxy = createReconnectingProxy((reconnect) => {
      reconnectFn = reconnect;
      const id = ++generation;
      return { cart: { addItem: () => `gen-${id}` } };
    });

    const captured = proxy.cart.addItem;
    expect(captured()).toBe("gen-1");

    reconnectFn();

    expect(captured()).toBe("gen-2");
  });

  it("keeps long-lived references to the proxy working across reconnects", () => {
    let reconnectFn!: () => void;
    let generation = 0;
    const proxy = createReconnectingProxy((reconnect) => {
      reconnectFn = reconnect;
      const id = ++generation;
      return { call: () => `gen-${id}` };
    });

    // A consumer (like the oRPC vue-colada utils) captures the wrapper once.
    const captured = proxy;
    expect(captured.call()).toBe("gen-1");
    reconnectFn();
    expect(captured.call()).toBe("gen-2");
  });
});
