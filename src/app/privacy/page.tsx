import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Privacy",
  description: "How ApnaPick handles account, listing, review, and location data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Your data, handled with purpose"
      description="We collect only the information needed to operate local discovery, business listings, account security, and platform safety."
      sections={[
        {
          title: "Location",
          body: "Precise discovery coordinates remain in your browser session. Coarse area information may be used to understand aggregate search demand.",
        },
        {
          title: "Accounts and listings",
          body: "Account and business information is used to authenticate users, operate claimed listings, prevent abuse, and provide requested services.",
        },
        {
          title: "Your choices",
          body: "You may request access, correction, or deletion of eligible personal information by contacting privacy@apnapick.com.",
        },
      ]}
    />
  );
}
