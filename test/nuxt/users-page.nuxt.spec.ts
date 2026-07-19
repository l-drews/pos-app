import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import UsersPage from "~/pages/users/index.vue";

// Balances are deliberately in a different order than first names so that
// name-sort and balance-sort assertions can't pass by accident.
const { orpc } = vi.hoisted(() => {
  const USERS = [
    {
      uuid: "u1",
      firstName: "Zara",
      lastName: "Abel",
      balance: 50,
      barcode: "95700001",
      birthDate: "2010-01-01",
      group: { name: "Blue" },
    },
    {
      uuid: "u2",
      firstName: "Anna",
      lastName: "Meier",
      balance: 500,
      barcode: "95700002",
      birthDate: "2011-05-05",
      group: { name: "Red" },
    },
    {
      uuid: "u3",
      firstName: "Milo",
      lastName: "Zorn",
      balance: 200,
      barcode: "95700003",
      birthDate: "2009-03-03",
      group: null,
    },
  ];
  const query = (key: string, data: unknown) => ({
    queryOptions: (extra: object = {}) => ({
      key: [key],
      query: async () => data,
      ...extra,
    }),
  });
  const mutation = () => ({
    mutationOptions: () => ({ mutation: async () => ({}) }),
  });
  const orpc = {
    users: {
      getAll: query("users", USERS),
      key: () => ["users"],
      create: mutation(),
      update: mutation(),
      delete: mutation(),
      importCsv: mutation(),
    },
    groups: {
      getAll: query("groups", []),
      key: () => ["groups"],
    },
  };
  return { orpc };
});

mockNuxtImport("useOrpc", () => () => orpc);

describe("users page search and sorting", () => {
  let wrapper: VueWrapper<unknown>;

  const firstNames = () =>
    wrapper
      .findAll("tbody tr")
      .map((row) => row.findAll("td")[1]?.text())
      .filter(Boolean);

  const headerButton = (label: string) => {
    const button = wrapper
      .findAll("thead button")
      .find((b) => b.text().includes(label));
    if (!button) throw new Error(`no sortable header "${label}"`);
    return button;
  };

  beforeEach(async () => {
    wrapper = await mountSuspended(UsersPage);
    await vi.waitFor(() => expect(firstNames()).toHaveLength(3));
  });

  afterEach(() => wrapper.unmount());

  it("sorts by first name ascending by default", () => {
    expect(firstNames()).toEqual(["Anna", "Milo", "Zara"]);
  });

  it("filters by name, group, and barcode via the search field", async () => {
    const input = wrapper.find('input[placeholder="Search users..."]');

    await input.setValue("anna");
    expect(firstNames()).toEqual(["Anna"]);

    await input.setValue("blue");
    expect(firstNames()).toEqual(["Zara"]);

    await input.setValue("95700003");
    expect(firstNames()).toEqual(["Milo"]);

    await input.setValue("no-such-user");
    expect(firstNames()).toEqual([]);
    expect(wrapper.text()).toContain("No users match your search");

    await input.setValue("");
    expect(firstNames()).toHaveLength(3);
  });

  it("sorts by a clicked column and toggles direction on repeat clicks", async () => {
    await headerButton("Balance").trigger("click");
    expect(firstNames()).toEqual(["Zara", "Milo", "Anna"]); // 50, 200, 500

    await headerButton("Balance").trigger("click");
    expect(firstNames()).toEqual(["Anna", "Milo", "Zara"]); // 500, 200, 50
  });

  it("sorts by last name and by date of birth", async () => {
    await headerButton("Last Name").trigger("click");
    expect(firstNames()).toEqual(["Zara", "Anna", "Milo"]); // Abel, Meier, Zorn

    await headerButton("Date of Birth").trigger("click");
    expect(firstNames()).toEqual(["Milo", "Zara", "Anna"]); // 2009, 2010, 2011
  });

  it("sorts users without a group first when sorting by group ascending", async () => {
    await headerButton("Group").trigger("click");
    expect(firstNames()).toEqual(["Milo", "Zara", "Anna"]); // (none), Blue, Red
  });
});
