import { describe, it, expect, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ShopPage from "~/pages/shop.vue";

// Regression test for the frozen-cart bug: the shop store outlives the first
// shop-page visit, and its query subscriptions deactivate when that first
// page unmounts. On a later visit the page must re-subscribe, so that the
// cache invalidation after a scanned product still refetches the cart —
// without that, the scan writes the cart row server-side but the UI only
// shows it after a full reload.
const { orpc, CART, addItemMock } = vi.hoisted(() => {
  const CART = [
    { uuid: "cart-1", count: 1, product: { name: "Cola", price: 150 } },
  ] as Array<Record<string, unknown>>;
  const addItemMock = vi.fn(async (_input: unknown) => ({}));
  // Copy on read so a refetch always yields a new array identity.
  const query = (key: string, data: () => unknown[]) => ({
    queryOptions: () => ({ key: [key], query: async () => [...data()] }),
  });
  const mutation = (impl?: (input: unknown) => Promise<unknown>) => ({
    mutationOptions: () => ({ mutation: impl ?? (async () => ({})) }),
  });
  const orpc = {
    cart: {
      getAll: query("cart", () => CART),
      key: () => ["cart"],
      addItem: mutation((input) => addItemMock(input)),
      update: mutation(),
      delete: mutation(),
    },
    users: { getAll: query("users", () => []), key: () => ["users"] },
    products: { getAll: query("products", () => []), key: () => ["products"] },
    orders: {
      getAll: query("orders", () => []),
      key: () => ["orders"],
      create: mutation(),
    },
  };
  return { orpc, CART, addItemMock };
});

mockNuxtImport("useOrpc", () => () => orpc);

function scan(code: string) {
  for (const key of code) {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  }
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
  );
}

describe("shop page cart freshness across visits", () => {
  it("shows a scanned product in the cart on a revisit of the page", async () => {
    // First visit instantiates the shop store; navigating away unmounts the
    // page, deactivating the store's own query subscriptions.
    const first = await mountSuspended(ShopPage);
    await vi.waitFor(() => expect(first.text()).toContain("Cola"));
    first.unmount();

    const second = await mountSuspended(ShopPage);
    await vi.waitFor(() => expect(second.text()).toContain("Cola"));

    // The server-side cart gains the scanned product; the invalidation after
    // addItem must refetch it into the visible cart without a page reload.
    CART.push({ uuid: "cart-2", count: 1, product: { name: "Fanta", price: 200 } });
    scan("4006381");

    await vi.waitFor(() =>
      expect(addItemMock).toHaveBeenCalledWith({ barcode: "4006381" }),
    );
    await vi.waitFor(() => expect(second.text()).toContain("Fanta"));
    second.unmount();
  });
});
