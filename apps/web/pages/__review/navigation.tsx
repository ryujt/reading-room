import Link from "next/link";
import type { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
/** Local review fixture: real Next routing, no history injection. */
export default function NavigationReview() {
  return <main style={{ padding: 40, font: "18px/1.6 system-ui" }}><h1>Reading Room navigation review</h1><p>This local review route creates a normal Next history entry.</p><Link href="/reading-room?link=6" style={{ textDecoration: "underline" }}>Enter article 6 through Next Link</Link><p><Link href="/dashboard">Return to original dashboard</Link></p></main>;
}
export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  if (!/^(127\.0\.0\.1|localhost):4721$/.test(req.headers.host || "")) return { notFound: true };
  return { props: { ...(await serverSideTranslations(locale || "en", ["common"])) } };
};
