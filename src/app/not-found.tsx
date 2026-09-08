import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sea text-sm font-medium tracking-[0.2em] uppercase">404</p>
      <h1 className="font-display text-ink mt-3 text-3xl">Page not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This route doesn&apos;t exist yet, or the link may be outdated.
      </p>
      <Button asChild className="mt-8 min-h-11 px-5">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
