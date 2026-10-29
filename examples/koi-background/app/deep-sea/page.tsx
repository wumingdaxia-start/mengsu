import DeepSeaBackground from "../../components/DeepSeaBackground";

export default function DeepSeaDemo() {
  return (
    <main className="min-h-screen bg-[#041a32] p-4 text-slate-100 md:p-10">
      {/* isolate keeps the negative-z canvas above the page background, below the UI. */}
      <section className="relative isolate mx-auto aspect-video w-full overflow-hidden rounded-2xl">
        <DeepSeaBackground />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-serif text-3xl tracking-wide md:text-5xl">潜入一片宁静</h1>
          <p className="mt-5 text-sm text-blue-100/80">让思绪，随着鱼群缓缓流动。</p>
        </div>
      </section>
    </main>
  );
}
