"use client";

import { ScrollBasedVelocity } from "@/components/ui/scroll-based-velocity";

type Props = {
  appName: string;
};

export function SiteMarquee({ appName }: Props) {
  const text = `${appName} · compare dinheiro e milhas · encontre o melhor voo · busque com clareza · `;

  return (
    <div className="site-marquee" aria-hidden>
      <ScrollBasedVelocity
        text={text}
        default_velocity={0.7}
        className="site-marquee-text"
      />
    </div>
  );
}
