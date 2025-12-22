import { Button } from "@/components/ui/button"
import { validateAdminUser } from "@/lib/authentication";
import { refreshPhrasesV2 } from "@/lib/search-phrases-v2";

export default async function Page() {
  await validateAdminUser();

  return (
    <div className="container mx-auto pt-2">
      <Button onClick={refreshPhrasesV2}>Refresh</Button>
    </div>
  );
}
