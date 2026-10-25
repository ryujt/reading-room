import type { NextRouter } from "next/router";
import type { ReadingNavigation, NavigationIntent } from "@linkwarden/reading-room-ui/client";
import { readReadingLocation, readingLocationURL } from "@linkwarden/reading-room-ui/model";

/** Owns pop handling while mounted. Next must not consume a pop before the draft guard. */
export function createNextReadingNavigation(router: NextRouter): ReadingNavigation {
  let index = typeof history.state?.readingRoomIndex === "number" ? history.state.readingRoomIndex : 0;
  let currentURL = location.pathname + location.search;
  const stamp = (url: string, value: number) => ({ ...history.state, __N: true, url, as: url, options: { shallow: true }, readingRoomIndex: value });
  let currentState = stamp(currentURL, index);
  history.replaceState(currentState, "", currentURL);
  let restoring: (() => void) | null = null;
  let applying = false;
  return {
    read: () => readReadingLocation(location.search),
    to(destination, label) { return { location: destination, label, apply() { index++; currentURL = readingLocationURL(destination, "/reading-room"); currentState = stamp(currentURL, index); history.pushState(currentState, "", currentURL); } }; },
    external(url, label) { return { label, apply() { location.assign(url); } }; },
    subscribe(listener) {
      // This is registered before our pop listener. Every pop is delegated to the guard,
      // including known indices; Next cannot render the target before compensation.
      router.beforePopState(() => false);
      const pop = (event: PopStateEvent) => {
        if (restoring) { const ready = restoring; restoring = null; ready(); return; }
        if (applying) { applying = false; return; }
        const targetURL = location.pathname + location.search;
        const targetState = event.state;
        const targetIndex = targetState?.readingRoomIndex;
        const destination = location.pathname === "/reading-room" ? readReadingLocation(location.search) : undefined;
        if (typeof targetIndex !== "number" || !destination) {
          // Legacy Next entry: restore the current URL/state without pretending beforeunload
          // will fire on a same-document pop. On approval use a bounded document replacement.
          history.replaceState(currentState, "", currentURL);
          listener({ label: "the previous page", apply() { location.replace(targetURL); } });
          return;
        }
        const delta = targetIndex - index;
        if (!delta) return;
        restoring = () => listener({ location: destination, label: destination.linkId ? "the previous article" : "your library", apply() { index = targetIndex; currentURL = targetURL; currentState = targetState; applying = true; history.go(delta); } } satisfies NavigationIntent);
        history.go(-delta);
      };
      window.addEventListener("popstate", pop);
      return () => { window.removeEventListener("popstate", pop); router.beforePopState(() => true); restoring = null; };
    },
  };
}
