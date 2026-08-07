"use client";

import dynamic from "next/dynamic";

const HomeScrollSplit = dynamic(
  () =>
    import("@/components/home/home-scroll-split").then((m) => m.HomeScrollSplit),
  {
    ssr: false,
    loading: () => (
      <section
        className="home-scroll-split home-scroll-split--placeholder"
        aria-hidden
      />
    ),
  },
);

export function HomeScrollSplitLazy() {
  return <HomeScrollSplit />;
}
