// Meta Conversions API - server-side event forwarding
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "1277687807088988";
const ACCESS_TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN")!;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      value,
      currency = "BRL",
      content_name,
      email,
      phone,
      first_name,
      fbp,
      fbc,
      user_agent,
      client_ip,
    } = body;

    if (!event_name) {
      return new Response(JSON.stringify({ error: "event_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull IP from request headers (client never sends its real IP)
    const ip =
      client_ip ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      undefined;

    const user_data: Record<string, unknown> = {
      client_user_agent: user_agent,
      client_ip_address: ip,
    };
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;
    if (email) user_data.em = [await sha256(email)];
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      const withCountry = digits.startsWith("55") ? digits : "55" + digits;
      user_data.ph = [await sha256(withCountry)];
    }
    if (first_name) user_data.fn = [await sha256(first_name)];

    const custom_data: Record<string, unknown> = { currency };
    if (typeof value === "number") custom_data.value = value;
    if (content_name) custom_data.content_name = content_name;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source: "website",
          user_data,
          custom_data,
        },
      ],
    };

    const url = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    // Always return 200 — Meta validation errors shouldn't break the client flow
    if (!res.ok) {
      console.warn("Meta CAPI rejected event:", event_name, JSON.stringify(result));
    }
    return new Response(JSON.stringify({ ok: res.ok, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("CAPI error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
