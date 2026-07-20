import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { useShopStore } from "~/stores/shop";

// The store is exercised against a faked oRPC layer: queries resolve fixture
// data, mutations are spies. Pinia and Pinia Colada are the real ones from the
// Nuxt test environment.
const { orpc, createOrderMock, addItemMock } = vi.hoisted(() => {
  const USERS = [
    { uuid: "user-a", firstName: "Ada", lastName: "Aber", barcode: "95700001", balance: 5000 },
    { uuid: "user-b", firstName: "Ben", lastName: "Boll", barcode: "95700002", balance: 2000 },
    { uuid: "user-c", firstName: "Cleo", lastName: "Card", barcode: null, balance: 1000 },
  ];
  const CART = [{ uuid: "cart-1", count: 2, product: { name: "Cola", price: 150 } }];

  const createOrderMock = vi.fn(async (_input: unknown) => ({}));
  const addItemMock = vi.fn(async (_input: unknown) => ({}));

  const query = (key: string, data: unknown) => ({
    queryOptions: () => ({ key: [key], query: async () => data }),
  });
  const mutation = (impl: (input: unknown) => Promise<unknown>) => ({
    mutationOptions: () => ({ mutation: impl }),
  });

  const orpc = {
    cart: {
      getAll: query("cart", CART),
      key: () => ["cart"],
      addItem: mutation((input) => addItemMock(input)),
      update: mutation(async () => ({})),
      delete: mutation(async () => ({})),
    },
    users: {
      getAll: query("users", USERS),
      key: () => ["users"],
    },
    products: {
      getAll: query("products", [
        { uuid: "prod-1", name: "Cola", price: 150, barcode: "4006381" },
      ]),
      key: () => ["products"],
    },
    orders: {
      getAll: query("orders", []),
      key: () => ["orders"],
      create: mutation((input) => createOrderMock(input)),
    },
  };
  return { orpc, createOrderMock, addItemMock };
});

mockNuxtImport("useOrpc", () => () => orpc);

const StoreHarness = defineComponent({
  setup() {
    const shop = useShopStore();
    return { shop };
  },
  template: "<div />",
});

type Shop = ReturnType<typeof useShopStore>;

let wrapper: VueWrapper<unknown> | null = null;
let shop: Shop | null = null;

async function setupStore(): Promise<Shop> {
  wrapper = await mountSuspended(StoreHarness);
  shop = (wrapper.vm as unknown as { shop: Shop }).shop;
  const store = shop;
  await vi.waitFor(() => {
    expect(store.allUsers?.length).toBe(3);
    expect(store.cartItems?.length).toBe(1);
  });
  return store;
}

describe("shop store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOrderMock.mockImplementation(async () => ({}));
  });

  afterEach(() => {
    wrapper?.unmount();
    // Drop the cached store instance so each test starts with fresh state.
    shop?.$dispose();
    wrapper = null;
    shop = null;
  });

  it("selects a user scanned by barcode", async () => {
    const store = await setupStore();

    store.selectUser("95700001");
    await vi.waitFor(() => expect(store.currentUser?.uuid).toBe("user-a"));
    expect(store.disablePayment).toBe(false);
  });

  it("adds a product to the cart by uuid", async () => {
    const store = await setupStore();

    store.addCartItemByUuid("prod-1");

    await vi.waitFor(() =>
      expect(addItemMock).toHaveBeenCalledWith({ productUuid: "prod-1" }),
    );
  });

  it("can select a user that has no barcode", async () => {
    const store = await setupStore();

    expect(typeof store.selectUserByUuid).toBe("function");
    store.selectUserByUuid("user-c");
    await vi.waitFor(() => expect(store.currentUser?.uuid).toBe("user-c"));
  });

  it("clears the user selection after a successful payment", async () => {
    const store = await setupStore();
    store.selectUser("95700001");
    await vi.waitFor(() => expect(store.currentUser?.uuid).toBe("user-a"));

    await store.createOrder();

    expect(createOrderMock).toHaveBeenCalledWith({ userUuid: "user-a" });
    expect(store.currentUser).toBeNull();
  });

  it("does not create an order when no user is selected", async () => {
    const store = await setupStore();

    await store.createOrder();

    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("keeps a newly selected user when the previous order settles", async () => {
    const store = await setupStore();
    store.selectUser("95700001");
    await vi.waitFor(() => expect(store.currentUser?.uuid).toBe("user-a"));

    let resolveOrder!: (value: unknown) => void;
    const orderSettled = new Promise((resolve) => { resolveOrder = resolve; });
    createOrderMock.mockImplementation(() => orderSettled);

    // Scanner flow: pay user A's cart, then user B steps up while the order
    // request is still in flight.
    const paying = store.createOrder();
    store.selectUser("95700002");
    resolveOrder({});
    await paying;

    expect(createOrderMock).toHaveBeenCalledWith({ userUuid: "user-a" });
    expect(store.currentUser?.uuid).toBe("user-b");
  });

  it("resolves createOrder and keeps the selection when payment fails", async () => {
    const store = await setupStore();
    store.selectUser("95700001");
    await vi.waitFor(() => expect(store.currentUser?.uuid).toBe("user-a"));

    createOrderMock.mockRejectedValue(new Error("Insufficient balance"));

    // Feedback happens via the error toast; callers must not be left with an
    // unhandled rejection, and the cashier must not lose the selected user.
    await expect(store.createOrder()).resolves.toBeUndefined();
    expect(store.currentUser?.uuid).toBe("user-a");
  });

  it("disables payment while an order is in flight", async () => {
    const store = await setupStore();
    store.selectUser("95700001");
    await vi.waitFor(() => expect(store.disablePayment).toBe(false));

    let resolveOrder!: (value: unknown) => void;
    const orderSettled = new Promise((resolve) => { resolveOrder = resolve; });
    createOrderMock.mockImplementation(() => orderSettled);

    const paying = store.createOrder();
    await nextTick();
    expect(store.disablePayment).toBe(true);

    resolveOrder({});
    await paying;
  });
});
