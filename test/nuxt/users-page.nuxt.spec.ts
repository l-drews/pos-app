import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import UsersPage from "~/pages/users/index.vue";

// Balances are deliberately in a different order than first names so that
// name-sort and balance-sort assertions can't pass by accident.
const { orpc, createMock, updateMock } = vi.hoisted(() => {
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
  const createMock = vi.fn(async (_input: unknown) => ({}));
  const updateMock = vi.fn(async (_input: unknown) => ({}));
  const mutation = (impl?: (input: unknown) => Promise<unknown>) => ({
    mutationOptions: () => ({ mutation: impl ?? (async () => ({})) }),
  });
  const orpc = {
    users: {
      getAll: query("users", USERS),
      key: () => ["users"],
      create: mutation((input) => createMock(input)),
      update: mutation((input) => updateMock(input)),
      delete: mutation(),
      importCsv: mutation(),
    },
    groups: {
      getAll: query("groups", []),
      key: () => ["groups"],
    },
  };
  return { orpc, createMock, updateMock };
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

describe("users page edit dialog", () => {
  let wrapper: VueWrapper<unknown>;

  const openEditDialog = async (firstName: string) => {
    const row = wrapper
      .findAll("tbody tr")
      .find((r) => r.text().includes(firstName));
    await row!.findAll("button")[0]!.trigger("click"); // pencil

    await vi.waitFor(() =>
      expect(document.querySelector("#user-barcode")).toBeTruthy(),
    );
    return document.querySelector("#user-barcode") as HTMLInputElement;
  };

  const save = () => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Save",
    ) as HTMLButtonElement;
    button.click();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    wrapper = await mountSuspended(UsersPage);
    await vi.waitFor(() =>
      expect(wrapper.findAll("tbody tr").length).toBeGreaterThan(1),
    );
  });

  afterEach(() => wrapper.unmount());

  it("edits an existing user's barcode", async () => {
    const barcodeInput = await openEditDialog("Anna");
    expect(barcodeInput.value).toBe("95700002");

    barcodeInput.value = "95709999";
    barcodeInput.dispatchEvent(new Event("input", { bubbles: true }));
    // The Input's useVModel is passive — the parent binding syncs next tick.
    await nextTick();
    save();

    await vi.waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "u2",
          barcode: "95709999",
          generateBarcode: false,
        }),
      ),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("clears a barcode by emptying the field", async () => {
    const barcodeInput = await openEditDialog("Milo");
    expect(barcodeInput.value).toBe("95700003");

    barcodeInput.value = "";
    barcodeInput.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    save();

    await vi.waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: "u3", barcode: null }),
      ),
    );
  });

  it("omits the barcode and sets generateBarcode when regenerating", async () => {
    await openEditDialog("Anna");

    const generateSwitch = document.querySelector(
      '[role="switch"]',
    ) as HTMLButtonElement;
    expect(generateSwitch.getAttribute("aria-checked")).toBe("false");
    generateSwitch.click();
    await nextTick();
    save();

    await vi.waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: "u2", generateBarcode: true }),
      ),
    );
    expect(updateMock.mock.calls[0]![0]).not.toHaveProperty("barcode");
  });
});
