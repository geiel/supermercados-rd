import { Button } from "@/components/ui/button";
import { refreshPhrases } from "@/lib/scrappers/admin-functions";

export default async function Page() {
  return (
    <div className="container mx-auto pt-2">
      <Button onClick={refreshPhrases}>Refresh</Button>
    </div>
  );
}
