"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "drflights-onboarding-v1";

const STEPS = [
  {
    title: "Escolha origem e destino",
    body: "Use códigos IATA ou busque pelo nome da cidade. Compararemos várias fontes reais.",
  },
  {
    title: "Defina datas flexíveis",
    body: "Ida (e volta) com intervalo ajuda a achar tarifas melhores — o calendário mostra dias baratos quando houver dados.",
  },
  {
    title: "Entenda o selo de preço",
    body: "“Abaixo do normal / típico / alto” só aparece com histórico suficiente de PriceSnapshot. Sem amostra, não inventamos selo.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "done") return;
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!open) return null;

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  const current = STEPS[step]!;

  return (
    <div className="onboarding-overlay" data-testid="onboarding-tour" role="dialog" aria-modal="true">
      <div className="glass onboarding-card">
        <p className="section-kicker">
          Passo {step + 1} de {STEPS.length}
        </p>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="onboarding-actions">
          <button className="btn btn-secondary" type="button" onClick={finish}>
            Pular
          </button>
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={finish}>
              Começar a buscar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
