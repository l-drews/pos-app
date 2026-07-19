import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import ProductPage from "~/pages/products/[uuid].vue";

// Midday UTC timestamps so local-day grouping is stable in UTC CI runners
// and in local (UTC+1/+2) runs alike.
const { orpc } = vi.hoisted(() => {
  const PRODUCT = {
    uuid: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    name: "Club-Mate",
    price: 250,
    barcode: "4006381",
  };
  const SALES = [
    {
      uuid: "i1",
      count: 2,
      amount: 300,
      createdAt: "2026-07-19T09:00:00.000Z",
      order: { uuid: "o1", createdAt: "2026-07-19T09:00:00.000Z", user: { firstName: "Ada", lastName: "Aber" } },
    },
    {
      uuid: "i2",
      count: 1,
      amount: 100,
      createdAt: "2026-07-18T10:00:00.000Z",
      order: { uuid: "o2", createdAt: "2026-07-18T10:00:00.000Z", user: { firstName: "Ben", lastName: "Boll" } },
    },
    {
      uuid: "i3",
      count: 3,
      amount: 450,
      createdAt: "2026-07-18T12:00:00.000Z",
      order: { uuid: "o3", createdAt: "2026-07-18T12:00:00.000Z", user: { firstName: "Ada", lastName: "Aber" } },
    },
  ];
  const query = (key: string, data: unknown) => ({
    queryOptions: (extra: object = {}) => ({
      key: [key],
      query: async () => data,
      ...extra,
    }),
  });
  const orpc = {
    products: {
      getByUuid: query("product", PRODUCT),
      key: () => ["products"],
    },
    orders: {
      getSalesByProduct: query("sales", SALES),
      key: () => ["orders"],
    },
  };
  return { orpc };
});

mockNuxtImport("useOrpc", () => () => orpc);

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport("navigateTo", () => navigateToMock);

describe("product detail page", () => {
  let wrapper: VueWrapper<unknown>;

  const dailyRows = () =>
    wrapper
      .findAll("table")[0]!
      .findAll("tbody tr")
      .map((row) => row.findAll("td").map((cell) => cell.text()));

  beforeEach(async () => {
    wrapper = await mountSuspended(ProductPage, {
      route: "/products/3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    });
    await vi.waitFor(() => expect(wrapper.text()).toContain("Club-Mate"));
  });

  afterEach(() => wrapper.unmount());

  it("shows the product header and sales stats", () => {
    expect(wrapper.text()).toContain("Club-Mate");
    expect(wrapper.text()).toContain("2,50"); // price
    expect(wrapper.text()).toContain("4006381"); // barcode
    expect(wrapper.text()).toContain("6"); // units sold
    expect(wrapper.text()).toContain("8,50"); // total revenue
  });

  it("groups sales by day, newest first", async () => {
    await vi.waitFor(() => expect(dailyRows()).toHaveLength(2));
    expect(dailyRows()[0]).toEqual(["19.07.2026", "2", expect.stringContaining("3,00")]);
    expect(dailyRows()[1]).toEqual(["18.07.2026", "4", expect.stringContaining("5,50")]);
  });

  it("links a sales day to the summary detail page", async () => {
    navigateToMock.mockClear();
    await vi.waitFor(() => expect(dailyRows()).toHaveLength(2));
    await wrapper.findAll("table")[0]!.findAll("tbody tr")[1]!.trigger("click");
    expect(navigateToMock).toHaveBeenCalledWith("/summary/2026-07-18");
  });
});
