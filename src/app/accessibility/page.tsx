import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Accessibility",
  description: "ApnaPick accessibility commitments and support.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <InfoPage
      eyebrow="Accessibility"
      title="Local discovery should work for everyone"
      description="We design for keyboard, screen-reader, zoom, reduced-motion, touch, and high-contrast use across consumer and business experiences."
      sections={[
        {
          title: "Supported interaction",
          body: "Core tasks are designed to work without a mouse, with visible focus, meaningful labels, predictable navigation, and text alternatives.",
        },
        {
          title: "Display preferences",
          body: "Light, dark, and system themes are available. Motion and transparency preferences are respected where the browser exposes them.",
        },
        {
          title: "Report a barrier",
          body: "Email accessibility@apnapick.com with the page, task, browser, and assistive technology involved so we can investigate.",
        },
      ]}
    />
  );
}
