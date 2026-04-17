import { useState, useEffect } from "react";
import { Check, Trophy, Loader2, Sparkles, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/pixel";
import { toast } from "@/hooks/use-toast";

const KIWIFY_URL = "https://pay.kiwify.com.br/RRZgaP9";
const PRICE = 7.9;

const LOADING_STEPS = [
  "Analisando seu perfil de motorista...",
  "Cruzando suas respostas com casos de sucesso...",
  "Liberando estratégia personalizada...",
  "Garantindo sua vaga no Desafio 2K...",
];

export const Checkout = () => {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    trackEvent("ViewContent", {
      content_name: "2K em 7 Dias - Conscientização",
      value: PRICE,
    });
  }, []);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleContinue = async () => {
    if (loading) return;
    const phoneDigits = whatsapp.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast({
        title: "WhatsApp inválido",
        description: "Digite seu número com DDD",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 700);

    try {
      // Save lead (only whatsapp + dummy required fields)
      await supabase.from("leads").insert({
        name: "Lead Funil",
        whatsapp: phoneDigits,
        email: `lead-${phoneDigits}@funil.local`,
        order_bump_active: false,
        total_price: PRICE,
        user_agent: navigator.userAgent,
        source: "funnel-final",
      });

      await trackEvent("Lead", {
        value: PRICE,
        content_name: "Lead Capturado",
        phone: phoneDigits,
      });

      // Wait for steps animation to play out (~3.2s)
      await new Promise((r) => setTimeout(r, 3200));
      clearInterval(stepInterval);
      setLoadingStep(LOADING_STEPS.length - 1);

      // Show success screen
      setShowSuccess(true);

      await trackEvent("InitiateCheckout", {
        value: PRICE,
        content_name: "2K em 7 Dias",
        phone: phoneDigits,
      });
    } catch (e) {
      console.error(e);
      clearInterval(stepInterval);
      toast({
        title: "Algo deu errado",
        description: "Tente novamente",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const goToCheckout = () => {
    window.location.href = KIWIFY_URL;
  };

  // ============ LOADING SCREEN ============
  if (loading && !showSuccess) {
    return (
      <div className="min-h-screen gradient-hero px-5 py-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full gradient-orange flex items-center justify-center mx-auto mb-6 shadow-orange">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-black mb-3">Preparando tudo pra você...</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Não feche essa tela, já liberamos seu acesso 👇
          </p>

          <div className="space-y-3 text-left">
            {LOADING_STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  i <= loadingStep
                    ? "bg-money/10 border-money/40 opacity-100"
                    : "bg-card/30 border-border opacity-40"
                }`}
              >
                {i < loadingStep ? (
                  <div className="w-6 h-6 rounded-full bg-money flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" strokeWidth={4} />
                  </div>
                ) : i === loadingStep ? (
                  <Loader2 className="w-6 h-6 text-orange animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0" />
                )}
                <span className="text-sm font-semibold">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============ SUCCESS / FINAL CTA SCREEN ============
  if (showSuccess) {
    return (
      <div className="min-h-screen gradient-hero px-5 py-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full gradient-money flex items-center justify-center mx-auto mb-5 shadow-money animate-pulse-cta">
            <Trophy className="w-14 h-14 text-white" />
          </div>

          <div className="inline-block bg-money/20 border border-money/40 rounded-full px-4 py-1 mb-4">
            <span className="text-money text-xs font-black uppercase tracking-wider">
              ✓ PARABÉNS, VOCÊ FOI APROVADO
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
            Você chegou até aqui e já está na frente de{" "}
            <span className="text-money">98% dos motoristas</span> 🚀
          </h1>

          <p className="text-foreground/90 text-base mb-3 leading-relaxed">
            A maioria continua <strong className="text-orange">presa no passado</strong>, rodando 12h
            por dia e tomando prejuízo todos os dias.
          </p>
          <p className="text-foreground/90 text-base mb-6 leading-relaxed">
            Você está a <strong className="text-money">1 clique</strong> de virar essa chave e fazer
            no mínimo <strong className="text-money">R$ 2.000 ainda essa semana</strong>.
          </p>

          <div className="bg-card/60 backdrop-blur border border-orange/30 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-orange" />
              <span className="text-xs font-bold uppercase text-orange">Acesso Liberado</span>
            </div>
            <p className="text-sm text-muted-foreground line-through">De R$ 97,00</p>
            <p className="text-5xl font-black text-money my-1">R$ 7,90</p>
            <p className="text-xs text-foreground/70">à vista, acesso vitalício</p>
          </div>

          <p className="text-sm text-foreground/80 mb-3 font-semibold">
            👇 Clique no botão abaixo e garanta agora mesmo sua estratégia
          </p>

          <button
            onClick={goToCheckout}
            className="w-full gradient-cta text-white font-black text-lg sm:text-xl py-6 rounded-2xl shadow-orange animate-pulse-cta active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Rocket className="w-6 h-6" />
            QUERO FATURAR 2K ESSA SEMANA
          </button>

          <p className="text-xs text-muted-foreground mt-4">
            🔒 Pagamento 100% seguro • Garantia de 7 dias
          </p>
        </div>
      </div>
    );
  }

  // ============ INITIAL FORM (only WhatsApp) ============
  return (
    <div className="min-h-screen gradient-hero px-5 py-8 flex flex-col">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-block bg-orange/20 border border-orange/40 rounded-full px-3 py-1 mb-4">
            <span className="text-orange text-xs font-black uppercase tracking-wider">
              🔥 Última Etapa
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-3">
            Falta só <span className="text-orange">1 passo</span> pra liberar seu{" "}
            <span className="text-money">acesso vitalício</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Digite seu WhatsApp pra a gente reservar sua vaga e enviar o acesso 👇
          </p>
        </div>

        <div className="bg-card rounded-2xl p-5 border-2 border-orange/40 mb-5 animate-fade-in">
          <label className="block text-xs font-bold uppercase text-orange mb-2 tracking-wide">
            📲 Seu WhatsApp (com DDD)
          </label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
            className="w-full h-14 px-4 rounded-xl bg-background border-2 border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-orange"
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full gradient-cta text-white font-black text-lg py-6 rounded-2xl shadow-orange animate-pulse-cta active:scale-95 transition-transform leading-tight disabled:opacity-70 flex items-center justify-center gap-2"
        >
          CONTINUAR E LIBERAR ACESSO 🚀
        </button>

        <p className="text-center text-xs text-muted-foreground mt-5">
          🔒 Seus dados estão 100% seguros
        </p>
      </div>
    </div>
  );
};
