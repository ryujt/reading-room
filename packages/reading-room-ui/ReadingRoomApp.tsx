import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { NavigationIntent, ReadingClient, ReadingNavigation } from "./client";
import { availableFormat, readingStatuses, REFLECTION_LIMIT, statusLabels, type ReadingLink, type Shelf } from "./model";
import { useReadingRoom } from "./useReadingRoom";

type ContentFormat = "original" | "readable" | "pdf" | "image" | "monolith";
export interface ReadingRoomProps {
  client: ReadingClient;
  navigation: ReadingNavigation;
  actorId: string;
  actorName: string;
  prototype?: boolean;
  contentIntent(link: ReadingLink, format: ContentFormat): NavigationIntent;
  legacyIntent?: NavigationIntent;
}
type Room = ReturnType<typeof useReadingRoom>;

function Icon({ name, size = 20 }: { name: "book" | "arrow" | "search" | "plus" | "close" | "check" | "lock"; size?: number }) {
  const paths = {
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6"/></>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>, check: <path d="m5 12 4 4 10-10"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function domain(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Saved article"; } }
function Badge({ status }: { status: ReadingLink["reading"]["status"] }) { return <span className={`rr-badge rr-badge-${status.toLowerCase()}`}><span/>{statusLabels[status]}</span>; }

function Dialog({ title, children, close, active = true, className = "" }: { title: string; children: ReactNode; close(): void; active?: boolean; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = container.current?.querySelector<HTMLElement>("[data-autofocus],button:not(:disabled),input:not(:disabled),textarea:not(:disabled)");
    first?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(container.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex='0']") || []).filter(element => element.offsetParent !== null);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || !container.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [active]);
  return <div className={`rr-overlay ${className}`} onMouseDown={event => { if (active && event.target === event.currentTarget) close(); }}>
    <div ref={container} role="dialog" aria-modal={active} aria-label={title} className="rr-dialog" inert={!active}>{children}</div>
  </div>;
}

export function ReadingRoomApp(props: ReadingRoomProps) { return <ReadingRoomSession key={props.actorId} {...props}/>; }

function ReadingRoomSession(props: ReadingRoomProps) {
  const room = useReadingRoom(props.client, props.navigation, props.actorId);
  const [search, setSearch] = useState(room.location.query);
  useEffect(() => setSearch(room.location.query), [room.location.query]);
  useEffect(() => {
    if (!room.location.linkId && !room.saveOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [room.location.linkId, room.saveOpen]);
  const feature = room.items.find(item => item.reading.status === "READING") || room.items.find(item => item.reading.status === "UNREAD") || room.items[0];
  const goShelf = (status: Shelf) => room.go({ ...room.location, status, linkId: null }, `${statusLabels[status]} shelf`);
  const openArticle = (item: ReadingLink) => room.go({ ...room.location, linkId: item.id }, item.name);
  const closeDetail = () => room.go({ ...room.location, linkId: null }, "your library");
  const submitSearch = (event: FormEvent) => { event.preventDefault(); room.go({ ...room.location, query: search.trim(), linkId: null }, "your search results"); };
  const overlayOpen = Boolean(room.location.linkId || room.saveOpen || room.pendingDestination);

  return <div className="reading-room">
    <header className="rr-masthead rr-container" inert={overlayOpen}>
      <button className="rr-brand" onClick={() => room.go({ status: "ALL", query: "", linkId: null }, "your library")} aria-label="Reading Room home"><span className="rr-brand-mark"><Icon name="book" size={25}/></span><span>Reading Room<span className="rr-brand-sub">A PLACE FOR YOUR ATTENTION</span></span></button>
      <form className="rr-search" role="search" onSubmit={submitSearch}><Icon name="search" size={18}/><input aria-label="Search your library" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} placeholder="Find something worth reading"/><button type="submit" aria-label="Search"><Icon name="arrow" size={18}/></button></form>
      <button className="rr-button rr-primary rr-save-top" onClick={room.openSave}><Icon name="plus" size={18}/><span>Save a link</span></button>
      <div className="rr-avatar" title={`${props.actorName}’s private library`} aria-label={`${props.actorName}’s private library`}>{props.actorName.slice(0, 1).toUpperCase()}</div>
    </header>

    <main className="rr-container" inert={overlayOpen}>
      <section className="rr-intro" aria-label="Welcome to your library">
        <div className="rr-intro-copy"><p className="rr-eyebrow"><span className="rr-small-rule"/> YOUR PRIVATE LIBRARY</p><h1>Your reading<br/><em>room.</em></h1><p className="rr-intro-description">A little less scrolling.<br className="rr-mobile-break"/> A little more reading.</p></div>
        <div className="rr-feature">
          <div className="rr-feature-copy"><p className="rr-eyebrow">ON THIS SHELF <span className="rr-feature-dot"/></p><h2>{feature?.name || "Leave a little room for a good idea."}</h2><p>{feature ? (feature.reading.status === "READING" ? "Pick up a thought where you left it." : "A quiet invitation to begin.") : "Save your first article and make this space your own."}</p><button onClick={() => feature ? openArticle(feature) : room.openSave()} className="rr-feature-action">{feature ? "Spend a little time" : "Add your first article"}<Icon name="arrow" size={19}/></button></div>
          <div className="rr-book-object" aria-hidden="true"><span className="rr-book-spine"/><span className="rr-book-title">READ<br/>SLOWLY.</span><span className="rr-book-flower">✳</span><span className="rr-book-foot">GOOD THINGS<br/>TAKE ATTENTION</span></div>
        </div>
      </section>

      <nav className="rr-shelves" aria-label="Reading shelves">
        {(["ALL", ...readingStatuses] as Shelf[]).map((status, index) => <button key={status} className={`rr-shelf ${room.location.status === status ? "is-selected" : ""}`} aria-pressed={room.location.status === status} onClick={() => goShelf(status)}><span className="rr-shelf-label"><span className={`rr-shelf-dot rr-dot-${status.toLowerCase()}`}/>{statusLabels[status]}</span><span className="rr-shelf-count">{String(room.counts[status]).padStart(2, "0")}</span><span className="rr-shelf-index">0{index + 1}</span></button>)}
      </nav>

      <section className="rr-library" aria-label="Saved articles">
        <div className="rr-results-heading"><div><p className="rr-eyebrow">THE COLLECTION</p><h2>{room.location.query ? `Results for “${room.location.query}”` : room.location.status === "ALL" ? "Something worth keeping." : `${statusLabels[room.location.status]} articles.`}</h2></div><div className="rr-result-meta"><span>Newest saved first</span><button className="rr-text-button" onClick={room.retryList} disabled={room.loading}>Refresh</button></div></div>
        <p className="rr-count-context">Shelf counts include your whole library. Search narrows the articles below.</p>
        {room.listError && <div className="rr-inline-error" role="alert"><span>{room.listError} {room.items.length ? "Showing the last available articles." : ""}</span><button onClick={room.retryList}>Try again</button></div>}
        {room.loading && !room.items.length ? <div className="rr-loading" aria-label="Loading your library">{[1, 2, 3].map(n => <div className="rr-skeleton-row" key={n}><span/><span/><span/></div>)}</div> : room.items.length ? <div className={`rr-articles ${room.loading ? "is-refreshing" : ""}`} aria-busy={room.loading}>
          {room.items.map((item, index) => <button className="rr-article" onClick={() => openArticle(item)} key={item.id} aria-label={`Open ${item.name}`}>
            <span className="rr-article-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="rr-article-info"><span className="rr-article-meta">{domain(item.url)}<span>·</span>{item.collection.name}</span><span className="rr-article-title">{item.name}</span><span className={`rr-article-excerpt ${item.reading.reflection ? "has-reflection" : ""}`}>{item.reading.reflection ? `“${item.reading.reflection}”` : item.description}</span><span className="rr-article-formats">{availableFormat(item.readable) ? <><Icon name="book" size={13}/> Preserved copy</> : <><span className="rr-pending-dot"/> Preservation {item.readable === "unavailable" ? "unavailable" : "pending"}</>}</span></span>
            <Badge status={item.reading.status}/><span className="rr-open-arrow"><Icon name="arrow"/></span>
          </button>)}
        </div> : !room.listError && <div className="rr-empty"><Icon name="book" size={42}/><h3>{room.location.query || room.location.status !== "ALL" ? "A little space on this shelf." : "Every library starts with one good article."}</h3><p>{room.location.query || room.location.status !== "ALL" ? "Try another search or return to all your articles." : "Keep something that makes you curious. Come back when you have a moment."}</p><button className="rr-button rr-primary" onClick={() => room.location.query || room.location.status !== "ALL" ? room.go({ status: "ALL", query: "", linkId: null }, "all articles") : room.openSave()}>{room.location.query || room.location.status !== "ALL" ? "See all articles" : "Save your first link"}<Icon name="arrow" size={18}/></button></div>}
        {room.cursor && <div className="rr-more"><button className="rr-button rr-secondary" onClick={room.loadMore} disabled={room.loadingMore}>{room.loadingMore ? "Loading…" : "A few more articles"}<Icon name="arrow" size={18}/></button></div>}
      </section>
    </main>
    <footer className="rr-footer rr-container" inert={overlayOpen}><span><Icon name="book" size={16}/> Your links, your pace. <span className="rr-credit">Built on Linkwarden.</span></span>{props.legacyIntent ? <button className="rr-text-button" onClick={() => room.requestNavigation(props.legacyIntent!)}>Open original library <Icon name="arrow" size={16}/></button> : <span className="rr-footer-note">A SMALL CORNER OF THE INTERNET, KEPT BY YOU.</span>}</footer>

    {room.location.linkId && <Detail room={room} close={closeDetail} contentIntent={props.contentIntent}/>}
    {room.saveOpen && <SaveLink room={room}/>}
    {room.pendingDestination && <DraftGuard room={room}/>}
  </div>;
}

function Detail({ room, close, contentIntent }: { room: Room; close(): void; contentIntent: ReadingRoomProps["contentIntent"] }) {
  const saveButton = useRef<HTMLButtonElement>(null);
  const conflictRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!room.focusError || room.pendingDestination) return;
    if (room.conflict) {
      conflictRegion.current?.scrollIntoView({ block: "nearest" });
      conflictRegion.current?.focus({ preventScroll: true });
    } else saveButton.current?.focus();
  }, [room.focusError, room.pendingDestination, room.conflict]);
  const article = room.selected;
  return <Dialog title="Article and your reading note" close={close} active={!room.pendingDestination} className="rr-detail-overlay">
    <header className="rr-panel-top"><span className="rr-eyebrow"><Icon name="lock" size={13}/> JUST FOR YOU</span><button className="rr-icon-button" aria-label="Close article" disabled={room.saving} onClick={close}><Icon name="close"/></button></header>
    {room.detailLoading ? <div className="rr-panel-loading" aria-label="Loading article"><div className="rr-skeleton-row"/><p>Opening your article…</p></div> : room.detailError ? <div className="rr-panel-loading" role="alert"><h2>We couldn’t open this article.</h2><p>{room.detailError}</p><button className="rr-button rr-secondary" onClick={room.retryDetail}>Try again</button></div> : article && <>
      <div className="rr-panel-scroll"><p className="rr-article-meta">{domain(article.url)}<span>·</span>{article.collection.name}</p><h2 className="rr-detail-title">{article.name}</h2><p className="rr-detail-description">{article.description}</p>
        <div className="rr-content-actions"><button className="rr-button rr-secondary" onClick={() => room.requestNavigation(contentIntent(article, "original"))}>Open source<Icon name="arrow" size={17}/></button>{(["readable", "pdf", "monolith", "image"] as const).filter(format => availableFormat(article[format])).map(format => <button className="rr-format-link" key={format} onClick={() => room.requestNavigation(contentIntent(article, format))}>{format === "readable" ? "Readable" : format === "monolith" ? "HTML" : format === "pdf" ? "PDF" : "Image"}<Icon name="arrow" size={14}/></button>)}</div>
        {!availableFormat(article.readable) && <p className="rr-preservation-note">{article.readable === "unavailable" ? "A readable copy isn’t available for this article." : "Preserved copies are being prepared separately. Your reading note is ready now."}</p>}
        <div className="rr-section-rule"/>
        <div className="rr-field-heading"><span className="rr-eyebrow">YOUR READING JOURNEY</span><span className="rr-field-caption">Choose your own pace</span></div>
        <div className="rr-status-options" role="group" aria-label="Reading status">{readingStatuses.map(status => <button className={room.draft.status === status ? "is-selected" : ""} aria-pressed={room.draft.status === status} disabled={room.saving} onClick={() => room.editDraft({ status })} key={status}>{room.draft.status === status && <Icon name="check" size={15}/>} {statusLabels[status]}</button>)}</div>
        <label className="rr-note-label" htmlFor="reading-reflection">Leave yourself a thought.</label><p className="rr-note-hint">One line to remember what stayed with you.</p>
        <textarea id="reading-reflection" className="rr-reflection" maxLength={REFLECTION_LIMIT} value={room.draft.reflection} onChange={event => room.editDraft({ reflection: event.target.value })} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} disabled={room.saving} placeholder="A question, a small insight, a reason to return…" rows={4}/>
        <div className="rr-private-hint"><span><Icon name="lock" size={12}/> Your note stays private.</span><span>{room.draft.reflection.length} / {REFLECTION_LIMIT}</span></div>
        {room.saveError && <div className="rr-inline-error rr-save-error" role="alert">{room.saveError}</div>}
        {room.conflict && <div className="rr-conflict" ref={conflictRegion} tabIndex={-1} aria-label="Compare your draft with the saved note"><p className="rr-eyebrow">SAVED IN ANOTHER TAB</p><p><strong>{statusLabels[room.conflict.status]}</strong> · {room.conflict.reflection || "No reflection"}</p><p className="rr-note-hint">Your draft above is unchanged. Choose which thought to keep.</p><div><button className="rr-button rr-secondary" disabled={room.saving} onClick={room.useServerValue}>Load saved value</button><button className="rr-button rr-primary" disabled={room.saving} onClick={() => void room.saveDraft(room.conflict!.version)}>Save my draft instead</button></div></div>}
      </div>
      <footer className="rr-panel-footer"><span className={room.saved ? "rr-saved" : "rr-save-caption"} role="status" aria-live="polite">{room.saved ? <><Icon name="check" size={16}/> Saved to your reading room</> : room.conflict ? "Choose which note to keep above." : room.dirty ? "You have an unsaved thought." : "Your note is just for you."}</span><button ref={saveButton} className="rr-button rr-primary" disabled={(!room.dirty && !room.saveError) || room.saving || Boolean(room.conflict)} onClick={() => void room.saveDraft()}>{room.saving ? "Saving…" : "Save note"}<Icon name="check" size={17}/></button></footer>
    </>}
  </Dialog>;
}

function SaveLink({ room }: { room: Room }) {
  const [url, setURL] = useState("");
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const saveButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!collectionId && room.collections.length) setCollectionId(String(room.collections.find(item => item.canCreate)?.id || "new")); }, [room.collections, collectionId]);
  useEffect(() => { if (room.createError) saveButton.current?.focus(); }, [room.createError]);
  const submit = (event: FormEvent) => { event.preventDefault(); void room.saveLink({ url, name, collection: collectionId === "new" ? { name: newCollection } : { id: Number(collectionId) } }); };
  return <Dialog title="Save a link" close={room.closeSave} className="rr-centered-overlay"><form onSubmit={submit}>
    <header className="rr-modal-heading"><p className="rr-eyebrow">A NEW ADDITION</p><button type="button" className="rr-icon-button" aria-label="Close save link" onClick={room.closeSave} disabled={room.creating}><Icon name="close"/></button></header>
    <h2 className="rr-modal-title">Make room for<br/><em>a good idea.</em></h2><p className="rr-modal-description">Save a link now. Come back when you have a moment.</p>
    <label className="rr-form-label" htmlFor="save-url">Article URL</label><input id="save-url" className="rr-input" data-autofocus type="url" required value={url} onChange={event => setURL(event.target.value)} placeholder="https://…" disabled={room.creating}/>
    <label className="rr-form-label" htmlFor="save-title">Title <span>optional</span></label><input id="save-title" className="rr-input" value={name} onChange={event => setName(event.target.value)} placeholder="Give it a title worth remembering" disabled={room.creating}/>
    <label className="rr-form-label" htmlFor="save-collection">Collection</label><select id="save-collection" className="rr-input" value={collectionId} onChange={event => setCollectionId(event.target.value)} disabled={room.creating || room.collectionsLoading}><option value="" disabled>{room.collectionsLoading ? "Loading your collections…" : "Choose a collection"}</option>{room.collections.filter(item => item.canCreate).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="new">Create a collection…</option></select>
    {collectionId === "new" && <><label className="rr-form-label" htmlFor="new-collection">New collection name</label><input id="new-collection" className="rr-input" required value={newCollection} onChange={event => setNewCollection(event.target.value)} placeholder="A new shelf of ideas" disabled={room.creating}/></>}
    {room.collectionsError && <div className="rr-inline-error" role="alert">{room.collectionsError}<button type="button" onClick={room.loadCollections}>Retry collections</button></div>}
    {room.createError && <div className="rr-inline-error" role="alert">{room.createError}</div>}
    <p className="rr-modal-footnote"><Icon name="book" size={15}/> Preserved copies are prepared separately after saving.</p>
    <div className="rr-modal-actions"><button type="button" className="rr-button rr-secondary" onClick={room.closeSave} disabled={room.creating}>Cancel</button><button ref={saveButton} type="submit" className="rr-button rr-primary" disabled={room.creating || room.collectionsLoading || Boolean(room.collectionsError)}>{room.creating ? "Saving link…" : "Save to library"}<Icon name="plus" size={17}/></button></div>
  </form></Dialog>;
}

function DraftGuard({ room }: { room: Room }) {
  const saveButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (room.focusError) (room.conflict ? keepButton : saveButton).current?.focus(); }, [room.focusError, room.conflict]);
  return <Dialog title="Keep your note?" close={() => void room.resolveNavigation("keep")} className="rr-guard-overlay rr-centered-overlay"><div>
    <p className="rr-eyebrow">A THOUGHT IN PROGRESS</p><h2 className="rr-modal-title">Keep your note?</h2><p className="rr-modal-description">You have changes that haven’t been saved. Give this thought a place before you go.</p><p className="rr-destination">Continue to {room.pendingDestination?.label}.</p>
    {room.saveError && <div className="rr-inline-error" role="alert">{room.saveError}{room.conflict && " Choose Keep editing to compare the saved value with your draft."}</div>}
    <div className="rr-guard-actions"><button ref={saveButton} className="rr-button rr-primary" disabled={room.saving || Boolean(room.conflict)} onClick={() => void room.resolveNavigation("save")}>{room.saving ? "Saving…" : "Save and leave"}<Icon name="arrow" size={17}/></button><button className="rr-button rr-secondary" disabled={room.saving} onClick={() => void room.resolveNavigation("discard")}>Discard changes</button><button ref={keepButton} className="rr-text-button" disabled={room.saving} onClick={() => void room.resolveNavigation("keep")}>Keep editing</button></div>
  </div></Dialog>;
}
