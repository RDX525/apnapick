import { buildPageMetadata } from "@/lib/seo/metadata";
import { PhotosManagerPage } from "@/features/dashboard/photos-manager";

export const metadata = buildPageMetadata({
  title: "Photos · Dashboard",
  description: "Manage business photos",
  path: "/business/dashboard/photos",
  noIndex: true,
});

export default function Page() {
  return <PhotosManagerPage />;
}
