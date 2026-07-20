// Global Enter-to-confirm for modals: when a dialog is open, Enter activates
// the confirm button (the last button in its footer). Works for every current
// and future modal built from the shared shadcn primitives — DialogFooter and
// AlertDialogFooter render data-slot markers, and all footers order their
// buttons cancel-first, confirm-last.
export default defineNuxtPlugin(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.defaultPrevented) return;

    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    // Focused controls keep their native Enter behavior: button activation,
    // newline in a textarea, link navigation, option selection.
    if (tag === "BUTTON" || tag === "TEXTAREA" || tag === "SELECT" || tag === "A") {
      return;
    }

    // Topmost open dialog layer. Note: popovers also carry role="dialog" —
    // if one is layered above (e.g. a search popover inside a form), it wins
    // here, has no footer, and Enter deliberately does nothing global.
    const dialogs = document.querySelectorAll(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    );
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;

    // Enter aimed at an element outside the dialog (teleported widgets) must
    // not confirm it.
    if (target && target !== document.body && !dialog.contains(target)) return;

    const footer = dialog.querySelector(
      '[data-slot="dialog-footer"], [data-slot="alert-dialog-footer"]',
    );
    const buttons = footer?.querySelectorAll("button");
    const confirm = buttons?.[buttons.length - 1] as HTMLButtonElement | undefined;
    if (!confirm || confirm.disabled) return;

    e.preventDefault();
    confirm.click();
  });
});
