import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import ShopPage from "~/pages/shop.vue";

// The page delegates all data handling to the shop store; these tests pin down
// the page's own responsibility: turning global keystrokes (from a barcode
// scanner acting as a keyboard) into the right store calls.
const { mockShop } = vi.hoisted(() => {
  const mockShop = {
    userBarcode: "",
    searchString: "",
    cartItems: [] as unknown[],
    allUsers: [] as unknown[],
    allProducts: [] as unknown[],
    currentUser: null as { uuid: string; barcode: string | null } | null,
    filteredUsers: [] as unknown[],
    paymentTotal: 0,
    todaysOrderTotal: 0,
    disablePayment: true,
    addCartItem: vi.fn(),
    addCartItemByUuid: vi.fn(),
    incrementCount: vi.fn(),
    decrementCount: vi.fn(),
    deleteItem: vi.fn(),
    createOrder: vi.fn(),
    selectUser: vi.fn(),
    selectUserByUuid: vi.fn(),
    refreshCart: vi.fn(),
  };
  return { mockShop };
});

mockNuxtImport("useShopStore", () => () => mockShop);

function pressKeys(keys: string, target: EventTarget = window) {
  for (const key of keys) {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  }
}

function pressEnter(target: EventTarget = window) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
  );
}

describe("shop page scanner handling", () => {
  let wrapper: VueWrapper<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(mockShop, {
      userBarcode: "",
      searchString: "",
      cartItems: [],
      allUsers: [],
      allProducts: [],
      currentUser: null,
      filteredUsers: [],
      paymentTotal: 0,
      todaysOrderTotal: 0,
      disablePayment: true,
    });
    wrapper = await mountSuspended(ShopPage);
  });

  afterEach(() => {
    // Remove the page's window keydown listener between tests.
    wrapper.unmount();
  });

  it("adds a scanned product barcode to the cart", () => {
    pressKeys("4006381");
    pressEnter();

    expect(mockShop.addCartItem).toHaveBeenCalledWith("4006381");
    expect(mockShop.createOrder).not.toHaveBeenCalled();
  });

  it("selects the user for a scanned user barcode", () => {
    pressKeys("95712345");
    pressEnter();

    expect(mockShop.selectUser).toHaveBeenCalledWith("95712345");
    expect(mockShop.createOrder).not.toHaveBeenCalled();
  });

  it("pays the open cart before switching to a newly scanned user", () => {
    mockShop.currentUser = { uuid: "user-a", barcode: "95700001" };
    mockShop.userBarcode = "95700001";
    mockShop.paymentTotal = 300;

    pressKeys("95700002");
    pressEnter();

    expect(mockShop.createOrder).toHaveBeenCalledTimes(1);
    expect(mockShop.selectUser).toHaveBeenCalledWith("95700002");
  });

  it("does not pay when re-scanning the already selected user", () => {
    mockShop.currentUser = { uuid: "user-a", barcode: "95700001" };
    mockShop.userBarcode = "95700001";
    mockShop.paymentTotal = 300;

    pressKeys("95700001");
    pressEnter();

    expect(mockShop.createOrder).not.toHaveBeenCalled();
    expect(mockShop.selectUser).toHaveBeenCalledWith("95700001");
  });

  it("pays the open cart on user switch even when the current user was picked via the combobox", () => {
    // A combobox selection never goes through the scanner, so userBarcode
    // stays empty — the switch must be detected via the selected user itself.
    mockShop.currentUser = { uuid: "user-a", barcode: "95700001" };
    mockShop.userBarcode = "";
    mockShop.paymentTotal = 300;

    pressKeys("95700002");
    pressEnter();

    expect(mockShop.createOrder).toHaveBeenCalledTimes(1);
    expect(mockShop.selectUser).toHaveBeenCalledWith("95700002");
  });

  it("pays on a bare Enter press outside of form controls", () => {
    pressEnter();

    expect(mockShop.createOrder).toHaveBeenCalledTimes(1);
  });

  it("discards an unrecognized scan buffer instead of creating an order", () => {
    // 1-3 digits are neither a product barcode (>= 4 digits) nor a user
    // barcode (8 digits) — e.g. a mistyped digit or a partial scan.
    pressKeys("12");
    pressEnter();

    expect(mockShop.createOrder).not.toHaveBeenCalled();
    expect(mockShop.addCartItem).not.toHaveBeenCalled();
    expect(mockShop.selectUser).not.toHaveBeenCalled();

    // The discarded buffer must not leak into the next scan.
    pressKeys("4006381");
    pressEnter();
    expect(mockShop.addCartItem).toHaveBeenCalledWith("4006381");
  });

  it("does not create an order when Enter activates a focused button", () => {
    // Enter on a focused button already triggers that button's click; the
    // global handler treating it as "pay" would double-fire an action.
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    pressEnter(button);

    expect(mockShop.createOrder).not.toHaveBeenCalled();
    button.remove();
  });

  it("still captures scanner input while a button has focus", () => {
    // After clicking a cart button, focus stays on it — a scan arriving then
    // must still work.
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    pressKeys("4006381", button);
    pressEnter(button);

    expect(mockShop.addCartItem).toHaveBeenCalledWith("4006381");
    expect(mockShop.createOrder).not.toHaveBeenCalled();
    button.remove();
  });

  it("adds a product via the search combobox without a scanner", async () => {
    // The mock store is not reactive, so set the products before mounting.
    mockShop.allProducts = [
      { uuid: "p1", name: "Cola", price: 150, barcode: "4006381" },
      { uuid: "p2", name: "Fanta", price: 200, barcode: null },
    ];
    wrapper.unmount();
    wrapper = await mountSuspended(ShopPage);

    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Add product"))!
      .trigger("click");

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Cola"),
    );
    const option = [...document.querySelectorAll('[role="option"]')].find(
      (el) => el.textContent?.includes("Cola"),
    ) as HTMLElement | undefined;
    expect(option).toBeTruthy();
    option!.click();

    await vi.waitFor(() =>
      expect(mockShop.addCartItemByUuid).toHaveBeenCalledWith("p1"),
    );
    // The popover stays open so several items can be added in a row.
    expect(document.body.textContent).toContain("Fanta");
  });

  it("ignores keystrokes typed into text inputs", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    pressKeys("4006381", input);
    pressEnter(input);

    expect(mockShop.addCartItem).not.toHaveBeenCalled();
    expect(mockShop.createOrder).not.toHaveBeenCalled();
    input.remove();
  });
});
