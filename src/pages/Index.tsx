import { useState, useEffect } from "react";
import { Quiz1 } from "@/components/funnel/Quiz1";
import { VideosSection } from "@/components/funnel/VideosSection";
import { Quiz2 } from "@/components/funnel/Quiz2";
import { Checkout } from "@/components/funnel/Checkout";

type Step = "quiz1" | "videos" | "quiz2" | "checkout";

const Index = () => {
  const [step, setStep] = useState<Step>("quiz1");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden">
        Crie uma página de vendas completa, agressiva e de alta conversão, seguindo EXATAMENTE a mesma estrutura, lógica, estilo visual, cores e fluxo da minha página de futebol[](https://tcnicasdeftbol.lovable.app).

        Produto: Desafío 7 Días de Transformación
        Público: Todas as mulheres (não só mães)
        Idioma: 100% espanhol latino-americano
        Formato: Página de vendas tradicional com mini VSL no topo (não é quiz)

        ### Oferta principal (seja extremamente agressivo):
        - 50 exercícios para fazer em casa (vídeos + materiais)
        - 50 receitas de emagrecimento
        - Resultado prometido: ver perda de pelo menos 10 kg em 7 dias + barriga desinchada
        - Acesso imediato
        - Atualizações
        - Bônus exclusivos

        ### Estrutura obrigatória (mesma da página de futebol):

        1. Barra de urgência no topo (verde ou roxa):
        "🔥 OFERTA EXCLUSIVA SOLO HOY — Últimas plazas del cupo diario"

        2. Hero forte:
        - Headline agressiva: algo como “Pierde hasta 10 kg y deshincha tu barriga en solo 7 días”
        - Subheadline falando dos 50 exercícios + 50 receitas
        - Mini VSL (espaço para vídeo)
        - CTA grande: “QUIERO EMPEZAR MI TRANSFORMACIÓN AHORA”

        3. Seção de dor (logo após o hero)
        4. “Lo que vas a receber” com cards dos 50 exercícios + 50 receitas
        5. Como funciona em 3 passos
        6. Seção de resultados / transformações
        7. 4 Bônus exclusivos
        8. Seção de preços com desconto grande (estilo Plan Premium x Básico)
        9. Garantia de 7 dias
        10. Comparação “Sin el Desafío / Con el Desafío”
        11. FAQ
        12. CTA final forte

        Use as mesmas cores e estilo visual da página de futebol (amarelo destaque, verde de urgência, botões fortes, tipografia bold).

        Copy deve ser extremamente agressiva, emocional e focada em desejo + urgência. Fale de mulheres que estão cansadas de dietas que não funcionam, de se sentirem inchadas, de não caber nas roupas, etc.

        No final, deixe os CTAs padronizados como:
        “QUIERO MI ACCESO AHORA”
        “Empezar mi Transformación de 7 Días”
      </div>
      {step === "quiz1" && <Quiz1 onComplete={() => setStep("videos")} />}
      {step === "videos" && <VideosSection onContinue={() => setStep("quiz2")} />}
      {step === "quiz2" && <Quiz2 onComplete={() => setStep("checkout")} />}
      {step === "checkout" && <Checkout />}
    </main>
  );
};

export default Index;
