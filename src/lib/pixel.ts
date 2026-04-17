// Meta Pixel + Conversions API helpers
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function getCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function uuid(): string {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface TrackParams {
  value?: number;
  currency?: string;
  content_name?: string;
  email?: string;
  phone?: string;
  first_name?: string;
}

export async function trackEvent(eventName: string, params: TrackParams = {}) {
  const event_id = uuid();

  // Browser pixel
  try {
    window.fbq?.("track", eventName, {
      value: params.value,
      currency: params.currency ?? "BRL",
      content_name: params.content_name,
    }, { eventID: event_id });
  } catch (e) {
    console.warn("fbq failed", e);
  }

  // Server CAPI (deduped via event_id)
  try {
    await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_id,
        event_source_url: window.location.href,
        value: params.value,
        currency: params.currency ?? "BRL",
        content_name: params.content_name,
        email: params.email,
        phone: params.phone,
        first_name: params.first_name,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        user_agent: navigator.userAgent,
      },
    });
  } catch (e) {
    console.warn("CAPI failed", e);
  }

  return event_id;
}

export function getPixelContext() {
  return {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    user_agent: navigator.userAgent,
  };
}
