import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import SummaryDayPage from "~/pages/summary/[date].vue";

// Revenue figures are chosen so the top-5 orderings differ from both
// insertion order and alphabetical order.
const { orpc } = vi.hoisted(() => {
  const ada = { uuid: "ua", firstName: "Ada", lastName: "Aber" };
  const ben = { uuid: "ub", firstName: "Ben", lastName: "Boll" };
  const cola = { uuid: "p1", name: "Cola" };
  const fanta = { uuid: "p2", name: "Fanta" };
  const water = { uuid: "p3", name: "Water" };

  const ORDERS = [
    {
      uuid: "o1",
      userUuid: ada.uuid,
      user: ada,
      amount: 400,
      createdAt: "2026-07-19T09:00:00.000Z",
      items: [
        { uuid: "i1", productUuid: cola.uuid, product: cola, count: 2, amount: 300 },
        { uuid: "i2", productUuid: water.uuid, product: water, count: 1, amount: 100 },
      ],
    },
    {
      uuid: "o2",
      userUuid: ben.uuid,
      user: ben,
      amount: 1000,
      createdAt: "2026-07-19T11:00:00.000Z",
      items: [
        { uuid: "i3", productUuid: fanta.uuid, product: fanta, count: 3, amount: 750 },
        { uuid: "i4", productUuid: cola.uuid, product: cola, count: 1, amount: 250 },
      ],
    },
    {
      uuid: "o3",
      userUuid: ada.uuid,
      user: ada,
      amount: 200,
      createdAt: "2026-07-19T14:00:00.000Z",
      items: [
        { uuid: "i5", productUuid: water.uuid, product: water, count: 2, amount: 200 },
      ],
    },
  ];

  const orpc = {
    orders: {
      getByRange: {
        queryOptions: (extra: object = {}) => ({
          key: ["orders", "range"],
          query: async () => ORDERS,
          ...extra,
        }),
      },
      key: () => ["orders"],
    },
  };
  return { orpc };
});

mockNuxtImport("useOrpc", () => () => orpc);

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport("navigateTo", () => navigateToMock);

describe("summary day page", () => {
  let wrapper: VueWrapper<unknown>;

  const tableColumn = (tableIndex: number, cellIndex = 0) =>
    wrapper
      .findAll("table")[tableIndex]!
      .findAll("tbody tr")
      .map((row) => row.findAll("td")[cellIndex]?.text())
      .filter(Boolean);

  beforeEach(async () => {
    wrapper = await mountSuspended(SummaryDayPage, {
      route: "/summary/2026-07-19",
    });
    await vi.waitFor(() =>
      expect(wrapper.text()).not.toContain("Loading..."),
    );
  });

  afterEach(() => wrapper.unmount());

  it("shows the day heading and stats", () => {
    expect(wrapper.text()).toContain("19.07.2026");
    expect(wrapper.text()).toContain("Orders");
    // 3 orders, 1600 total, 533 average
    expect(wrapper.text()).toContain("16,00");
    expect(wrapper.text()).toContain("5,33");
  });

  it("ranks top products by revenue", () => {
    expect(tableColumn(0)).toEqual(["Fanta", "Cola", "Water"]); // 750, 550, 300
  });

  it("ranks top customers by amount spent", () => {
    expect(tableColumn(1)).toEqual(["Ben Boll", "Ada Aber"]); // 1000, 600
  });

  it("lists the day's orders", () => {
    expect(tableColumn(2)).toHaveLength(3);
  });

  it("opens the product page when a top product is clicked", async () => {
    navigateToMock.mockClear();
    const topProductRows = wrapper.findAll("table")[0]!.findAll("tbody tr");
    await topProductRows[0]!.trigger("click"); // Fanta
    expect(navigateToMock).toHaveBeenCalledWith("/products/p2");
  });

  it("opens the user page when a top customer is clicked", async () => {
    navigateToMock.mockClear();
    const topCustomerRows = wrapper.findAll("table")[1]!.findAll("tbody tr");
    await topCustomerRows[0]!.trigger("click"); // Ben
    expect(navigateToMock).toHaveBeenCalledWith("/users/ub");
  });

  it("shows an invalid-date state for a malformed route param", async () => {
    const bad = await mountSuspended(SummaryDayPage, {
      route: "/summary/not-a-date",
    });
    expect(bad.text()).toContain("Invalid date");
    bad.unmount();
  });
});
