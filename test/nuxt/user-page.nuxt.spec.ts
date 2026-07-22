import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import UserPage from "~/pages/users/[uuid].vue";

const { orpc, createTransactionMock } = vi.hoisted(() => {
  const USER = {
    uuid: "3f2504e0-4f89-11d3-9a0c-0305e82c3305",
    firstName: "Mia",
    lastName: "Muster",
    balance: 500,
    barcode: "95700009",
    birthDate: "2012-03-03T00:00:00.000Z",
    groupUuid: null,
  };
  const createTransactionMock = vi.fn(async (_input: unknown) => ({}));
  const query = (key: string, data: unknown) => ({
    queryOptions: (extra: object = {}) => ({
      key: [key],
      query: async () => data,
      ...extra,
    }),
  });
  const mutation = (impl?: (input: unknown) => Promise<unknown>) => ({
    mutationOptions: () => ({ mutation: impl ?? (async () => ({})) }),
  });
  const orpc = {
    users: {
      getByUuid: query("user", USER),
      getAll: query("users", [USER]),
      key: () => ["users"],
      update: mutation(),
      delete: mutation(),
    },
    orders: {
      getByUser: query("user-orders", []),
      key: () => ["orders"],
      delete: mutation(),
    },
    transactions: {
      create: mutation((input) => createTransactionMock(input)),
      key: () => ["transactions"],
    },
    groups: {
      getAll: query("groups", []),
      key: () => ["groups"],
    },
  };
  return { orpc, createTransactionMock };
});

mockNuxtImport("useOrpc", () => () => orpc);

const bodyText = () => document.body.textContent ?? "";
const bodyButton = (label: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );

describe("user detail page balance actions", () => {
  let wrapper: VueWrapper<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    wrapper = await mountSuspended(UserPage, {
      route: "/users/3f2504e0-4f89-11d3-9a0c-0305e82c3305",
    });
    await vi.waitFor(() => expect(wrapper.text()).toContain("Mia Muster"));
  });

  afterEach(() => wrapper.unmount());

  it("offers an enabled Deposit / Withdraw action", () => {
    const button = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Deposit / Withdraw"));
    expect(button).toBeTruthy();
    expect(button!.attributes("disabled")).toBeUndefined();
  });

  it("opens the transaction dialog scoped to this user (no user picker)", async () => {
    expect(bodyText()).not.toContain("Create transaction");

    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Deposit / Withdraw"))!
      .trigger("click");

    await vi.waitFor(() => expect(bodyText()).toContain("Create transaction"));
    expect(bodyText()).toContain("Deposit");
    expect(bodyText()).toContain("Withdraw");
    // The user is preset — the combobox must not be offered.
    expect(bodyText()).not.toContain("Select a user...");
  });

  it("withdraws the full balance via the confirm dialog", async () => {
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Withdraw all"))!
      .trigger("click");

    await vi.waitFor(() => expect(bodyText()).toContain("Withdraw balance"));
    bodyButton("Withdraw")!.click();

    await vi.waitFor(() =>
      expect(createTransactionMock).toHaveBeenCalledWith({
        userUuid: "3f2504e0-4f89-11d3-9a0c-0305e82c3305",
        amount: -500,
      }),
    );
  });
});
