import { useState, useEffect } from "react";
import { Check, Lock, Shield, Clock, Star, Zap } from "lucide-react";

export const Checkout = () => {
  const [bumpChecked, setBumpChecked] = useState(true);
  const [minutes, setMinutes] = useState(14);
  const [seconds, setSeconds] = useState(59);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => (m > 0 ? m - 1 : 0));
        return 59;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const total = 7.9 + (bumpChecked ? 3 : 0);

  const handleCheckout = () => {
    // Aqui vai entrar o link do checkout (Kiwify/Hotmart) depois
    alert("👉 Aqui entra o link do checkout depois que você cadastrar o produto!");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Urgency timer */}
        <div className="bg-destructive text-white text-center py-3 px-4 rounded-xl mb-4 font-bold text-sm flex items-center justify-center gap-2 animate-pulse">
          <Clock className="w-4 h-4" />
          OFERTA EXPIRA EM: {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>

        {/* Headline */}
        <div className="text-center mb-5">
          <div className="inline-block bg-orange/20 border border-orange/40 rounded-full px-3 py-1 mb-3">
            <span className="text-orange text-xs font-black uppercase">🔥 ÚLTIMAS VAGAS</span>
          </div>
          <h1 className="text-2xl font-black leading-tight">
            Falta só 1 passo pra você começar a faturar{" "}
            <span className="text-money">R$ 2.000 em 7 dias</span>
          </h1>
        </div>

        {/* Product card */}
        <div className="bg-card rounded-2xl p-5 mb-3 border-2 border-orange shadow-orange">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl gradient-orange flex items-center justify-center flex-shrink-0">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg leading-tight">2K em 7 Dias Apps</h3>
              <p className="text-xs text-muted-foreground">
                Método completo + planilha de horários + zonas quentes
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground line-through">R$ 97</p>
              <p className="font-black text-money text-lg">R$ 7,90</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              "Acesso imediato e vitalício",
              "Estratégia exata pros 7 primeiros dias",
              "Mapa de zonas de pico (SP, RJ, BH e +)",
              "Funciona pra Uber, 99, InDrive (carro e moto)",
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-money flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={4} />
                </div>
                <span className="text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Bump */}
        <button
          onClick={() => setBumpChecked(!bumpChecked)}
          className={`w-full text-left bg-card rounded-2xl p-4 mb-3 border-2 transition-all ${
            bumpChecked ? "border-money shadow-money" : "border-dashed border-money/50"
          }`}
        >
          <div className="bg-money text-white text-center text-xs font-black py-1 rounded-md mb-3 uppercase tracking-wide">
            ⭐ Melhor bônus que você pode levar hoje
          </div>
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                bumpChecked ? "bg-money border-money" : "border-muted-foreground"
              }`}
            >
              {bumpChecked && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-black text-base">SIM! Quero o "Tempo é Ouro"</h4>
                <span className="font-black text-money text-base whitespace-nowrap">+ R$ 3,00</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Aprenda os <strong className="text-foreground">3 horários secretos</strong> que
                pagam até <strong className="text-money">3x mais</strong> a corrida. Aplica no mesmo
                dia.
              </p>
            </div>
          </div>
        </button>

        {/* Total */}
        <div className="bg-card rounded-2xl p-4 mb-4 border border-border">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-muted-foreground">2K em 7 Dias Apps</span>
            <span className="font-bold">R$ 7,90</span>
          </div>
          {bumpChecked && (
            <div className="flex justify-between items-center mb-2 text-sm animate-fade-in">
              <span className="text-muted-foreground">Tempo é Ouro</span>
              <span className="font-bold">R$ 3,00</span>
            </div>
          )}
          <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
            <span className="font-black text-lg">TOTAL</span>
            <span className="font-black text-2xl text-money">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          className="w-full gradient-cta text-white font-black text-lg py-6 rounded-2xl shadow-orange animate-pulse-cta active:scale-95 transition-transform mb-4 leading-tight"
        >
          SIM, QUERO COMEÇAR A FATURAR HOJE 🚀
        </button>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Shield className="w-6 h-6 text-money mx-auto mb-1" />
            <p className="text-[10px] font-bold leading-tight">Compra Segura</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Lock className="w-6 h-6 text-money mx-auto mb-1" />
            <p className="text-[10px] font-bold leading-tight">SSL Criptografado</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Clock className="w-6 h-6 text-money mx-auto mb-1" />
            <p className="text-[10px] font-bold leading-tight">7 Dias Garantia</p>
          </div>
        </div>

        {/* Guarantee */}
        <div className="bg-money/10 border-2 border-money/40 rounded-2xl p-4 mb-5 flex gap-3">
          <Shield className="w-12 h-12 text-money flex-shrink-0" />
          <div>
            <h4 className="font-black text-money mb-1">GARANTIA INCONDICIONAL DE 7 DIAS</h4>
            <p className="text-xs text-foreground/80 leading-snug">
              Se em 7 dias você não ver resultado, devolvemos seu dinheiro. Sem perguntas, sem
              burocracia.
            </p>
          </div>
        </div>

        {/* Mini testimonials */}
        <h3 className="font-black text-center mb-3 text-sm uppercase tracking-wide text-orange">
          O que estão dizendo 👇
        </h3>
        <div className="space-y-3 mb-5">
          {[
            {
              name: "Marcos – Uber",
              text: "Em 5 dias já tinha feito R$ 1.700. No 7º dia bati R$ 2.300!",
            },
            {
              name: "Diego – 99 Moto",
              text: "Pensei que era furada por R$ 7,90… melhor R$ 7 que gastei na vida.",
            },
            {
              name: "Paulo – InDrive",
              text: "Os horários do bônus 'Tempo é Ouro' valem o produto sozinhos!",
            },
          ].map((t, i) => (
            <div key={i} className="bg-card rounded-xl p-3 border border-border">
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-3 h-3 fill-orange text-orange" />
                ))}
              </div>
              <p className="text-sm leading-snug mb-1">"{t.text}"</p>
              <p className="text-xs text-muted-foreground font-bold">— {t.name}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <button
          onClick={handleCheckout}
          className="w-full gradient-cta text-white font-black text-lg py-6 rounded-2xl shadow-orange active:scale-95 transition-transform leading-tight"
        >
          QUERO MINHA VAGA AGORA 🔥
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4 mb-2">
          🚨 Vagas estão acabando — comece ainda essa semana
        </p>
      </div>
    </div>
  );
};
