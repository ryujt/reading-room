import { useCallback, useEffect, useRef, useState } from "react";
import type { NavigationIntent, ReadingClient, ReadingNavigation } from "./client";
import { emptyCounts, matchesReadingPayload, parseNewLink, parseReadingInput, ReadingError, type CollectionOption, type NewLinkInput, type Reading, type ReadingLink, type ReadingLocation, type ReadingStatus } from "./model";

const messageOf = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

export function useReadingRoom(client: ReadingClient, navigation: ReadingNavigation, actorId: string) {
  const [location, setLocation] = useState<ReadingLocation>(() => navigation.read());
  const [items, setItems] = useState<ReadingLink[]>([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<ReadingLink | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRevision, setDetailRevision] = useState(0);
  const [draft, setDraft] = useState({ status: "UNREAD" as ReadingStatus, reflection: "" });
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<Reading | null>(null);
  const [pendingDestination, setPendingDestination] = useState<NavigationIntent | null>(null);
  const [focusError, setFocusError] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const pendingSave = useRef(false);
  const pendingCreate = useRef(false);
  const listEpoch = useRef(0);
  const detailEpoch = useRef(0);
  const requestRef = useRef<(intent: NavigationIntent) => void>(() => {});
  const alive = useRef(true);
  const generation = useRef(0);
  const dirty = Boolean(selected && !matchesReadingPayload(selected.reading, draft));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    alive.current = true;
    generation.current++;
    return () => { alive.current = false; generation.current++; listEpoch.current++; detailEpoch.current++; };
  }, []);

  useEffect(() => {
    const epoch = ++listEpoch.current;
    const controller = new AbortController();
    setLoading(true); setListError(""); setLoadingMore(false);
    client.list({ status: location.status, query: location.query }, controller.signal).then(page => {
      if (epoch !== listEpoch.current) return;
      setItems(page.items); setCounts(page.counts); setCursor(page.nextCursor);
    }).catch(error => { if (!isAbort(error) && epoch === listEpoch.current) setListError(messageOf(error)); })
      .finally(() => { if (epoch === listEpoch.current) setLoading(false); });
    return () => controller.abort();
  }, [client, actorId, location.status, location.query, revision]);

  useEffect(() => {
    const epoch = ++detailEpoch.current;
    const controller = new AbortController();
    setSelected(null); setDetailError(""); setSaveError(""); setConflict(null); setSaved(false);
    if (!location.linkId) { setDetailLoading(false); return () => controller.abort(); }
    setDetailLoading(true);
    client.get(location.linkId, controller.signal).then(link => {
      if (epoch !== detailEpoch.current) return;
      setSelected(link); setDraft({ status: link.reading.status, reflection: link.reading.reflection });
    }).catch(error => { if (!isAbort(error) && epoch === detailEpoch.current) setDetailError(messageOf(error)); })
      .finally(() => { if (epoch === detailEpoch.current) setDetailLoading(false); });
    return () => controller.abort();
  }, [client, actorId, location.linkId, detailRevision]);

  const applyDestination = useCallback((intent: NavigationIntent) => {
    if (!alive.current) return;
    // An explicitly approved departure must not also trigger a stale native warning.
    dirtyRef.current = false;
    setPendingDestination(null);
    intent.apply();
    if (intent.location) setLocation(intent.location);
  }, []);
  function requestNavigation(intent: NavigationIntent) {
    if (pendingSave.current || pendingCreate.current || pendingDestination) return;
    if (dirty) setPendingDestination(intent); else applyDestination(intent);
  }
  requestRef.current = requestNavigation;
  useEffect(() => navigation.subscribe(intent => requestRef.current(intent)), [navigation]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);

  async function loadMore() {
    if (!cursor || loadingMore || loading) return;
    const epoch = listEpoch.current;
    setLoadingMore(true);
    try {
      const page = await client.list({ status: location.status, query: location.query, cursor });
      if (epoch !== listEpoch.current) return;
      setItems(current => [...current, ...page.items.filter(item => !current.some(existing => existing.id === item.id))]);
      setCursor(page.nextCursor); setCounts(page.counts);
    } catch (error) { if (epoch === listEpoch.current) setListError(messageOf(error)); }
    finally { if (epoch === listEpoch.current) setLoadingMore(false); }
  }
  function editDraft(change: Partial<typeof draft>) {
    if (pendingSave.current) return;
    setDraft(current => ({ ...current, ...change })); setSaved(false); setSaveError("");
  }
  async function saveDraft(expectedVersion = selected?.reading.version): Promise<boolean> {
    if (!selected || expectedVersion === undefined || pendingSave.current) return false;
    let input;
    try { input = parseReadingInput({ ...draft, expectedVersion }); }
    catch (error) { setSaveError(messageOf(error)); setFocusError(value => value + 1); return false; }
    const id = selected.id, epoch = detailEpoch.current, lifetime = generation.current;
    pendingSave.current = true; setSaving(true); setSaveError("");
    try {
      const reading = await client.put(id, input);
      if (!alive.current || lifetime !== generation.current || epoch !== detailEpoch.current) return false;
      setSelected(current => current?.id === id ? { ...current, reading } : current);
      setDraft({ status: reading.status, reflection: reading.reflection });
      setItems(current => current.map(item => item.id === id ? { ...item, reading } : item));
      setConflict(null); setSaved(true); setRevision(value => value + 1);
      return true;
    } catch (error) {
      if (!alive.current || lifetime !== generation.current || epoch !== detailEpoch.current) return false;
      setConflict(error instanceof ReadingError && error.code === "READING_CONFLICT" && error.current ? error.current : null);
      setSaveError(messageOf(error)); setFocusError(value => value + 1);
      return false;
    } finally { pendingSave.current = false; if (alive.current && lifetime === generation.current) setSaving(false); }
  }
  async function resolveNavigation(choice: "keep" | "discard" | "save") {
    if (!pendingDestination || pendingSave.current) return;
    if (choice === "keep") { setPendingDestination(null); return; }
    const intended = pendingDestination;
    if (choice === "save" && !(await saveDraft())) return;
    if (selected && choice === "discard") setDraft({ status: selected.reading.status, reflection: selected.reading.reflection });
    applyDestination(intended);
  }
  function useServerValue() {
    if (!conflict || !selected || pendingSave.current) return;
    setSelected({ ...selected, reading: conflict });
    setDraft({ status: conflict.status, reflection: conflict.reflection });
    setConflict(null); setSaveError(""); setSaved(false); setRevision(value => value + 1);
  }
  const loadCollections = useCallback(async () => {
    const lifetime = generation.current;
    setCollectionsLoading(true); setCollectionsError("");
    try { const result = await client.getCollections(); if (alive.current && lifetime === generation.current) setCollections(result); }
    catch (error) { if (alive.current && lifetime === generation.current) setCollectionsError(messageOf(error)); }
    finally { if (alive.current && lifetime === generation.current) setCollectionsLoading(false); }
  }, [client]);
  useEffect(() => { if (saveOpen) void loadCollections(); }, [saveOpen, loadCollections]);
  async function saveLink(raw: NewLinkInput) {
    if (pendingCreate.current || collectionsLoading || collectionsError) return;
    let input;
    try { input = parseNewLink(raw); } catch (error) { setCreateError(messageOf(error)); return; }
    const lifetime = generation.current;
    pendingCreate.current = true; setCreating(true); setCreateError("");
    try {
      const created = await client.createLink(input);
      if (!alive.current || lifetime !== generation.current) return;
      setSaveOpen(false); setRevision(value => value + 1);
      applyDestination(navigation.to({ status: "ALL", query: "", linkId: created.id }, "your new article"));
    } catch (error) { if (alive.current && lifetime === generation.current) setCreateError(messageOf(error)); }
    finally { pendingCreate.current = false; if (alive.current && lifetime === generation.current) setCreating(false); }
  }

  return {
    location, items, counts, cursor, loading, loadingMore, listError, selected, detailLoading, detailError,
    draft, dirty, saving, saved, saveError, conflict, pendingDestination, focusError,
    saveOpen, collections, collectionsLoading, collectionsError, createError, creating,
    editDraft, saveDraft, resolveNavigation, useServerValue, saveLink, loadMore, loadCollections,
    requestNavigation, go: (next: ReadingLocation, label: string) => requestNavigation(navigation.to(next, label)),
    retryList: () => setRevision(value => value + 1), retryDetail: () => setDetailRevision(value => value + 1),
    openSave: () => { if (!dirty) setSaveOpen(true); }, closeSave: () => { if (!pendingCreate.current) setSaveOpen(false); },
  };
}
