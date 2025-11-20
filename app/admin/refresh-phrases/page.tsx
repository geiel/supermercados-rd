import { Button } from "@/components/ui/button"
import { refreshPhrasesV2 } from "@/lib/search-phrases-v2";

export default async function Page() {
  return (
    <div className="container mx-auto pt-2">
      <Button onClick={refreshPhrasesV2}>Refresh</Button>
    </div>
  );
}
