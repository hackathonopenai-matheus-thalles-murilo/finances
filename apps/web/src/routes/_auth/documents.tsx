import { createFileRoute } from "@tanstack/react-router";

import { GuideList } from "@/components/documents/guide-list";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_auth/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <Page
      title="Documentos"
      description="As guias preparadas para você, das mais recentes às mais antigas."
    >
      <GuideList />
    </Page>
  );
}
