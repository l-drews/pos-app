import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import ProductsPage from "~/pages/products/index.vue";

const { orpc, restoreMock, createMock, updateMock } = vi.hoisted(() => {
  const PRODUCTS = [
    { uuid: "p1", name: "Cola", price: 150, barcode: "4006381", deletedAt: null },
    { uuid: "p2", name: "Old Lemonade", price: 120, barcode: null, deletedAt: "2026-07-01T00:00:00.000Z" },
  ];
  const restoreMock = vi.fn(async (_input: unknown) => ({}));
  const createMock = vi.fn(async (_input: unknown) => ({}));
  const updateMock = vi.fn(async (_input: unknown) => ({}));
  const mutation = (impl?: (input: unknown) => Promise<unknown>) => ({
    mutationOptions: () => ({ mutation: impl ?? (async () => ({})) }),
  });
  // Called inside key()/query() so the reactive input is unwrapped at
  // evaluation time, exactly once per definition of "included".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const includeDeleted = (opts: any) =>
    typeof opts.input === "function" ? !!opts.input().includeDeleted : false;
  const orpc = {
    products: {
      // Mirrors the server: includeDeleted filters, and the key varies with
      // the input so toggling refetches.
      getAll: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryOptions: (opts: any = {}) => ({
          ...opts,
          key: () => ["products", String(includeDeleted(opts))],
          query: async () =>
            includeDeleted(opts)
              ? PRODUCTS
              : PRODUCTS.filter((p) => !p.deletedAt),
        }),
      },
      key: () => ["products"],
      create: mutation((input) => createMock(input)),
      update: mutation((input) => updateMock(input)),
      delete: mutation(),
      restore: mutation((input) => restoreMock(input)),
    },
    cart: {
      key: () => ["cart"],
    },
  };
  return { orpc, restoreMock, createMock, updateMock };
});

mockNuxtImport("useOrpc", () => () => orpc);

describe("products page deleted-products toggle", () => {
  let wrapper: VueWrapper<unknown>;

  const rowNames = () =>
    wrapper
      .findAll("tbody tr")
      .map((row) => row.findAll("td")[0]?.text())
      .filter(Boolean);

  beforeEach(async () => {
    vi.clearAllMocks();
    wrapper = await mountSuspended(ProductsPage);
    await vi.waitFor(() => expect(rowNames()).toHaveLength(1));
  });

  afterEach(() => wrapper.unmount());

  it("hides deleted products by default", () => {
    expect(rowNames().join()).toContain("Cola");
    expect(rowNames().join()).not.toContain("Old Lemonade");
  });

  it("shows deleted products with a badge when toggled on", async () => {
    await wrapper.find("#show-deleted").trigger("click");

    await vi.waitFor(() => expect(rowNames()).toHaveLength(2));
    const deletedRow = wrapper
      .findAll("tbody tr")
      .find((row) => row.text().includes("Old Lemonade"));
    expect(deletedRow!.text()).toContain("deleted");
  });

  it("edits a product with its data prefilled and updates instead of creating", async () => {
    const colaRow = wrapper
      .findAll("tbody tr")
      .find((row) => row.text().includes("Cola"));
    await colaRow!.findAll("button")[0]!.trigger("click"); // pencil

    await vi.waitFor(() =>
      expect(document.querySelector("#product-name")).toBeTruthy(),
    );
    const nameInput = document.querySelector("#product-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Cola");

    nameInput.value = "Cola Max";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    // The Input's useVModel is passive — the parent binding syncs next tick.
    await nextTick();
    const save = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Save",
    ) as HTMLButtonElement;
    save.click();

    await vi.waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: "p1", name: "Cola Max" }),
      ),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("restores a deleted product via its restore action", async () => {
    await wrapper.find("#show-deleted").trigger("click");
    await vi.waitFor(() => expect(rowNames()).toHaveLength(2));

    const deletedRow = wrapper
      .findAll("tbody tr")
      .find((row) => row.text().includes("Old Lemonade"));
    // The archived row offers exactly one action: restore.
    const buttons = deletedRow!.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0]!.trigger("click");

    await vi.waitFor(() =>
      expect(restoreMock).toHaveBeenCalledWith({ uuid: "p2" }),
    );
  });
});
