import { generateSeoHubMetadata, renderSeoHubPage } from "@/features/seo/seo-hub-page";

type Props = {
  params: Promise<{
    category: string;
    area: string;
    facet: string;
    item: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  return generateSeoHubMetadata({ params });
}

export default async function CategoryAreaFacetItemPage({ params }: Props) {
  return renderSeoHubPage({ params });
}
