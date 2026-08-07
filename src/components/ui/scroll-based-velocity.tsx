"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface ScrollBasedVelocityProps {
  /** @deprecated Prefer `items` for interactive marquees */
  text?: string;
  items?: ReactNode[];
  default_velocity?: number;
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface ParallaxProps {
  children: ReactNode;
  baseVelocity: number;
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  reducedMotion: boolean;
}

function wrap(min: number, max: number, v: number): number {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

function ParallaxTrack({
  children,
  baseVelocity = 100,
  className,
  containerRef,
  reducedMotion,
}: ParallaxProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll(
    containerRef ? { container: containerRef } : undefined,
  );
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const x = useTransform(baseX, (v) => `${wrap(-12.5, 0, v)}%`);
  const directionFactor = useRef<number>(1);

  useAnimationFrame((_t, delta) => {
    if (reducedMotion) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const copies = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="site-marquee-segment">
      {children}
    </span>
  ));

  if (reducedMotion) {
    return (
      <div className="site-marquee-track site-marquee-track--static">
        <div className={cn("flex flex-nowrap whitespace-nowrap", className)}>
          {copies.slice(0, 2)}
        </div>
      </div>
    );
  }

  return (
    <div className="site-marquee-track overflow-hidden whitespace-nowrap flex flex-nowrap">
      <motion.div
        className={cn("flex flex-nowrap whitespace-nowrap", className)}
        style={{ x }}
      >
        {copies}
      </motion.div>
    </div>
  );
}

export function ScrollBasedVelocity({
  text,
  items,
  default_velocity = 5,
  className,
  containerRef,
}: ScrollBasedVelocityProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const content: ReactNode =
    items && items.length > 0 ? (
      <span className="site-marquee-items">{items}</span>
    ) : (
      text ?? ""
    );

  return (
    <section className="relative w-full site-marquee-velocity">
      <ParallaxTrack
        baseVelocity={default_velocity}
        className={className}
        containerRef={containerRef}
        reducedMotion={reducedMotion}
      >
        {content}
      </ParallaxTrack>
      {!reducedMotion ? (
        <ParallaxTrack
          baseVelocity={-default_velocity}
          className={className}
          containerRef={containerRef}
          reducedMotion={reducedMotion}
        >
          {content}
        </ParallaxTrack>
      ) : null}
    </section>
  );
}
