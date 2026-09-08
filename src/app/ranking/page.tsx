import { InfoPage } from "@/components/content/info-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "How ranking works",
  description: "How ApnaPick orders organic and sponsored discovery results.",
  path: "/ranking",
});

export default function RankingPage() {
  return (
    <InfoPage
      eyebrow="Discovery integrity"
      title="How ApnaPick ranking works"
      description="Organic ranking is based on relevance and useful local signals. Payment never changes a business’s organic relevance score."
      sections={[
        {
          title: "Organic results",
          body: "We consider how closely a listing matches the request, distance, availability, profile quality, trusted engagement, and review signals.",
        },
        {
          title: "Sponsored placements",
          body: "Paid placements are selected separately from organic ranking and are always presented in a clearly labeled Sponsored section.",
        },
        {
          title: "Fairness and quality",
          body: "We monitor abuse, duplicate listings, misleading information, and review manipulation. Ranking signals may evolve as quality improves.",
        },
      ]}
    />
  );
}
