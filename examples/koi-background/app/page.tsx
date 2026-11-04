import KoiLakeBackground from '../components/KoiLakeBackground';

export default function Page() {
  return (
    <main className="relative isolate min-h-dvh text-[#fffdf2]">
      <KoiLakeBackground />
      <div className="absolute inset-0 -z-[1] bg-[#183d31]/[0.08]" />
      <header className="px-8 py-7 text-xl tracking-widest">花屿星</header>
      <section className="relative mx-auto flex aspect-video min-h-[70dvh] max-w-7xl flex-col items-center justify-center px-6 text-center [text-shadow:0_2px_18px_#214637]">
        <h1 className="font-serif text-3xl md:text-4xl">梦的片段，总有回来的地方。</h1>
        <p className="mt-5 text-sm leading-7">记下醒来时的梦，回看记忆里的线索与故事。</p>
        <a href="/dream" className="mt-8 rounded-full border border-white/60 bg-white/15 px-7 py-3 text-sm backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">进入花屿星</a>
      </section>
    </main>
  );
}
