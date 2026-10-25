import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createReadingNavigation, ReadingRoomApp, type ReadingLink } from "@linkwarden/reading-room-ui";
import "@linkwarden/reading-room-ui/styles.css";
import "./prototype.css";
import { FakeReadingClient } from "./fakeClient";

const client = new FakeReadingClient();
const navigation = createReadingNavigation("/");
type Preview = { link: ReadingLink; format: string };

function Prototype() {
  const [epoch, setEpoch] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState("Normal responses");
  const [controls, setControls] = useState(false);
  function reset(empty = false) {
    client.reset(empty);
    navigation.to({ status: "ALL", query: "", linkId: null }, "reset fixture").apply();
    setEpoch(value => value + 1); setPreview(null); setMode("Normal responses"); setControls(false);
  }
  return <>
    {preview ? <SampleReader preview={preview} back={() => setPreview(null)}/> : <ReadingRoomApp key={epoch} client={client} navigation={navigation} actorId="prototype-reader" actorName="Ryu" prototype contentIntent={(link, format) => ({ label: format === "original" ? "the source article preview" : "the preserved article preview", apply() { setPreview({ link, format }); } })}/>}
    <aside className="prototype-tools" aria-label="Prototype review controls">
      {controls && <div className="prototype-tool-menu"><p>Deterministic browser fixtures</p><span>No sign-in, server, or network. Reset discards this review session.</span><button onClick={() => reset()}>Reset six articles</button><button onClick={() => reset(true)}>Show empty library</button>{([['fail', 'Fail next save'], ['conflict', 'Conflict on next save'], ['timeout', 'Timeout on next save']] as const).map(([value, label]) => <button key={value} onClick={() => { client.setMode(value); setMode(label); setControls(false); }}>{label}</button>)}</div>}
      <button className="prototype-toggle" onClick={() => setControls(value => !value)} aria-expanded={controls}><span className="prototype-dot"/> Prototype · Browser data only <span>{controls ? "−" : "+"}</span></button>
      {mode !== "Normal responses" && <span className="prototype-mode" role="status">{mode} armed · one attempt</span>}
    </aside>
  </>;
}

function SampleReader({ preview, back }: { preview: Preview; back(): void }) {
  return <div className="sample-reader"><header><button onClick={back}>← Back to Reading Room</button><span>Sample {preview.format} preview</span></header><article><p className="sample-eyebrow">FRONTEND-ONLY READING SAMPLE</p><h1>{preview.link.name}</h1><p className="sample-lede">A little space, deliberately kept.</p><p>There is a particular pleasure in returning to something you chose to keep. A sentence comes back differently after a walk. An idea meets another idea. A useful question waits patiently for the right afternoon.</p><p>This is a small, original sample passage for the interface prototype. It is not fetched from the article URL, and no archive has been created. In the finished service, this entry opens Linkwarden’s actual preserved content.</p><blockquote>Reading is also the art of making room.</blockquote><p>Take your time. The list will be here when you return.</p><button onClick={back}>Return to your note →</button></article></div>;
}

createRoot(document.getElementById("root")!).render(<Prototype/>);
