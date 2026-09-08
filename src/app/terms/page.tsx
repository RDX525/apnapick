import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Terms",
  description: "Terms for using ApnaPick.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Clear rules for a trusted marketplace"
      description="Using ApnaPick means providing accurate information, respecting other people, and avoiding manipulation or abuse."
      sections={[
        {
          title: "Business information",
          body: "Businesses are responsible for keeping listing details, availability, prices, offers, ownership, and contact information accurate.",
        },
        {
          title: "Reviews and conduct",
          body: "Reviews must reflect genuine experiences. Harassment, fraud, impersonation, spam, and attempts to manipulate rankings are prohibited.",
        },
        {
          title: "Platform availability",
          body: "Features may change as the service improves. We may restrict content or accounts when needed for security, legal compliance, or user safety.",
        },
      ]}
    />
  );
}
