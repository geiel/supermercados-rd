import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default async function Home() {
  

  return (
    <main className="container mx-auto">
      <section>
        <div>
          Ofertas
          <ScrollArea className="rounded-md border whitespace-nowrap">
            <div className="flex w-max space-x-4 p-4">
              
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </section>
    </main>
  );
}
