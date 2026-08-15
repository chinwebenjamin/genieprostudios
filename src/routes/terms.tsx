import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GUIDELINES, PROJECT_TERMS } from "@/lib/packages";
import { useStudioSettings } from "@/hooks/useStudio";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Studio Guidelines & Terms — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Booking, payment, rescheduling and project management terms for sessions at Genie Pro Music Studio.",
      },
      { property: "og:title", content: "Studio Guidelines & Terms — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Read the studio guidelines and project management terms before booking a session.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data } = useStudioSettings();
  const guidelines = data?.guidelines?.length ? data.guidelines : GUIDELINES;
  const terms = data?.project_terms?.length ? data.project_terms : PROJECT_TERMS;
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="display-title text-4xl sm:text-5xl">Guidelines & terms</h1>

        <h2 className="mt-8 text-2xl text-primary">Studio guidelines</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {guidelines.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>

        <h2 className="mt-8 text-2xl text-primary">Project management terms</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {terms.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>
    </AppShell>
  );
}
