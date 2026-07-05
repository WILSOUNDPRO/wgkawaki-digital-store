import type { Context, Config } from "@netlify/functions";

// Catalogue des produits et de leur prix — modifiable ici uniquement, jamais côté client.
const PRODUCTS: Record<string, { price_amount: number; price_currency: string; order_description: string }> = {
  "prompts-ia-viral": { price_amount: 9.99, price_currency: "usd", order_description: "Prompts IA Viral — Le Pack Ultime" },
  "scripts-ugc-viral": { price_amount: 12.99, price_currency: "usd", order_description: "Scripts UGC Viral — Le Pack Ultime" },
  "wordpress-a-z": { price_amount: 17.99, price_currency: "usd", order_description: "WordPress de A à Z" },
  "adobe-createurs": { price_amount: 14.99, price_currency: "usd", order_description: "Adobe pour Créateurs" },
  "bubble-nocode": { price_amount: 19.99, price_currency: "usd", order_description: "Bubble No-Code" },
  "pack-complet": { price_amount: 49.99, price_currency: "usd", order_description: "Pack Complet — WG_kawaki Digital Store" },
};

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), { status: 405 });
  }

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalide" }), { status: 400 });
  }

  const product = body.productId ? PRODUCTS[body.productId] : undefined;
  if (!product) {
    return new Response(JSON.stringify({ error: "Produit inconnu" }), { status: 400 });
  }

  const apiKey = Netlify.env.get("NOWPAYMENTS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Clé API NOWPayments non configurée" }), { status: 500 });
  }

  try {
    const npRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: product.price_amount,
        price_currency: product.price_currency,
        order_description: product.order_description,
        success_url: "https://wgkawaki-digital-store.netlify.app/?paiement=succes",
        cancel_url: "https://wgkawaki-digital-store.netlify.app/?paiement=annule",
      }),
    });

    if (!npRes.ok) {
      const errText = await npRes.text();
      return new Response(JSON.stringify({ error: "Erreur NOWPayments", detail: errText }), { status: 502 });
    }

    const data = await npRes.json();
    return new Response(JSON.stringify({ invoice_url: data.invoice_url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/create-invoice",
};
