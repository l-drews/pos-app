import { useMutation, type UseMutationOptions } from "@pinia/colada";
import { toast } from "vue-sonner";
import ProgressToast from "~/components/ProgressToast.vue";

const TOAST_DURATION = 5000;

export function useToastMutation<
  TData,
  TVars = void,
  TError = Error,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TContext extends Record<any, any> = Record<string, never>,
>(options: UseMutationOptions<TData, TVars, TError, TContext>) {
  // Captured at setup time — this composable is also called from store setup
  // (no component instance), where useI18n() is unavailable.
  const { $i18n } = useNuxtApp();
  return useMutation<TData, TVars, TError, TContext>({
    ...options,
    onError(error, vars, context) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : $i18n.t("common.somethingWentWrong");
      toast.custom(markRaw(ProgressToast), {
        duration: TOAST_DURATION,
        componentProps: { message, duration: TOAST_DURATION },
      });
      options.onError?.(error, vars, context);
    },
  });
}
