import { generateSeoHubMetadata, renderSeoHubPage } from "@/features/seo/seo-hub-page";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  return generateSeoHubMetadata({ params });
}

export default async function CategoryPage({ params }: Props) {
  return renderSeoHubPage({ params });
}
