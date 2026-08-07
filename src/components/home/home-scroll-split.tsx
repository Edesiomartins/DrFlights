"use client";

import { ScrollSplitCard } from "@/components/ui/scroll-split-card";

const CARDS = [
  {
    title: "Dinheiro e milhas",
    description:
      "Compare o custo real na mesma busca e escolha a forma que faz mais sentido para a sua viagem.",
    bgColor: "#f3ebe0",
    textColor: "#102033",
  },
  {
    title: "Múltiplas fontes",
    description:
      "Consulte diferentes provedores em paralelo, sem abrir várias abas ou perder o contexto.",
    bgColor: "#0f6f67",
    textColor: "#ffffff",
  },
  {
    title: "Melhor custo-benefício",
    description:
      "Preço, duração, escalas e bagagem entram na decisão — com clareza para seguir ao fornecedor.",
    bgColor: "#0b1f2a",
    textColor: "#f3ebe0",
  },
];

export function HomeScrollSplit() {
  return (
    <section className="home-scroll-split" aria-label="Explore o DrFlights">
      <div className="home-scroll-split-bg" aria-hidden />
      <ScrollSplitCard
        imageSrc="/hero-travel.png"
        cards={CARDS}
        startHint="Role para revelar"
        endHint="Agora é só buscar sua passagem"
      />
    </section>
  );
}
