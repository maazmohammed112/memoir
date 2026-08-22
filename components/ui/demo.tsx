"use client";

import { useEffect, useState } from "react";
import { BlackHoleHeroSection } from "./blackhole-hero-section";
import { StreamingText } from "./streaming-text";

function useNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setNarrow(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

export function BlackHoleHeroSectionDemo() {
  const narrow = useNarrow();

  return (
    <section className="relative min-h-[92svh] w-full md:min-h-[720px]">
      <BlackHoleHeroSection
        focus={narrow ? [0.5, 0.76] : [0.72, 0.46]}
        scrim={narrow ? "top" : "left"}
        scrimStrength={0.9}
        distance={24}
        elevation={narrow ? -7 : -5.5}
        fov={narrow ? 58 : 42}
        glow={narrow ? 0.85 : 1}
        steps={narrow ? 200 : 300}
        resolution={narrow ? 0.6 : 0.7}
      >
        <div className="flex h-full min-h-[92svh] items-start px-6 pt-14 sm:px-10 md:min-h-[720px] md:items-center md:pt-0 lg:px-20">
          <div className="max-w-[34rem]">
            <h1 className="text-[2.5rem] font-light leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.25rem]">
              Light does not
              <br />
              leave here
            </h1>

            <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-white/60 md:mt-7">
              The ring above the shadow is the far side of the disc, bent over
              the top. Nothing put it there but gravity.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
              <a
                href="#"
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Get started
              </a>
              <a
                href="#"
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Read the maths
              </a>
            </div>
          </div>
        </div>
      </BlackHoleHeroSection>
    </section>
  );
}

export function StreamingTextDemo() {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center bg-background p-8">
      <StreamingText />
    </div>
  );
}

export default function UIDemoShowcase() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <BlackHoleHeroSectionDemo />
      <div className="max-w-4xl mx-auto py-16 px-6">
        <h2 className="text-2xl font-bold mb-6">Streaming Text Component Demo</h2>
        <StreamingTextDemo />
      </div>
    </div>
  );
}
