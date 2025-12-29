import { Button } from "@/components/ui/button"
import { validateAdminUser } from "@/lib/authentication";
import { refreshPhrasesV2 } from "@/lib/search-phrases-v2";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<RefreshPhrasesFallback />}>
      <RefreshPhrasesPage />
    </Suspense>
  );
}

async function RefreshPhrasesPage() {
  await validateAdminUser();

  return (
    <div className="container mx-auto pt-2">
      <Button onClick={refreshPhrasesV2}>Refresh</Button>
    </div>
  );
}

function RefreshPhrasesFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}
