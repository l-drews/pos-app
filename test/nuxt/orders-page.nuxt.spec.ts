import { describe, it, expect, vi, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import OrdersPage from "~/pages/orders.vue";

const { orpc, deleteMock } = vi.hoisted(() => {
  const ORDERS = [
    {
      uuid: "o1",
      amount: 300,
      createdAt: "2026-07-22T10:00:00.000Z",
      user: { firstName: "Mia", lastName: "Muster" },
      items: [{ uuid: "i1", count: 2, amount: 300, product: { name: "Cola" } }],
    },
  ];
  const deleteMock = vi.fn(async (_input: unknown) => ({}));
  const orpc = {
    orders: {
      list: {
        queryOptions: (opts: object = {}) => ({
          ...opts,
          key: ["orders-list"],
          query: async () => ({ rows: ORDERS, total: ORDERS.length }),
        }),
      },
      key: () => ["orders"],
      delete: {
        mutationOptions: () => ({
          mutation: (input: unknown) => deleteMock(input),
        }),
      },
    },
    users: { key: () => ["users"] },
    transactions: { key: () => ["transactions"] },
  };
  return { orpc, deleteMock };
});

mockNuxtImport("useOrpc", () => () => orpc);

const buttonByText = (text: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );

describe("orders page delete with refund", () => {
  let wrapper: VueWrapper<unknown>;

  afterEach(() => wrapper.unmount());

  it("deletes an order after opening its details and confirming", async () => {
    vi.clearAllMocks();
    wrapper = await mountSuspended(OrdersPage);
    await vi.waitFor(() => expect(wrapper.text()).toContain("Mia"));

    await wrapper.findAll("tbody tr")[0]!.trigger("click");
    await vi.waitFor(() => expect(buttonByText("Delete order")).toBeTruthy());
    buttonByText("Delete order")!.click();

    // The confirmation names the amount and the user being refunded.
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        "refund the money to Mia Muster",
      ),
    );
    buttonByText("Delete")!.click();

    await vi.waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith({ uuid: "o1" }),
    );
  });
});
