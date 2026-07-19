import { describe, it, expect, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import Navigation from "~/components/Navigation.vue";

describe("internationalization", () => {
  it("renders English by default and German after switching", async () => {
    const wrapper = await mountSuspended(Navigation);

    expect(wrapper.text()).toContain("Products");
    expect(wrapper.text()).toContain("Transactions");

    const deButton = wrapper
      .findAll('[data-testid="locale-switcher"] button')
      .find((b) => b.text() === "de");
    expect(deButton).toBeTruthy();
    await deButton!.trigger("click");

    // setLocale is async (locale messages may load lazily).
    await vi.waitFor(() => expect(wrapper.text()).toContain("Produkte"));
    expect(wrapper.text()).toContain("Transaktionen");
    expect(wrapper.text()).not.toContain("Products");

    // Switch back so app-level locale state doesn't leak.
    const enButton = wrapper
      .findAll('[data-testid="locale-switcher"] button')
      .find((b) => b.text() === "en");
    await enButton!.trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Products"));

    wrapper.unmount();
  });

  it("renders the Weseby Edition with camp terminology on top of German", async () => {
    const wrapper = await mountSuspended(Navigation);

    const weButton = wrapper
      .findAll('[data-testid="locale-switcher"] button')
      .find((b) => b.text() === "we");
    expect(weButton).toBeTruthy();
    expect(weButton!.attributes("title")).toBe("Weseby Edition");
    await weButton!.trigger("click");

    // Overridden terminology…
    await vi.waitFor(() => expect(wrapper.text()).toContain("LaKis"));
    expect(wrapper.text()).toContain("Zelte");
    expect(wrapper.text()).not.toContain("Benutzer");
    expect(wrapper.text()).not.toContain("Gruppen");
    // …while everything else falls back to standard German.
    expect(wrapper.text()).toContain("Produkte");
    expect(wrapper.text()).toContain("Bestellungen");

    const enButton = wrapper
      .findAll('[data-testid="locale-switcher"] button')
      .find((b) => b.text() === "en");
    await enButton!.trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Products"));

    wrapper.unmount();
  });
});
