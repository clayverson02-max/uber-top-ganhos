import { useState, useRef, useEffect } from "react";
import { ChevronRight, Star, Volume2, VolumeX } from "lucide-react";
import video1 from "@/assets/video-1.mp4";
import proof1 from "@/assets/proof-1.png";
import proof2 from "@/assets/proof-2.png";
import proof3 from "@/assets/proof-3.png";

interface VideosSectionProps {
  onContinue: () => void;
}

type Slide =
  | { type: "video"; src: string; result: string; caption: string; name: string }
  | { type: "image"; src: string; result: string; caption: string; name: string };

const slides: Slide[] = [
  {
    type: "video",
    src: video1,
    result: "R$ 440,42 em 1 dia",
    caption: "22 viagens, faturamento bruto na tela. Aplicando o método na prática.",
    name: "Motorista real — gravação ao vivo",
  },
  {
    type: "image",
    src: proof1,
    result: "R$ 440,42 só HOJE",
    caption: "22 viagens concluídas em 1 dia. Imagina isso 7 dias seguidos…",
    name: "Print do app do motorista",
  },
  {
    type: "image",
    src: proof2,
    result: "R$ 8.606,11 em 1 semana",
    caption: "213 viagens em 7 dias. É o método 2K em 7 Dias funcionando.",
    name: "Resumo semanal Uber",
  },
  {
    type: "image",
    src: proof3,
    result: "Faturamento na semana 🔥",
    caption: "Os números não mentem. Quem aplica, COLHE.",
    name: "Print de resultado",
  },
];

export const VideosSection = ({ onContinue }: VideosSectionProps) => {
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const slide = slides[current];

  useEffect(() => {
    if (slide.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [current, slide.type]);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else onContinue();
  };

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

        {/* Media player */}
        <div key={current} className="animate-fade-in">
          <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-card border-2 border-orange/30">
            {slide.type === "video" ? (
              <>
                <video
                  ref={videoRef}
                  src={slide.src}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                />
                <button
                  onClick={() => setMuted(!muted)}
                  className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/20"
                  aria-label={muted ? "Ativar som" : "Mutar"}
                >
                  {muted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                {muted && (
                  <div className="absolute top-16 right-3 bg-orange text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">
                    Toque pra ouvir 👆
                  </div>
                )}
              </>
            ) : (
              <img
                src={slide.src}
                alt={slide.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Caption overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/85 to-transparent">
              <div className="bg-money text-white text-center py-2 px-3 rounded-xl font-black text-lg mb-2 shadow-money">
                {slide.result}
              </div>
              <p className="text-white text-base font-bold leading-tight text-center">
                "{slide.caption}"
              </p>
              <p className="text-white/70 text-xs text-center mt-2">— {slide.name}</p>
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
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-orange" : "w-2 bg-muted"
                }`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={next}
          className="w-full mt-6 gradient-cta text-white font-black text-lg py-5 rounded-2xl shadow-orange flex items-center justify-center gap-2 animate-pulse-cta active:scale-95 transition-transform"
        >
          {current < slides.length - 1 ? (
            <>
              PRÓXIMO <ChevronRight className="w-6 h-6" />
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
          Veja os prints e o vídeo — não tem como duvidar 👇
        </p>
      </div>
    </div>
  );
};
