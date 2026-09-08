import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Business verification",
  description: "What verification means on ApnaPick.",
  path: "/verification",
});

export default function VerificationPage() {
  return (
    <InfoPage
      eyebrow="Business trust"
      title="What verification means"
      description="Verification helps confirm that the person managing a listing has a legitimate relationship with the business."
      sections={[
        {
          title: "Ownership checks",
          body: "We may review business contact details, submitted evidence, public records, and account history before approving ownership.",
        },
        {
          title: "What it does not mean",
          body: "Verification is not an endorsement, quality guarantee, or paid ranking benefit. Customers should still use their own judgment.",
        },
        {
          title: "Keep details current",
          body: "Verified businesses remain responsible for accurate hours, services, prices, contact details, and ownership information.",
        },
      ]}
    />
  );
}
