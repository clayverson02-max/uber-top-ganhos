import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { QuizOption } from "./QuizOption";
import { Trophy, Sparkles } from "lucide-react";

interface Quiz2Props {
  onComplete: () => void;
}

const questions = [
  {
    title: "Depois de ver esses resultados… o que você sente?",
    subtitle: "Responde com o coração 💭",
    options: [
      { emoji: "🔥", label: "Vontade de mudar HOJE mesmo" },
      { emoji: "💪", label: "Eu também consigo, só preciso do método" },
      { emoji: "😤", label: "Tô cansado de rodar pra ganhar pouco" },
      { emoji: "🎯", label: "Quero focar e parar de perder tempo" },
    ],
  },
  {
    title: "Você está disposto a aplicar por 7 dias seguidos?",
    subtitle: "É só 1 semana pra virar o jogo",
    options: [
      { emoji: "✅", label: "SIM! 7 dias eu aguento de boa" },
      { emoji: "🚀", label: "Aplico tudo certinho como o método pede" },
      { emoji: "💼", label: "Faço de tudo pra mudar minha realidade" },
      { emoji: "🏆", label: "Quero ser o próximo caso de sucesso" },
    ],
  },
  {
    title: "Quanto MUDARIA na sua vida fechar R$ 2.000 essa semana?",
    subtitle: "Imagina essa grana caindo na conta…",
    options: [
      { emoji: "🏠", label: "Pagaria contas atrasadas" },
      { emoji: "👨‍👩‍👧", label: "Daria uma vida melhor pra família" },
      { emoji: "🛻", label: "Investiria no carro / moto" },
      { emoji: "😌", label: "Finalmente respiraria sem aperto" },
    ],
  },
  {
    title: "Se eu te mostrasse esse método por menos de R$ 10…",
    subtitle: "Menos que um lanche, e muda sua semana",
    options: [
      { emoji: "🤝", label: "Fechado, é barato demais pra perder" },
      { emoji: "💰", label: "Por esse preço eu entro AGORA" },
      { emoji: "🔓", label: "Quero acesso imediato" },
      { emoji: "⚡", label: "Bora, tô dentro!" },
    ],
  },
];

export const Quiz2 = ({ onComplete }: Quiz2Props) => {
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = () => {
    setTimeout(() => {
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        setShowResult(true);
      }
    }, 280);
  };

  if (showResult) {
    return (
      <div className="min-h-screen gradient-hero px-5 py-8 flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full gradient-money flex items-center justify-center mx-auto mb-5 shadow-money animate-pulse-cta">
            <Trophy className="w-14 h-14 text-white" />
          </div>

          <div className="inline-block bg-money/20 border border-money/40 rounded-full px-4 py-1 mb-4">
            <span className="text-money text-xs font-black uppercase tracking-wider">
              ✓ PERFIL APROVADO
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
            Você tem <span className="text-money">98% de chance</span> de fechar{" "}
            <span className="text-orange">R$ 2.000 em 7 dias</span> 🚀
          </h2>

          <p className="text-foreground/90 text-base mb-2 leading-relaxed">
            Seu perfil bate exatamente com os motoristas que mais ganharam com o Desafio.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Agora é só dar o próximo passo 👇
          </p>

          <div className="bg-card/60 backdrop-blur border border-orange/30 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-orange" />
              <span className="text-xs font-bold uppercase text-orange">Oferta Liberada</span>
            </div>
            <p className="text-sm text-muted-foreground line-through">De R$ 97,00</p>
            <p className="text-5xl font-black text-money my-1">R$ 7,90</p>
            <p className="text-xs text-foreground/70">à vista, acesso vitalício</p>
          </div>

          <button
            onClick={onComplete}
            className="w-full gradient-cta text-white font-black text-lg sm:text-xl py-6 rounded-2xl shadow-orange animate-pulse-cta active:scale-95 transition-transform"
          >
            QUERO ENTRAR NO DESAFIO POR R$ 7,90
          </button>

          <p className="text-xs text-muted-foreground mt-4">
            🔒 Pagamento 100% seguro • Garantia de 7 dias
          </p>
        </div>
      </div>
    );
  }

  const q = questions[step];

  return (
    <div className="min-h-screen gradient-hero px-5 py-6 flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-orange" />
        <span className="text-xs font-bold uppercase tracking-wider text-orange">
          Última Etapa
        </span>
      </div>

      <ProgressBar current={step + 1} total={questions.length} label="Pergunta" />

      {step === 0 && (
        <div className="mt-6 mb-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            Depois de ver esses resultados reais…{" "}
            <span className="text-orange">você quer finalmente faturar</span>{" "}
            <span className="text-money">R$ 2.000 em 7 dias?</span>
          </h1>
        </div>
      )}

      <div key={step} className="mt-6 flex-1 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2">
          {q.title}
        </h2>
        <p className="text-muted-foreground text-sm mb-5">{q.subtitle}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <QuizOption
              key={i}
              emoji={opt.emoji}
              label={opt.label}
              selected={false}
              onClick={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
