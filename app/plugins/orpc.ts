import { createORPCClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { Router } from "~~/server/orpc/router";

declare global {
  interface Window {
    __electronORPC?: { ready: boolean };
  }
}

export default defineNuxtPlugin(async () => {
  let client: RouterClient<Router>;

  if (typeof window !== "undefined" && window.__electronORPC) {
    const { RPCLink } = await import("@orpc/client/message-port");
    const channel = new MessageChannel();
    window.postMessage("start-orpc-client", "*", [channel.port2]);
    const link = new RPCLink({ port: channel.port1 });
    channel.port1.start();
    client = createORPCClient(link);
  } else {
    const { RPCLink } = await import("@orpc/client/fetch");
    const event = useRequestEvent();
    const link = new RPCLink({
      url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3030"}/rpc`,
      headers: event?.headers,
    });
    client = createORPCClient(link);
  }

  return {
    provide: {
      client,
    },
  };
});
