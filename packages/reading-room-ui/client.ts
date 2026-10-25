import type { CollectionOption, NewLinkInput, Reading, ReadingInput, ReadingLink, ReadingLocation, ReadingPage, ShelfQuery } from "./model";

export interface ReadingClient {
  list(query: ShelfQuery, signal?: AbortSignal): Promise<ReadingPage>;
  get(id: number, signal?: AbortSignal): Promise<ReadingLink>;
  put(id: number, input: ReadingInput, signal?: AbortSignal): Promise<Reading>;
  createLink(input: NewLinkInput, signal?: AbortSignal): Promise<ReadingLink>;
  getCollections(signal?: AbortSignal): Promise<CollectionOption[]>;
}
export interface NavigationIntent {
  location?: ReadingLocation;
  label: string;
  apply(): void;
}
export interface ReadingNavigation {
  read(): ReadingLocation;
  to(location: ReadingLocation, label: string): NavigationIntent;
  external(url: string, label: string): NavigationIntent;
  subscribe(listener: (intent: NavigationIntent) => void): () => void;
}
