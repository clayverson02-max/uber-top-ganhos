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
      {step === "quiz1" && <Quiz1 onComplete={() => setStep("videos")} />}
      {step === "videos" && <VideosSection onContinue={() => setStep("quiz2")} />}
      {step === "quiz2" && <Quiz2 onComplete={() => setStep("checkout")} />}
      {step === "checkout" && <Checkout />}
    </main>
  );
};

export default Index;
