import { BackLink } from "@/components/navigation/back-link";

type InfoSection = {
  title: string;
  body: string;
};

export function InfoPage({
  eyebrow,
  title,
  description,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: InfoSection[];
}) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:py-20">
      <BackLink href="/" />
      <header className="mt-10 max-w-3xl">
        <p className="ap-kicker">{eyebrow}</p>
        <h1 className="font-display text-ink mt-4 text-4xl text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
          {description}
        </p>
      </header>
      <div className="mt-12 grid gap-4">
        {sections.map((section) => (
          <section key={section.title} className="ap-surface rounded-2xl p-6 sm:p-8">
            <h2 className="text-foreground text-lg font-semibold">{section.title}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
