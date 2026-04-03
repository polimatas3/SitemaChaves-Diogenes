import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VISTA_API_URL = Deno.env.get("VISTA_API_URL")!;
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
    p.Logradouro,
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
  const destaque = list.find((f) => {
    const fo = f as Record<string, unknown>;
    return fo.Destaque === "1" || fo.Destaque === 1;
  }) as Record<string, unknown> | undefined;
  const chosen = (destaque ?? list[0]) as Record<string, unknown>;
  return (chosen?.Foto as string) ?? null;
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
      "Tipo",
      "Situacao",
      "Logradouro",
      "Numero",
      "Complemento",
      "Bairro",
      "Cidade",
      "CEP",
      "Descricao",
      "ValorVenda",
      "ValorLocacao",
      "AreaUtil",
      "Dormitorio",
      "Vagas",
      { Corretor: ["Nome", "Fone", "E-mail"] },
      { fotos: ["Foto", "Destaque"] },
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

Deno.serve(async (_req: Request) => {
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

      if (props.length === 0) break;

      const rows = props.map((p) => {
        const corretor = p.Corretor as Record<string, string> | null | undefined;
        return {
          di: String(p.Codigo),
          address: buildAddress(p),
          description: String(p.Descricao ?? ""),
          sale_price: toNum(p.ValorVenda),
          status: mapStatus(p.Situacao),
          captador_name: corretor?.Nome ?? null,
          captador_phone: corretor?.Fone ?? null,
          captador_email: corretor?.["E-mail"] ?? null,
          tipo_imovel: (p.Tipo as string) ?? null,
          finalidade: (p.Finalidade as string) ?? null,
          valor_locacao: toNum(p.ValorLocacao),
          area_util: toNum(p.AreaUtil),
          dormitorios: toInt(p.Dormitorio),
          vagas: toInt(p.Vagas),
          bairro: (p.Bairro as string) ?? null,
          foto_url: findFoto(p.fotos),
          vista_synced_at: syncedAt,
        };
      });

      const { error } = await supabase
        .from("properties")
        .upsert(rows, { onConflict: "di" });

      if (error) throw error;
      totalSynced += rows.length;
      page++;
    } while (page <= totalPages);

    return new Response(
      JSON.stringify({ ok: true, synced: totalSynced, pages: totalPages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Vista sync error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
