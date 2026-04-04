import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VISTA_API_URL = Deno.env.get("VISTA_BASE_URL")!;
const VISTA_API_KEY = Deno.env.get("VISTA_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type VistaProperty = Record<string, unknown>;

const STATUS_MAP: Record<string, string> = {
  Ativo: "Ativo",
  ativo: "Ativo",
  Suspenso: "Inativa",
  suspenso: "Inativa",
  Inativo: "Inativa",
  inativo: "Inativa",
  "Negociação": "Negociação",
  Vendido: "Vendida",
  vendido: "Vendida",
  Vendida: "Vendida",
};

function mapStatus(s: unknown): string {
  return STATUS_MAP[String(s ?? "")] ?? "Ativo";
}

function buildAddress(p: VistaProperty): string {
  return [
    p.Endereco ?? p.Logradouro,
    p.Numero ? `nº ${p.Numero}` : null,
    p.Complemento ?? null,
    p.Bairro,
    p.Cidade,
  ]
    .filter(Boolean)
    .join(", ");
}

function findFoto(fotos: unknown): string | null {
  if (!fotos || typeof fotos !== "object") return null;
  const list = Array.isArray(fotos)
    ? fotos
    : Object.values(fotos as Record<string, unknown>).filter(
        (v) => typeof v === "object" && v !== null
      );
  if (list.length === 0) return null;
  const principal = list.find((f) => {
    const fo = f as Record<string, unknown>;
    return fo.Principal === "1" || fo.Principal === 1 ||
           fo.Destaque === "1" || fo.Destaque === 1;
  }) as Record<string, unknown> | undefined;
  const chosen = (principal ?? list[0]) as Record<string, unknown>;
  return (chosen?.URLArquivo ?? chosen?.Foto) as string | null;
}

function toNum(v: unknown): number | null {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.,]/g, "").replace(",", "."));
  return isNaN(n) || n === 0 ? null : n;
}

function toInt(v: unknown): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) || n === 0 ? null : n;
}

async function fetchPage(page: number) {
  const pesquisa = JSON.stringify({
    fields: [
      "Codigo",
      "Finalidade",
      "TipoImovel",
      "Situacao",
      "Endereco",
      "Numero",
      "Complemento",
      "Bairro",
      "Cidade",
      "CEP",
      "DescricaoWeb",
      "ValorVenda",
      "ValorLocacao",
      "AreaTotal",
      "Dormitorios",
      "Vagas",
      { Corretor: ["Nome", "Fone", "Email"] },
    ],
    paginacao: { pagina: page, quantidade: 50 },
  });

  const url = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}&pesquisa=${encodeURIComponent(pesquisa)}&showtotal=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vista API HTTP ${res.status}: ${body}`);
  }
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  // Check required secrets
  if (!VISTA_API_URL) return json({ ok: false, error: "Secret VISTA_BASE_URL não configurado no Supabase" }, 500);
  if (!VISTA_API_KEY) return json({ ok: false, error: "Secret VISTA_API_KEY não configurado no Supabase" }, 500);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const syncedAt = new Date().toISOString();

    let page = 1;
    let totalPages = 1;
    let totalSynced = 0;

    do {
      const data = await fetchPage(page);
      totalPages = Number(data.paginas ?? data.totalPages ?? 1);

      // Vista returns properties as object keyed by Codigo
      const rawProps = data.imoveis ?? data;
      const props: VistaProperty[] = Array.isArray(rawProps)
        ? rawProps
        : (Object.values(rawProps as Record<string, unknown>).filter(
            (v) => typeof v === "object" && v !== null && !Array.isArray(v)
          ) as VistaProperty[]);

      // Filtrar apenas imóveis da Diógenes (código começa com "DI")
      const diProps = props.filter((p) =>
        String(p.Codigo ?? "").toUpperCase().startsWith("DI")
      );

      if (diProps.length === 0) { page++; continue; }

      const rows = diProps.map((p) => {
        const corretor = p.Corretor as Record<string, string> | null | undefined;
        return {
          di: String(p.Codigo),
          address: buildAddress(p),
          description: String(p.DescricaoWeb ?? p.Descricao ?? ""),
          sale_price: toNum(p.ValorVenda),
          status: mapStatus(p.Situacao),
          captador_name: corretor?.Nome ?? null,
          captador_phone: corretor?.Fone ?? null,
          captador_email: corretor?.Email ?? corretor?.["E-mail"] ?? null,
          tipo_imovel: (p.TipoImovel ?? p.Tipo) as string | null,
          finalidade: (p.Finalidade as string) ?? null,
          valor_locacao: toNum(p.ValorLocacao),
          area_util: toNum(p.AreaTotal ?? p.AreaUtil),
          dormitorios: toInt(p.Dormitorios ?? p.Quartos ?? p.Dormitorio),
          vagas: toInt(p.Vagas),
          bairro: (p.Bairro as string) ?? null,
          foto_url: null, // fotos desativado temporariamente — nomes de campos a confirmar
          vista_synced_at: syncedAt,
        };
      });

      const { error } = await supabase
        .from("properties")
        .upsert(rows, { onConflict: "di" });

      if (error) throw error;
      totalSynced += diProps.length;
      page++;
    } while (page <= totalPages);

    return json({ ok: true, synced: totalSynced, pages: totalPages });
  } catch (err) {
    console.error("Vista sync error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
