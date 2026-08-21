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
        vamos la quero que mude todo esse projeto por esse: Crie um funil de quiz completo idêntico a este (vou enviar as screenshots), mas 100% traduzido para espanhol latino-americano...
      </div>
      {step === "quiz1" && <Quiz1 onComplete={() => setStep("videos")} />}
      {step === "videos" && <VideosSection onContinue={() => setStep("quiz2")} />}
      {step === "quiz2" && <Quiz2 onComplete={() => setStep("checkout")} />}
      {step === "checkout" && <Checkout />}
    </main>
  );
};

export default Index;
