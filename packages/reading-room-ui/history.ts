import type { NavigationIntent, ReadingNavigation } from "./client";
import { readReadingLocation, readingLocationURL, type ReadingLocation } from "./model";

/** Browser-only adapter. The real PagesRouter wrapper will intercept Next pops before delegation. */
export function createReadingNavigation(pathname = window.location.pathname): ReadingNavigation {
  let currentIndex = Number(history.state?.readingRoomIndex ?? 0);
  let currentURL = window.location.pathname + window.location.search;
  let currentState = { ...history.state, readingRoomIndex: currentIndex };
  history.replaceState(currentState, "", currentURL);
  let restoring: (() => void) | null = null;
  let applying = false;

  return {
    read: () => readReadingLocation(window.location.search),
    to(location, label): NavigationIntent {
      return { location, label, apply() {
        currentIndex++;
        currentURL = readingLocationURL(location, pathname);
        currentState = { ...history.state, readingRoomIndex: currentIndex };
        history.pushState(currentState, "", currentURL);
      } };
    },
    external(url, label) { return { label, apply() { window.location.assign(url); } }; },
    subscribe(listener) {
      const pop = (event: PopStateEvent) => {
        if (restoring) { const next = restoring; restoring = null; next(); return; }
        if (applying) { applying = false; return; }
        const destination = readReadingLocation(window.location.search);
        const targetURL = window.location.pathname + window.location.search;
        const nextIndex = event.state?.readingRoomIndex;
        const targetState = event.state;
        if (typeof nextIndex !== "number") {
          history.replaceState(currentState, "", currentURL);
          listener({ location: destination, label: "the previous page", apply() { window.location.replace(targetURL); } });
          return;
        }
        const delta = nextIndex - currentIndex;
        if (!delta) return;
        restoring = () => listener({ location: destination, label: destination.linkId ? "the previous article" : "your library", apply() {
          currentIndex = nextIndex; currentURL = targetURL; currentState = targetState;
          applying = true; history.go(delta);
        } });
        history.go(-delta);
      };
      window.addEventListener("popstate", pop);
      return () => { window.removeEventListener("popstate", pop); restoring = null; };
    },
  };
}
