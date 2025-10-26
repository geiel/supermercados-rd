import { Button } from "@/components/ui/button"
import { refreshPhrases } from "@/lib/search-phrases";

export default async function Page() {
  return (
    <div className="container mx-auto pt-2">
      <Button onClick={refreshPhrases}>Refresh</Button>
    </div>
  );
}
