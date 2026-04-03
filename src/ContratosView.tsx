import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, ChevronLeft, Sparkles, Printer, Save, Clock,
  CheckCircle2, AlertCircle, Loader2, Plus, Trash2, Eye, Pencil,
  Upload, ScanLine, PenLine
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openai } from './lib/openai';
import { supabase } from './lib/supabase';
import {
  TIPOS_CONTRATO, TipoContrato, TipoContratoInfo, CampoFormulario
} from './lib/contractTemplates';

interface Contrato {
  id: number;
  tipo: TipoContrato;
  titulo: string;
  dados: Record<string, string>;
  texto_gerado: string | null;
  status: 'rascunho' | 'finalizado';
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/\D/g, '')) / 100;
  if (isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function maskCurrency(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 13);
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split('').reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const d1 = calc(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== parseInt(d[9])) return false;
  const d2 = calc(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === parseInt(d[10]);
}

// ─── Campo individual ─────────────────────────────────────────────────────────

function Campo({ campo, value, onChange }: {
  campo: CampoFormulario;
  value: string;
  onChange: (v: string) => void;
}) {
  const [cpfError, setCpfError] = useState(false);

  const isCpfComplete = campo.tipo === 'cpf' && value.replace(/\D/g, '').length === 11;
  const baseOk  = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white transition-colors border-slate-200 focus:ring-[#1A55FF]/30 focus:border-[#1A55FF]';
  const baseErr = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white transition-colors border-red-400 focus:ring-red-300 focus:border-red-500';
  const base = cpfError ? baseErr : baseOk;

  const handleChange = (raw: string) => {
    if (campo.tipo === 'cpf') {
      const masked = maskCPF(raw);
      onChange(masked);
      // valida só quando completo
      if (masked.replace(/\D/g, '').length === 11) setCpfError(!validateCPF(masked));
      else setCpfError(false);
    } else if (campo.tipo === 'phone') {
      onChange(maskPhone(raw));
    } else if (campo.tipo === 'currency') {
      onChange(maskCurrency(raw));
    } else {
      onChange(raw);
    }
  };

  if (campo.tipo === 'select') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">Selecione...</option>
        {campo.opcoes?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (campo.tipo === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={campo.placeholder}
        rows={3}
        className={base + ' resize-none'}
      />
    );
  }

  return (
    <div className="relative">
      {campo.tipo === 'currency' && value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">R$</span>
      )}
      <input
        type={campo.tipo === 'date' ? 'date' : 'text'}
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={campo.tipo === 'currency' ? '0,00' : campo.placeholder}
        className={base + (campo.tipo === 'currency' && value ? ' pl-9' : '')}
        inputMode={campo.tipo === 'currency' || campo.tipo === 'number' ? 'numeric' : undefined}
      />
      {isCpfComplete && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${cpfError ? 'text-red-500' : 'text-emerald-600'}`}>
          {cpfError ? 'CPF inválido' : 'CPF válido'}
        </span>
      )}
    </div>
  );
}

// ─── Rodapé exclusividade de venda ────────────────────────────────────────────

function buildRodapeVenda(origin: string): string {
  const qrUrl = `${origin}/qrcode-diogenes.png`;
  const whatsappSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:52px;height:52px;flex-shrink:0"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  return `
    <div style="margin-top:2cm;padding-top:0.8cm;border-top:1.5px solid #000;display:flex;align-items:center;gap:1.2cm;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:flex;align-items:center;gap:0.5cm;flex-shrink:0;">
        <img src="${qrUrl}" style="width:110px;height:110px;" alt="QR Code Diógenes" />
        ${whatsappSvg}
      </div>
      <div style="border:1px solid #aaa;padding:0.5cm 0.8cm;text-align:center;font-size:10.5pt;line-height:2;">
        <div style="font-weight:bold;letter-spacing:0.03em;">DIÓGENES IMOBILIÁRIA</div>
        <div>CRECI JURÍDICO 20.806</div>
        <div style="color:#1155CC;text-decoration:underline;">vendas@diogenesimoveis.com</div>
        <div>www.diogenesimoveis.com</div>
      </div>
    </div>`;
}

function buildRodapeCompraVenda(): string {
  return `
    <div class="rodape-pagina">
      <div style="font-weight:bold;">Quadra 02 Conjunto C/D Lote A Sobrelojas 04/80/112, Ed Aziz Charter, Sobradinho/DF CEP 73.015-380</div>
      <div>www.diogenesimoveis.com &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; sac@diogenesimoveis.com</div>
    </div>`;
}

function buildRodapeAdministracao(): string {
  return `
    <div class="rodape-pagina">
      <div>Quadra 02 Conjunto C/D Lote A Sobrelojas 04/80/112, Ed Aziz Charter, Sobradinho/DF CEP 73.015-380.</div>
      <div>Contato: (61) 4101-855 / 99216-0176</div>
    </div>`;
}

function buildRodapeCessao(endereco: string): string {
  return `
    <div class="rodape-pagina">
      <div style="font-weight:bold;margin-bottom:2px;">${endereco}</div>
      <div>Diógenes Imóveis &nbsp;·&nbsp; 4101-8555 &nbsp;·&nbsp; www.diogenesimoveis.com.br &nbsp;·&nbsp; sac@diogenesimoveis.com</div>
    </div>`;
}

// ─── Tela de seleção de tipo ──────────────────────────────────────────────────

function SeletorTipo({ onSelect }: { onSelect: (t: TipoContratoInfo) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Novo Contrato</h2>
      <p className="text-sm text-slate-500 mb-6">Escolha o tipo de contrato para gerar</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIPOS_CONTRATO.map(tipo => {
          const isPersonalizado = tipo.id === 'personalizado';
          return (
            <button
              key={tipo.id}
              onClick={() => onSelect(tipo)}
              className={`text-left p-4 rounded-xl border transition-all group ${
                isPersonalizado
                  ? 'border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/50'
                  : 'border-slate-200 hover:border-[#1A55FF] hover:bg-blue-50/50'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                isPersonalizado
                  ? 'bg-violet-100 group-hover:bg-violet-200'
                  : 'bg-blue-100 group-hover:bg-blue-200'
              }`}>
                {isPersonalizado
                  ? <PenLine size={18} className="text-violet-600" />
                  : <FileText size={18} className="text-[#1A55FF]" />
                }
              </div>
              <p className="font-medium text-slate-800 text-sm">{tipo.titulo}</p>
              <p className="text-xs text-slate-500 mt-1">{tipo.descricao}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Formulário + geração ─────────────────────────────────────────────────────

function FormularioContrato({
  tipo,
  onBack,
  onSaved,
}: {
  tipo: TipoContratoInfo;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [dados, setDados] = useState<Record<string, string>>({});
  const [textoGerado, setTextoGerado] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [nomeContrato, setNomeContrato] = useState(tipo.titulo);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'upload' | 'form' | 'preview'>(
    tipo.id === 'personalizado' ? 'form' : 'upload'
  );
  const [extraindo, setExtraindo] = useState(false);
  const [docsEnviados, setDocsEnviados] = useState(0);
  const [camposPreenchidos, setCamposPreenchidos] = useState(0);
  const [uploadErro, setUploadErro] = useState<string | null>(null);
  const [parteDoc, setParteDoc] = useState<'parte1' | 'parte2' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PARTES_LABELS: Partial<Record<string, [string, string]>> = {
    autorizacao_venda:         ['Contratante 1', 'Contratante 2'],
    cessao_direitos:           ['Cedente',       'Cessionário'],
    administracao:             ['Locador',       ''],
    compra_venda_avista:       ['Vendedor',      'Comprador'],
    compra_venda_financiamento:['Vendedor',      'Comprador'],
  };
  const partesLabels = PARTES_LABELS[tipo.id] ?? ['Parte 1', 'Parte 2'];
  const showParteSeletor = !!partesLabels[1]; // só mostra seletor se tiver 2 partes
  const parteLabel = parteDoc === 'parte1' ? partesLabels[0]
                   : parteDoc === 'parte2' ? partesLabels[1]
                   : null;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const pdfToImages = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 4);
    const images: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx as any, canvas, viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
    }
    return images;
  };

  const handleDocUpload = async (file: File) => {
    setExtraindo(true);
    setUploadErro(null);
    try {
      const fieldList = tipo.campos
        .filter(c => c.tipo !== 'textarea')
        .map(c => `"${c.id}": "${c.label}"`)
        .join(', ');
      const parteCtx = parteLabel
        ? `Este documento pertence ao(à) ${parteLabel}. Mapeie os dados extraídos exclusivamente para os campos referentes ao(à) ${parteLabel}. `
        : '';
      const prompt = `${parteCtx}Extraia os dados visíveis neste documento e retorne APENAS um JSON com os campos que conseguir identificar. Campos disponíveis: {${fieldList}}. Retorne somente o JSON, sem nenhuma explicação.`;

      let imageContents: { type: 'image_url'; image_url: { url: string; detail: 'high' } }[];
      if (file.type === 'application/pdf') {
        const images = await pdfToImages(file);
        imageContents = images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${img}`, detail: 'high' },
        }));
      } else {
        const base64 = await fileToBase64(file);
        imageContents = [{ type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}`, detail: 'high' } }];
      }

      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [...imageContents, { type: 'text', text: prompt }],
        }],
        max_tokens: 800,
      });

      const content = resp.choices[0].message.content ?? '{}';
      const match = content.match(/\{[\s\S]*\}/);
      const extracted: Record<string, string> = match ? JSON.parse(match[0]) : {};
      const snapshot = { ...dados };
      let count = 0;
      for (const [key, val] of Object.entries(extracted)) {
        if (typeof val === 'string' && val.trim() && !snapshot[key]?.trim()) {
          snapshot[key] = val;
          count++;
        }
      }
      setDados(snapshot);
      setCamposPreenchidos(n => n + count);
      setDocsEnviados(n => n + 1);
    } catch {
      setUploadErro('Não foi possível identificar os dados do documento. Você pode preencher os campos manualmente na próxima etapa.');
    } finally {
      setExtraindo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setField = (id: string, value: string) =>
    setDados(prev => ({ ...prev, [id]: value }));

  const grupos = tipo.campos.reduce<Record<string, CampoFormulario[]>>((acc, c) => {
    const g = c.grupo || 'Geral';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  const camposFaltando = tipo.campos
    .filter(c => c.obrigatorio && !dados[c.id]?.trim())
    .map(c => c.label);

  const buildUserMessage = () => {
    const linhas = tipo.campos
      .filter(c => dados[c.id]?.trim())
      .map(c => `${c.label}: ${dados[c.id]}`);
    return `Gere o contrato do tipo "${tipo.titulo}" com os seguintes dados:\n\n${linhas.join('\n')}`;
  };

  const handleGerar = async () => {
    if (camposFaltando.length > 0) {
      setErro(`Preencha os campos obrigatórios: ${camposFaltando.join(', ')}`);
      return;
    }
    setErro(null);
    setGerando(true);
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: tipo.systemPrompt },
          { role: 'user', content: buildUserMessage() },
        ],
        temperature: 0.3,
      });
      const texto = resp.choices[0].message.content ?? '';
      setTextoGerado(texto);
      setEditandoTexto(false);
      setEtapa('preview');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(`Erro ao gerar: ${msg}`);
    } finally {
      setGerando(false);
    }
  };

  const handleSalvar = async (status: 'rascunho' | 'finalizado') => {
    setSalvando(true);
    try {
      await supabase.from('contratos').insert({
        tipo: tipo.id,
        titulo: nomeContrato.trim() || tipo.titulo,
        dados,
        texto_gerado: textoGerado,
        status,
      });
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(`Erro ao salvar: ${msg}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleImprimir = () => {
    const texto = textoGerado ?? '';
    const janela = window.open('', '_blank');
    if (!janela) return;
    const origin = window.location.origin;
    const logoUrl = `${origin}/logo-diogenes.png`;
    const rodapeFinal = tipo.id === 'autorizacao_venda' ? buildRodapeVenda(origin) : '';
    const enderecoImovel = dados['imovel_endereco'] || 'ENDEREÇO DO IMÓVEL TRANSACIONADO';
    const isCompraVenda = tipo.id === 'compra_venda_avista' || tipo.id === 'compra_venda_financiamento';
    const rodapePagina = tipo.id === 'cessao_direitos' ? buildRodapeCessao(enderecoImovel)
                       : tipo.id === 'administracao'   ? buildRodapeAdministracao()
                       : isCompraVenda                 ? buildRodapeCompraVenda()
                       : '';
    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${nomeContrato} — Diógenes Imobiliária</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;
                 margin: 3cm 2.5cm 3.5cm; color: #000; }
          .logo-header { margin-bottom: 1.2cm; padding-bottom: 0.6cm;
                         border-bottom: 1px solid #ccc; }
          .logo-header img { height: 56px; display: block; }
          pre { font-family: inherit; white-space: pre-wrap; text-align: justify; }
          .rodape-pagina { position: fixed; bottom: 0; left: 0; right: 0;
                           text-align: center; font-family: Arial, Helvetica, sans-serif;
                           font-size: 8.5pt; color: #444; border-top: 1px solid #bbb;
                           padding: 0.25cm 2.5cm; background: #fff; }
          @media print { body { margin: 2cm 2cm 3.5cm; } }
        </style>
      </head>
      <body>
        <div class="logo-header">
          <img src="${logoUrl}" alt="Diógenes Imobiliária" />
        </div>
        <pre>${texto}</pre>
        ${rodapeFinal}
        ${rodapePagina}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    janela.document.close();
  };

  if (etapa === 'upload') {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
            <ChevronLeft size={16} /> Voltar
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h2 className="font-semibold text-slate-800">{tipo.titulo}</h2>
            <p className="text-xs text-slate-500">Etapa 1 de 2 — documentos do cliente</p>
          </div>
        </div>

        {/* Card de upload */}
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <ScanLine size={28} className="text-[#1A55FF]" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Documentos do cliente</h3>
          <p className="text-sm text-slate-500 mb-1">
            Suba fotos de documentos (RG, CNH, CPF) para preencher os campos automaticamente.
          </p>
          <p className="text-xs text-slate-400 mb-6">Formatos aceitos: JPG, PNG, WEBP, PDF</p>

          {/* Seletor de parte */}
          {showParteSeletor && (
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-600 mb-2">Este documento pertence a:</p>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setParteDoc('parte1')}
                  className={`px-5 py-2 text-sm font-medium transition-colors ${
                    parteDoc === 'parte1'
                      ? 'bg-[#1A55FF] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {partesLabels[0]}
                </button>
                <button
                  onClick={() => setParteDoc('parte2')}
                  className={`px-5 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${
                    parteDoc === 'parte2'
                      ? 'bg-[#1A55FF] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {partesLabels[1]}
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={extraindo || (showParteSeletor && parteDoc === null)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1A55FF] text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extraindo
              ? <><Loader2 size={16} className="animate-spin" /> Processando...</>
              : <><Upload size={16} /> {showParteSeletor && !parteDoc ? 'Selecione a parte antes' : 'Selecionar documento'}</>
            }
          </button>

          {docsEnviados > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              <CheckCircle2 size={15} />
              {docsEnviados} documento(s) processado(s) · {camposPreenchidos} campo(s) preenchido(s) automaticamente
            </div>
          )}

          {uploadErro && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle size={15} /> {uploadErro}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEtapa('form')}
            disabled={extraindo}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Pular esta etapa
          </button>
          <button
            onClick={() => setEtapa('form')}
            disabled={extraindo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1A55FF] text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            Continuar para o formulário →
          </button>
        </div>
      </div>
    );
  }

  if (etapa === 'preview' && textoGerado !== null) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setEtapa('form')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
            <ChevronLeft size={16} /> Editar dados
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button
              onClick={() => handleSalvar('rascunho')}
              disabled={salvando}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar rascunho
            </button>
            <button
              onClick={() => handleSalvar('finalizado')}
              disabled={salvando}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#1A55FF] text-white hover:bg-blue-700 transition-colors"
            >
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Finalizar
            </button>
          </div>
        </div>

        {/* Nome do contrato */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Nome do contrato (para o histórico)</label>
          <input
            type="text"
            value={nomeContrato}
            onChange={e => setNomeContrato(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A55FF]/30 focus:border-[#1A55FF] bg-white"
            placeholder="Ex: Compra e Venda — João Silva / Ap. 703"
          />
        </div>

        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={15} /> {erro}
          </div>
        )}

        {/* Contrato editável */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-medium text-slate-500">Texto do contrato</span>
            <button
              onClick={() => setEditandoTexto(e => !e)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                editandoTexto
                  ? 'bg-[#1A55FF] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pencil size={12} />
              {editandoTexto ? 'Concluir edição' : 'Editar texto'}
            </button>
          </div>
          {editandoTexto ? (
            <textarea
              value={textoGerado}
              onChange={e => setTextoGerado(e.target.value)}
              className="w-full p-6 text-sm font-serif leading-relaxed text-slate-800 resize-none focus:outline-none"
              style={{ minHeight: '600px', textAlign: 'justify' }}
            />
          ) : (
            <div
              className="p-8 text-sm leading-relaxed whitespace-pre-wrap font-serif text-slate-800"
              style={{ textAlign: 'justify' }}
            >
              {textoGerado}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <div>
          <h2 className="font-semibold text-slate-800">{tipo.titulo}</h2>
          <p className="text-xs text-slate-500">{tipo.descricao}</p>
        </div>
      </div>

      {/* Formulário por grupos */}
      <div className="space-y-6">
        {Object.entries(grupos).map(([grupo, campos]) => (
          <div key={grupo} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{grupo}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {campos.map(campo => (
                <div key={campo.id} className={campo.tipo === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {campo.label}
                    {campo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Campo
                    campo={campo}
                    value={dados[campo.id] ?? ''}
                    onChange={v => setField(campo.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Erro */}
      {erro && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={15} /> {erro}
        </div>
      )}

      {/* Botão gerar */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleGerar}
          disabled={gerando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1A55FF] text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {gerando ? (
            <><Loader2 size={16} className="animate-spin" /> Gerando contrato...</>
          ) : (
            <><Sparkles size={16} /> Gerar contrato com IA</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Lista de contratos salvos ────────────────────────────────────────────────

function ListaContratos({ onNovo, refresh }: { onNovo: () => void; refresh: number }) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [visualizando, setVisualizando] = useState<Contrato | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [nomeEditado, setNomeEditado] = useState('');
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .order('created_at', { ascending: false });
      setContratos((data as Contrato[]) ?? []);
      setLoading(false);
    })();
  }, [refresh]);

  const abrirContrato = (c: Contrato) => {
    setVisualizando(c);
    setTextoEditado(c.texto_gerado ?? '');
    setNomeEditado(c.titulo);
    setEditandoTexto(false);
  };

  const handleSalvarEdicao = async () => {
    if (!visualizando) return;
    setSalvando(true);
    await supabase.from('contratos').update({
      texto_gerado: textoEditado,
      titulo: nomeEditado.trim() || visualizando.titulo,
      updated_at: new Date().toISOString(),
    }).eq('id', visualizando.id);
    setContratos(prev => prev.map(c =>
      c.id === visualizando.id
        ? { ...c, texto_gerado: textoEditado, titulo: nomeEditado.trim() || c.titulo }
        : c
    ));
    setVisualizando(prev => prev ? { ...prev, texto_gerado: textoEditado, titulo: nomeEditado.trim() || prev.titulo } : null);
    setEditandoTexto(false);
    setSalvando(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este contrato?')) return;
    await supabase.from('contratos').delete().eq('id', id);
    setContratos(prev => prev.filter(c => c.id !== id));
  };

  const handleImprimir = () => {
    const janela = window.open('', '_blank');
    if (!janela) return;
    const origin = window.location.origin;
    const logoUrl = `${origin}/logo-diogenes.png`;
    const rodapeFinal = visualizando?.tipo === 'autorizacao_venda' ? buildRodapeVenda(origin) : '';
    const enderecoImovel = (visualizando?.dados?.['imovel_endereco'] as string) || 'ENDEREÇO DO IMÓVEL TRANSACIONADO';
    const isCompraVenda = visualizando?.tipo === 'compra_venda_avista' || visualizando?.tipo === 'compra_venda_financiamento';
    const rodapePagina = visualizando?.tipo === 'cessao_direitos' ? buildRodapeCessao(enderecoImovel)
                       : visualizando?.tipo === 'administracao'   ? buildRodapeAdministracao()
                       : isCompraVenda                            ? buildRodapeCompraVenda()
                       : '';
    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${nomeEditado} — Diógenes Imobiliária</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;
                 margin: 3cm 2.5cm 3.5cm; color: #000; }
          .logo-header { margin-bottom: 1.2cm; padding-bottom: 0.6cm;
                         border-bottom: 1px solid #ccc; }
          .logo-header img { height: 56px; display: block; }
          pre { font-family: inherit; white-space: pre-wrap; text-align: justify; }
          .rodape-pagina { position: fixed; bottom: 0; left: 0; right: 0;
                           text-align: center; font-family: Arial, Helvetica, sans-serif;
                           font-size: 8.5pt; color: #444; border-top: 1px solid #bbb;
                           padding: 0.25cm 2.5cm; background: #fff; }
          @media print { body { margin: 2cm 2cm 3.5cm; } }
        </style>
      </head>
      <body>
        <div class="logo-header">
          <img src="${logoUrl}" alt="Diógenes Imobiliária" />
        </div>
        <pre>${textoEditado}</pre>
        ${rodapeFinal}
        ${rodapePagina}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    janela.document.close();
  };

  if (visualizando) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setVisualizando(null)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
            <ChevronLeft size={16} /> Voltar à lista
          </button>
          <div className="flex items-center gap-2">
            {editandoTexto && (
              <button
                onClick={handleSalvarEdicao}
                disabled={salvando}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#1A55FF] text-white hover:bg-blue-700 transition-colors"
              >
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Salvar alterações
              </button>
            )}
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <Printer size={15} /> Imprimir
            </button>
          </div>
        </div>

        {/* Nome editável */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Nome do contrato</label>
          <input
            type="text"
            value={nomeEditado}
            onChange={e => setNomeEditado(e.target.value)}
            onBlur={async () => {
              if (nomeEditado.trim() && nomeEditado !== visualizando.titulo) {
                await supabase.from('contratos').update({ titulo: nomeEditado.trim() }).eq('id', visualizando.id);
                setContratos(prev => prev.map(c => c.id === visualizando.id ? { ...c, titulo: nomeEditado.trim() } : c));
              }
            }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A55FF]/30 focus:border-[#1A55FF] bg-white"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-medium text-slate-500">Texto do contrato</span>
            <button
              onClick={() => setEditandoTexto(e => !e)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                editandoTexto
                  ? 'bg-[#1A55FF] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pencil size={12} />
              {editandoTexto ? 'Concluir edição' : 'Editar texto'}
            </button>
          </div>
          {editandoTexto ? (
            <textarea
              value={textoEditado}
              onChange={e => setTextoEditado(e.target.value)}
              className="w-full p-6 text-sm font-serif leading-relaxed text-slate-800 resize-none focus:outline-none"
              style={{ minHeight: '600px', textAlign: 'justify' }}
            />
          ) : (
            <div className="p-8 text-sm leading-relaxed whitespace-pre-wrap font-serif text-slate-800" style={{ textAlign: 'justify' }}>
              {textoEditado}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Contratos</h2>
          <p className="text-sm text-slate-500">{contratos.length} contrato(s) gerado(s)</p>
        </div>
        <button
          onClick={onNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A55FF] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : contratos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum contrato gerado ainda.</p>
          <button onClick={onNovo} className="mt-3 text-[#1A55FF] text-sm hover:underline">
            Criar primeiro contrato
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contratos.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText size={17} className="text-[#1A55FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">{c.titulo}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} />
                  {format(parseISO(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    c.status === 'finalizado'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {c.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => abrirContrato(c)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Visualizar"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

export default function ContratosView() {
  const [tela, setTela] = useState<'lista' | 'seletor' | 'formulario'>('lista');
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoContratoInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTipoSelecionado = (tipo: TipoContratoInfo) => {
    setTipoSelecionado(tipo);
    setTela('formulario');
  };

  const handleSaved = () => {
    setRefreshKey(k => k + 1);
    setTela('lista');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <AnimatePresence mode="wait">
        {tela === 'lista' && (
          <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ListaContratos onNovo={() => setTela('seletor')} refresh={refreshKey} />
          </motion.div>
        )}
        {tela === 'seletor' && (
          <motion.div key="seletor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setTela('lista')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-6">
              <ChevronLeft size={16} /> Voltar
            </button>
            <SeletorTipo onSelect={handleTipoSelecionado} />
          </motion.div>
        )}
        {tela === 'formulario' && tipoSelecionado && (
          <motion.div key="formulario" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <FormularioContrato
              tipo={tipoSelecionado}
              onBack={() => setTela('seletor')}
              onSaved={handleSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
