"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  type MotionValue,
} from "framer-motion";
import { useRef, type ReactNode, type RefObject } from "react";

export interface ScrollSplitCardItem {
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
  icon?: ReactNode;
}

interface ScrollSplitCardProps {
  className?: string;
  imageSrc: string;
  cards: ScrollSplitCardItem[];
  containerRef?: RefObject<HTMLElement | null>;
  startHint?: string;
  endHint?: string;
}

function panelRadius(
  index: number,
  left: MotionValue<string>,
  middle: MotionValue<string>,
  right: MotionValue<string>,
) {
  if (index === 0) return left;
  if (index === 2) return right;
  return middle;
}

export function ScrollSplitCard({
  className,
  imageSrc,
  cards,
  containerRef: externalContainerRef,
  startHint = "Role para explorar",
  endHint = "Pronto para buscar seu voo",
}: ScrollSplitCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });

  const leftX = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, -48, -24]);
  const rightX = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, 48, 24]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.9]);

  const rotateY = useTransform(scrollYProgress, [0.4, 0.8], [0, 180]);
  const rotateZLeft = useTransform(scrollYProgress, [0.4, 0.8], [0, 6]);
  const rotateZRight = useTransform(scrollYProgress, [0.4, 0.8], [0, -6]);

  const borderRadiusLeft = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["16px 0px 0px 16px", "16px 16px 16px 16px"],
  );
  const borderRadiusMiddle = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["0px 0px 0px 0px", "16px 16px 16px 16px"],
  );
  const borderRadiusRight = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["0px 16px 16px 0px", "16px 16px 16px 16px"],
  );
  const borderOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.2]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.4]);
  const boxShadow = useMotionTemplate`inset 0 1px 1px rgba(255, 255, 255, ${borderOpacity}), inset 0 -24px 48px rgba(0, 0, 0, ${shadowOpacity}), 0 25px 50px -12px rgba(0, 0, 0, ${shadowOpacity})`;

  const cardsY = useTransform(scrollYProgress, [0.8, 1], [0, -200]);
  const textOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.8, 1], [40, 0]);
  const startTextOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const startTextY = useTransform(scrollYProgress, [0, 0.1], [0, 20]);

  return (
    <div ref={containerRef} className={cn("relative h-[500vh] w-full", className)}>
      <div className="scroll-split-sticky sticky flex w-full flex-col items-center justify-center overflow-hidden">
        <motion.div
          className="absolute top-[18%] left-0 right-0 z-10 text-center"
          style={{ opacity: startTextOpacity, y: startTextY }}
        >
          <p className="scroll-split-hint">{startHint}</p>
        </motion.div>

        <motion.div
          style={{ scale, y: cardsY, transformStyle: "preserve-3d" }}
          className="relative flex h-[min(420px,58vh)] w-full max-w-4xl px-4"
        >
          {cards.slice(0, 3).map((card, i) => (
            <motion.div
              key={`${card.title}-${i}`}
              className="relative h-full flex-1"
              style={{
                x: i === 0 ? leftX : i === 2 ? rightX : 0,
                rotateY,
                rotateZ: i === 0 ? rotateZLeft : i === 2 ? rotateZRight : 0,
                zIndex: i,
                transformStyle: "preserve-3d",
              }}
            >
              <motion.div
                className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                style={{
                  zIndex: 2,
                  borderRadius: panelRadius(
                    i,
                    borderRadiusLeft,
                    borderRadiusMiddle,
                    borderRadiusRight,
                  ),
                  boxShadow,
                }}
              >
                <div
                  className="absolute inset-0 h-full w-[300%]"
                  style={{ left: `${-100 * i}%`, position: "absolute" }}
                >
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 900px"
                    className="object-cover"
                    priority={false}
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </motion.div>

              <motion.div
                className={cn(
                  "absolute inset-0 overflow-hidden flex flex-col justify-end p-6 md:p-8 [backface-visibility:hidden] will-change-transform",
                  "border border-white/5 bg-gradient-to-br from-white/10 to-transparent",
                )}
                style={{
                  backgroundColor: card.bgColor,
                  color: card.textColor,
                  transform: "rotateY(180deg)",
                  zIndex: 1,
                  borderRadius: panelRadius(
                    i,
                    borderRadiusLeft,
                    borderRadiusMiddle,
                    borderRadiusRight,
                  ),
                  boxShadow,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-15 mix-blend-overlay scroll-split-noise"
                  aria-hidden
                />
                {card.icon}
                <h3 className="scroll-split-card-title relative m-0 text-xl font-bold leading-tight md:text-2xl">
                  {card.title}
                </h3>
                <p className="relative mt-2 mb-0 text-sm leading-relaxed opacity-90 md:text-[0.95rem]">
                  {card.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="absolute bottom-[16%] left-0 right-0 z-10 text-center"
          style={{ opacity: textOpacity, y: textY }}
        >
          <p className="scroll-split-hint scroll-split-hint--end">{endHint}</p>
        </motion.div>
      </div>
    </div>
  );
}
