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
  return useMutation<TData, TVars, TError, TContext>({
    ...options,
    onError(error, vars, context) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Something went wrong";
      toast.custom(markRaw(ProgressToast), {
        duration: TOAST_DURATION,
        componentProps: { message, duration: TOAST_DURATION },
      });
      options.onError?.(error, vars, context);
    },
  });
}
