import { describe, it, expect, vi, afterEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import UserForm from "~/components/UserForm.vue";
import ConfirmDialog from "~/components/ConfirmDialog.vue";
import TransactionForm from "~/components/TransactionForm.vue";

const { orpc } = vi.hoisted(() => {
  const query = (key: string, data: unknown) => ({
    queryOptions: (extra: object = {}) => ({
      key: [key],
      query: async () => data,
      ...extra,
    }),
  });
  return {
    orpc: {
      groups: { getAll: query("groups", []), key: () => ["groups"] },
      users: { getAll: query("users", []), key: () => ["users"] },
    },
  };
});

mockNuxtImport("useOrpc", () => () => orpc);

function setInput(selector: string, value: string) {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  if (!input) throw new Error(`no input ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function pressEnter(target: EventTarget = document.body) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
  );
}

describe("global Enter-to-confirm for modals", () => {
  let wrapper: VueWrapper<unknown>;

  afterEach(() => wrapper.unmount());

  it("confirms a form dialog when Enter is pressed in one of its inputs", async () => {
    wrapper = await mountSuspended(UserForm, {
      props: { active: true, title: "Add user" },
    });
    await vi.waitFor(() =>
      expect(document.querySelector("#user-first-name")).toBeTruthy(),
    );

    setInput("#user-first-name", "Mia");
    setInput("#user-last-name", "Muster");
    setInput("#user-birthdate", "2012-01-01");
    await nextTick();

    pressEnter(document.querySelector("#user-first-name")!);

    await vi.waitFor(() => expect(wrapper.emitted("on-confirm")).toBeTruthy());
  });

  it("confirms an alert dialog when Enter is pressed with no focused control", async () => {
    // Models the state after clicking non-interactive dialog content: the
    // event targets the body, so the plugin (not native activation) acts.
    wrapper = await mountSuspended(ConfirmDialog, {
      props: { active: true },
    });
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alertdialog"]')).toBeTruthy(),
    );

    pressEnter();

    await vi.waitFor(() => expect(wrapper.emitted("on-confirm")).toBeTruthy());
  });

  it("defers to the focused button in an alert dialog", async () => {
    // In production reka-ui's focus trap puts focus on the CANCEL button when
    // an alert dialog opens; Enter then activates it natively, and the plugin
    // must stay out of the way rather than clicking the confirm button.
    wrapper = await mountSuspended(ConfirmDialog, {
      props: { active: true },
    });
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alertdialog"]')).toBeTruthy(),
    );

    const cancel = document.querySelector(
      '[data-slot="alert-dialog-footer"] button',
    ) as HTMLButtonElement;
    expect(cancel).toBeTruthy();
    pressEnter(cancel);
    await nextTick();

    expect(wrapper.emitted("on-confirm")).toBeFalsy();
  });

  it("does nothing while the confirm button is disabled", async () => {
    // Transaction form scoped to a user but with amount 0 — confirm disabled.
    wrapper = await mountSuspended(TransactionForm, {
      props: {
        active: true,
        title: "Create transaction",
        user: { uuid: "u1", firstName: "Mia", lastName: "Muster" },
      },
    });
    await vi.waitFor(() =>
      expect(document.querySelector('[role="dialog"]')).toBeTruthy(),
    );

    pressEnter();
    await nextTick();

    expect(wrapper.emitted("on-confirm")).toBeFalsy();
  });
});
