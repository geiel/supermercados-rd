export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid auto-rows-min gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
