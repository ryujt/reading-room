import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useUser } from "@linkwarden/router/user";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { ReadingRoomApp } from "@linkwarden/reading-room-ui";
import type { ReadingNavigation } from "@linkwarden/reading-room-ui/client";
import { readingLocationURL, sourceArticleURL } from "@linkwarden/reading-room-ui/model";
import { createRealReadingClient } from "@/lib/reading-room/client";
import { createNextReadingNavigation } from "@/lib/reading-room/navigation";

function AuthenticatedRoom({ actorId, name }: { actorId: number; name: string }) {
  const router = useRouter();
  const client = useMemo(() => createRealReadingClient(actorId), [actorId]);
  const [navigation, setNavigation] = useState<ReadingNavigation | null>(null);
  useEffect(() => { if (router.isReady) setNavigation(createNextReadingNavigation(router)); }, [router.isReady]);
  if (!navigation) return <div className="reading-room rr-loading" role="status">Opening your reading room…</div>;
  return <ReadingRoomApp client={client} navigation={navigation} actorId={String(actorId)} actorName={name} legacyIntent={navigation.external("/dashboard", "Linkwarden dashboard")} contentIntent={(link, format) => {
    if (format === "original") { const source = sourceArticleURL(link.url); return source ? navigation.external(source, "the original article") : { label: "unavailable source", apply() {} }; }
    const formatNumber = format === "readable" ? 3 : format === "pdf" ? 2 : format === "monolith" ? 4 : link.image?.endsWith(".png") ? 0 : 1;
    const returnTo = readingLocationURL({ ...navigation.read(), linkId: link.id }, "/reading-room");
    return navigation.external(`/preserved/${link.id}?format=${formatNumber}&returnTo=${encodeURIComponent(returnTo)}`, "the preserved article");
  }}/>;
}
export default function ReadingRoomPage() {
  const { data: session, status } = useSession();
  const actorId = Number(session?.user?.id);
  const { data: user } = useUser();
  return <><Head><title>Reading Room — A place for your attention</title></Head>{status === "authenticated" && actorId ? <AuthenticatedRoom key={actorId} actorId={actorId} name={user?.id === actorId ? user.name || "Reader" : "Reader"}/> : <div className="reading-room rr-loading" role="status">Opening your reading room…</div>}</>;
}
export async function getServerSideProps({ locale }: { locale: string }) { return { props: { ...(await serverSideTranslations(locale, ["common"])) } }; }
