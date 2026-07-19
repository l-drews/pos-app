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
    // The whole app talks over a single MessagePort channel. If it ever dies
    // (main-side port GC'd, sleep/wake, …) every request would silently
    // vanish until a manual reload — so supervise it and re-establish a fresh
    // channel on close. In-flight requests on the dead channel are rejected
    // by the link; the next retry/refetch flows over the new one.
    client = createReconnectingProxy((reconnect) => {
      const channel = new MessageChannel();
      window.postMessage("start-orpc-client", "*", [channel.port2]);
      const link = new RPCLink({ port: channel.port1 });
      channel.port1.start();
      channel.port1.addEventListener(
        "close",
        () => {
          console.error("[orpc] message port closed — establishing a new channel");
          reconnect();
        },
        { once: true },
      );
      return createORPCClient<RouterClient<Router>>(link);
    });
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
