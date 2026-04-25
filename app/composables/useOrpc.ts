import { createORPCVueColadaUtils } from "@orpc/vue-colada";

export function useOrpc() {
  const { $client } = useNuxtApp();
  return createORPCVueColadaUtils($client);
}
