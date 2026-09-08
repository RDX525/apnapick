import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Help",
  description: "Get help using ApnaPick as a customer or business.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="How can we help?"
      description="Find guidance for discovery, listings, verification, reviews, and business tools."
      sections={[
        {
          title: "Finding a business",
          body: "Search for the exact dish or service you need, then refine by location, availability, rating, and price.",
        },
        {
          title: "Managing a listing",
          body: "Business owners can claim a listing, complete verification, and manage public information from the business workspace.",
        },
        {
          title: "Contact support",
          body: "For account, safety, or listing support, email support@apnapick.com with the relevant business name and page link.",
        },
      ]}
    />
  );
}
