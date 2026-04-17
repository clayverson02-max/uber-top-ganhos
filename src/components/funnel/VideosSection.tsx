import { useState } from "react";
import { Play, ChevronRight, Star } from "lucide-react";

interface VideosSectionProps {
  onContinue: () => void;
}

const videos = [
  {
    name: "Carlos, 38 anos – Uber SP",
    result: "R$ 2.140 em 6 dias",
    caption: "Eu tava rodando 14h e ganhando R$ 800 na semana. Apliquei o método e EXPLODIU.",
  },
  {
    name: "Rafael – 99 e InDrive RJ",
    result: "R$ 2.380 líquido em 7 dias",
    caption: "Achei que era mais um curso. Mas no 3º dia já tava vendo a diferença na conta.",
  },
  {
    name: "Júnior – Moto, BH",
    result: "R$ 1.980 em 7 dias na moto",
    caption: "Dobrei meu faturamento sem rodar mais. O segredo tá nos horários e na zona certa.",
  },
];

export const VideosSection = ({ onContinue }: VideosSectionProps) => {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < videos.length - 1) setCurrent(current + 1);
    else onContinue();
  };

  const v = videos[current];

  return (
    <div className="min-h-screen gradient-hero px-5 py-8">
      <div className="max-w-md mx-auto">
        {/* Headline */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-block bg-money/20 border border-money/40 rounded-full px-4 py-1 mb-3">
            <span className="text-money text-xs font-bold uppercase tracking-wider">
              ✓ Resultado Real
            </span>
          </div>
          <h2 className="text-3xl font-black leading-tight">
            Veja o que motoristas <span className="text-orange">REAIS</span> estão conseguindo agora
          </h2>
        </div>

        {/* Video player */}
        <div key={current} className="animate-fade-in">
          <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-card border-2 border-orange/30">
            {/* Placeholder for TikTok video */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-deep-blue to-black">
              <div className="w-20 h-20 rounded-full gradient-orange flex items-center justify-center mb-4 animate-pulse-cta">
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </div>
              <p className="text-white/60 text-sm px-6 text-center">
                [ Espaço pro seu vídeo do TikTok #{current + 1} ]
              </p>
            </div>

            {/* Caption overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="bg-money text-white text-center py-2 px-3 rounded-xl font-black text-lg mb-2 shadow-money">
                {v.result}
              </div>
              <p className="text-white text-base font-bold leading-tight text-center">
                "{v.caption}"
              </p>
              <p className="text-white/70 text-xs text-center mt-2">— {v.name}</p>
            </div>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-orange text-orange" />
            ))}
          </div>

          {/* Counter dots */}
          <div className="flex justify-center gap-2 mt-3">
            {videos.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-orange" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={next}
          className="w-full mt-6 gradient-cta text-white font-black text-lg py-5 rounded-2xl shadow-orange flex items-center justify-center gap-2 animate-pulse-cta active:scale-95 transition-transform"
        >
          {current < videos.length - 1 ? (
            <>
              PRÓXIMO VÍDEO <ChevronRight className="w-6 h-6" />
            </>
          ) : (
            <>
              QUERO ESSE RESULTADO <ChevronRight className="w-6 h-6" />
            </>
          )}
        </button>

        {/* Sub copy */}
        <p className="text-center text-foreground/90 text-base mt-6 leading-relaxed font-medium">
          Esses motoristas estavam na <span className="text-orange font-bold">MESMA</span> situação
          que você… agora estão faturando{" "}
          <span className="text-money font-black">R$ 2.000 líquido em 7 dias</span>.
        </p>
        <p className="text-center text-muted-foreground text-sm mt-2">
          Assista e veja como é possível 👇
        </p>
      </div>
    </div>
  );
};
