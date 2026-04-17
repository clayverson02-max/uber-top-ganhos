import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { QuizOption } from "./QuizOption";
import { ArrowRight, Flame } from "lucide-react";

interface Quiz1Props {
  onComplete: () => void;
}

const questions = [
  {
    title: "Quantas horas por dia você fica rodando?",
    subtitle: "Seja sincero, isso vai mudar tudo 👇",
    options: [
      { emoji: "⏰", label: "Menos de 6h por dia" },
      { emoji: "🚗", label: "Entre 6h e 10h por dia" },
      { emoji: "🔥", label: "Mais de 10h… tô viciado em rodar" },
      { emoji: "😩", label: "Mais de 12h e mesmo assim não sobra" },
    ],
  },
  {
    title: "Quanto sobra POR SEMANA depois de tirar combustível?",
    subtitle: "A maioria fica chocado quando faz a conta…",
    options: [
      { emoji: "💸", label: "Menos de R$ 500 (tô no prejuízo)" },
      { emoji: "😐", label: "Entre R$ 500 e R$ 900" },
      { emoji: "🤔", label: "Entre R$ 900 e R$ 1.400" },
      { emoji: "💪", label: "Mais de R$ 1.400" },
    ],
  },
  {
    title: "Qual SUA maior dor hoje rodando?",
    subtitle: "Pode marcar a que mais te aperta 👊",
    options: [
      { emoji: "⛽", label: "Combustível comendo todo o lucro" },
      { emoji: "📱", label: "Apps mandando corrida ruim direto" },
      { emoji: "😴", label: "Trabalho muito e ganho pouco" },
      { emoji: "🏠", label: "Não sobra nada pra família no fim do mês" },
    ],
  },
  {
    title: "Você já tentou alguma 'estratégia' pra ganhar mais?",
    subtitle: "Sem julgamento, só pra entender seu momento",
    options: [
      { emoji: "🆕", label: "Nunca tentei nada, só aceito corrida" },
      { emoji: "📺", label: "Vi vídeo no YouTube mas não funcionou" },
      { emoji: "🧠", label: "Tenho minhas manhas mas não evolui" },
      { emoji: "🎯", label: "Tô buscando um método que funciona MESMO" },
    ],
  },
  {
    title: "Se você descobrisse como fazer R$ 2.000 LÍQUIDO em 7 dias…",
    subtitle: "Você estaria disposto a aplicar?",
    options: [
      { emoji: "🚀", label: "SIM! Tô pronto pra mudar AGORA" },
      { emoji: "✅", label: "Sim, se for simples eu aplico" },
      { emoji: "🤝", label: "Quero ver o método primeiro" },
      { emoji: "👀", label: "Tô curioso, me mostra" },
    ],
  },
];

export const Quiz1 = ({ onComplete }: Quiz1Props) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const handleSelect = (idx: number) => {
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        onComplete();
      }
    }, 280);
  };

  const q = questions[step];

  return (
    <div className="min-h-screen gradient-hero px-5 py-6 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 mb-5">
        <Flame className="w-5 h-5 text-orange" />
        <span className="text-xs font-bold uppercase tracking-wider text-orange">
          Diagnóstico do Motorista
        </span>
      </div>

      <ProgressBar current={step + 1} total={questions.length} label="Pergunta" />

      {/* Headline only on first step */}
      {step === 0 && (
        <div className="mt-6 mb-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            Responda <span className="text-orange">5 perguntas rápidas</span> e veja{" "}
            <span className="text-money">quanto dinheiro</span> você joga fora todo mês rodando sem
            estratégia
          </h1>
        </div>
      )}

      {/* Question card */}
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
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        🔒 Suas respostas são 100% confidenciais
      </p>
    </div>
  );
};
