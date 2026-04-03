export type TipoContrato =
  | 'autorizacao_venda'
  | 'cessao_direitos'
  | 'administracao'
  | 'compra_venda_avista'
  | 'compra_venda_financiamento'
  | 'personalizado';

export interface TipoContratoInfo {
  id: TipoContrato;
  titulo: string;
  descricao: string;
  campos: CampoFormulario[];
  systemPrompt: string;
}

export type TipoCampo =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'currency'
  | 'cpf'
  | 'phone';

export interface CampoFormulario {
  id: string;
  label: string;
  tipo: TipoCampo;
  placeholder?: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  grupo?: string;
}

// ─── AUTORIZAÇÃO DE VENDA ─────────────────────────────────────────────────────
const autorizacaoVendaCampos: CampoFormulario[] = [
  // Contratante 1
  { id: 'contratante1_nome', label: 'Nome do Contratante 1', tipo: 'text', obrigatorio: true, grupo: 'Contratante 1' },
  { id: 'contratante1_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Contratante 1' },
  { id: 'contratante1_telefone', label: 'Telefone', tipo: 'phone', obrigatorio: true, grupo: 'Contratante 1' },
  { id: 'contratante1_email', label: 'E-mail', tipo: 'text', grupo: 'Contratante 1' },
  // Contratante 2 (cônjuge/sócio - opcional)
  { id: 'contratante2_nome', label: 'Nome do Contratante 2 (opcional)', tipo: 'text', grupo: 'Contratante 2 (Cônjuge)' },
  { id: 'contratante2_cpf', label: 'CPF', tipo: 'cpf', grupo: 'Contratante 2 (Cônjuge)' },
  { id: 'contratante2_telefone', label: 'Telefone', tipo: 'phone', grupo: 'Contratante 2 (Cônjuge)' },
  { id: 'contratante2_email', label: 'E-mail', tipo: 'text', grupo: 'Contratante 2 (Cônjuge)' },
  // Dados do imóvel
  { id: 'imovel_endereco', label: 'Endereço Completo do Imóvel', tipo: 'text', obrigatorio: true, grupo: 'Dados do Imóvel' },
  { id: 'imovel_tipo', label: 'Tipo do Imóvel', tipo: 'select', obrigatorio: true, opcoes: ['Casa', 'Apartamento', 'Sala', 'Loja', 'Sobreloja', 'Galpão', 'Terreno', 'Prédio', 'Rural'], grupo: 'Dados do Imóvel' },
  { id: 'imovel_iptu', label: 'Inscrição IPTU', tipo: 'text', grupo: 'Dados do Imóvel' },
  { id: 'imovel_matricula', label: 'Matrícula', tipo: 'text', grupo: 'Dados do Imóvel' },
  { id: 'imovel_valor_venda', label: 'Valor de Venda (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Dados do Imóvel' },
  { id: 'imovel_area_util', label: 'Área Útil (m²)', tipo: 'number', grupo: 'Dados do Imóvel' },
  // Contrato
  { id: 'prazo_meses', label: 'Prazo de Exclusividade (meses)', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 6', grupo: 'Condições' },
  { id: 'honorarios_perc', label: 'Honorários (%)', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 6', grupo: 'Condições' },
  { id: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, grupo: 'Condições' },
  { id: 'observacoes', label: 'Observações do Imóvel', tipo: 'textarea', grupo: 'Condições' },
];

// ─── CESSÃO DE DIREITOS ────────────────────────────────────────────────────────
const cessaoDireitosCampos: CampoFormulario[] = [
  // Cedentes
  { id: 'cedente1_nome', label: 'Nome do Cedente 1', tipo: 'text', obrigatorio: true, grupo: 'Cedentes' },
  { id: 'cedente1_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Cedentes' },
  { id: 'cedente1_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Cedentes' },
  { id: 'cedente1_profissao', label: 'Profissão', tipo: 'text', grupo: 'Cedentes' },
  { id: 'cedente1_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Cedentes' },
  { id: 'cedente2_nome', label: 'Nome do Cônjuge Cedente (opcional)', tipo: 'text', grupo: 'Cedentes' },
  { id: 'cedente2_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Cedentes' },
  { id: 'cedente2_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Cedentes' },
  { id: 'cedente2_profissao', label: 'Profissão', tipo: 'text', grupo: 'Cedentes' },
  { id: 'cedente2_cpf', label: 'CPF', tipo: 'cpf', grupo: 'Cedentes' },
  // Cessionários
  { id: 'cessionario1_nome', label: 'Nome do Cessionário 1', tipo: 'text', obrigatorio: true, grupo: 'Cessionários' },
  { id: 'cessionario1_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Cessionários' },
  { id: 'cessionario1_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Cessionários' },
  { id: 'cessionario1_profissao', label: 'Profissão', tipo: 'text', grupo: 'Cessionários' },
  { id: 'cessionario1_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Cessionários' },
  { id: 'cessionario2_nome', label: 'Nome do Cônjuge Cessionário (opcional)', tipo: 'text', grupo: 'Cessionários' },
  { id: 'cessionario2_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Cessionários' },
  { id: 'cessionario2_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Cessionários' },
  { id: 'cessionario2_profissao', label: 'Profissão', tipo: 'text', grupo: 'Cessionários' },
  { id: 'cessionario2_cpf', label: 'CPF', tipo: 'cpf', grupo: 'Cessionários' },
  // Imóvel
  { id: 'imovel_endereco', label: 'Endereço Completo do Imóvel', tipo: 'text', obrigatorio: true, grupo: 'Dados do Imóvel' },
  { id: 'imovel_matricula', label: 'Matrícula do Imóvel', tipo: 'text', grupo: 'Dados do Imóvel' },
  // Valores e Pagamento
  { id: 'valor_total', label: 'Valor Total (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'parcela1_valor', label: 'Valor do Sinal (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'parcela1_descricao', label: 'Forma de Pagamento do Sinal', tipo: 'textarea', placeholder: 'Ex: recursos próprios, transferência bancária, PIX...', grupo: 'Pagamento' },
  { id: 'parcela1_banco', label: 'Banco / Conta / PIX para recebimento', tipo: 'text', grupo: 'Pagamento' },
  { id: 'parcela2_valor', label: 'Valor da 2ª Parcela (R$)', tipo: 'currency', grupo: 'Pagamento' },
  { id: 'parcela2_descricao', label: 'Forma de Pagamento da 2ª Parcela', tipo: 'textarea', grupo: 'Pagamento' },
  { id: 'parcela3_valor', label: 'Valor da 3ª Parcela/Permuta (R$)', tipo: 'currency', grupo: 'Pagamento' },
  { id: 'parcela3_descricao', label: 'Descrição da 3ª Parcela/Permuta', tipo: 'textarea', grupo: 'Pagamento' },
  { id: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, grupo: 'Pagamento' },
];

// ─── CONTRATO DE ADMINISTRAÇÃO ────────────────────────────────────────────────
const administracaoCampos: CampoFormulario[] = [
  // Locador
  { id: 'locador_nome', label: 'Nome do Locador', tipo: 'text', obrigatorio: true, grupo: 'Dados do Locador' },
  { id: 'locador_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Dados do Locador' },
  { id: 'locador_nascimento', label: 'Data de Nascimento', tipo: 'date', grupo: 'Dados do Locador' },
  { id: 'locador_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Dados do Locador' },
  { id: 'locador_profissao', label: 'Profissão', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_endereco', label: 'Endereço Residencial', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_telefone', label: 'Telefone', tipo: 'phone', obrigatorio: true, grupo: 'Dados do Locador' },
  { id: 'locador_email', label: 'E-mail', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_banco', label: 'Banco', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_agencia', label: 'Agência', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_conta', label: 'Conta Corrente', tipo: 'text', grupo: 'Dados do Locador' },
  { id: 'locador_pix', label: 'Chave PIX', tipo: 'text', grupo: 'Dados do Locador' },
  // Imóvel
  { id: 'imovel_endereco', label: 'Endereço do Imóvel', tipo: 'text', obrigatorio: true, grupo: 'Dados do Imóvel' },
  { id: 'imovel_tipo', label: 'Tipo do Imóvel', tipo: 'select', opcoes: ['Apartamento', 'Casa', 'Sala', 'Loja', 'Sobreloja', 'Galpão'], grupo: 'Dados do Imóvel' },
  { id: 'numero_contrato', label: 'Número do Contrato', tipo: 'text', grupo: 'Dados do Imóvel' },
  // Condições
  { id: 'taxa_administracao', label: 'Taxa de Administração (%)', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 10', grupo: 'Condições' },
  { id: 'agenciamento', label: 'Agenciamento (%)', tipo: 'number', placeholder: 'Ex: 20', grupo: 'Condições' },
  { id: 'aluguel_garantido', label: 'Aluguel Garantido?', tipo: 'select', opcoes: ['Não', 'Sim'], grupo: 'Condições' },
  { id: 'data_contrato', label: 'Data de Início', tipo: 'date', obrigatorio: true, grupo: 'Condições' },
];

// ─── COMPRA E VENDA À VISTA ───────────────────────────────────────────────────
const compraVendaAVistaCampos: CampoFormulario[] = [
  // Vendedores
  { id: 'vendedor1_nome', label: 'Nome do Vendedor 1', tipo: 'text', obrigatorio: true, grupo: 'Vendedores' },
  { id: 'vendedor1_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Vendedores' },
  { id: 'vendedor1_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Vendedores' },
  { id: 'vendedor1_profissao', label: 'Profissão', tipo: 'text', grupo: 'Vendedores' },
  { id: 'vendedor1_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Vendedores' },
  { id: 'vendedor2_nome', label: 'Nome do Cônjuge Vendedor (opcional)', tipo: 'text', grupo: 'Vendedores' },
  { id: 'vendedor2_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Vendedores' },
  { id: 'vendedor2_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Vendedores' },
  { id: 'vendedor2_profissao', label: 'Profissão', tipo: 'text', grupo: 'Vendedores' },
  { id: 'vendedor2_cpf', label: 'CPF', tipo: 'cpf', grupo: 'Vendedores' },
  // Compradores
  { id: 'comprador1_nome', label: 'Nome do Comprador 1', tipo: 'text', obrigatorio: true, grupo: 'Compradores' },
  { id: 'comprador1_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Compradores' },
  { id: 'comprador1_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Compradores' },
  { id: 'comprador1_profissao', label: 'Profissão', tipo: 'text', grupo: 'Compradores' },
  { id: 'comprador1_cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true, grupo: 'Compradores' },
  { id: 'comprador2_nome', label: 'Nome do Cônjuge Comprador (opcional)', tipo: 'text', grupo: 'Compradores' },
  { id: 'comprador2_nacionalidade', label: 'Nacionalidade', tipo: 'text', placeholder: 'brasileiro(a)', grupo: 'Compradores' },
  { id: 'comprador2_estado_civil', label: 'Estado Civil', tipo: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viúvo', 'união estável'], grupo: 'Compradores' },
  { id: 'comprador2_profissao', label: 'Profissão', tipo: 'text', grupo: 'Compradores' },
  { id: 'comprador2_cpf', label: 'CPF', tipo: 'cpf', grupo: 'Compradores' },
  // Imóvel
  { id: 'imovel_endereco', label: 'Endereço Completo do Imóvel', tipo: 'text', obrigatorio: true, grupo: 'Dados do Imóvel' },
  { id: 'imovel_matricula', label: 'Matrícula', tipo: 'text', grupo: 'Dados do Imóvel' },
  { id: 'imovel_area', label: 'Área (m²)', tipo: 'number', grupo: 'Dados do Imóvel' },
  { id: 'imovel_inscricao', label: 'Inscrição Fisco', tipo: 'text', grupo: 'Dados do Imóvel' },
  // Pagamento
  { id: 'valor_total', label: 'Valor Total da Venda (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'vendedor_banco', label: 'Banco do Vendedor', tipo: 'text', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'vendedor_agencia', label: 'Agência', tipo: 'text', grupo: 'Pagamento' },
  { id: 'vendedor_conta', label: 'Conta Corrente', tipo: 'text', grupo: 'Pagamento' },
  { id: 'vendedor_pix', label: 'PIX do Vendedor', tipo: 'text', grupo: 'Pagamento' },
  { id: 'honorarios_perc', label: 'Honorários da Imobiliária (%)', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 6', grupo: 'Pagamento' },
  { id: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, grupo: 'Pagamento' },
];

// ─── COMPRA E VENDA FINANCIAMENTO ─────────────────────────────────────────────
const compraVendaFinanciamentoCampos: CampoFormulario[] = [
  ...compraVendaAVistaCampos.filter(c => c.grupo !== 'Pagamento'),
  { id: 'valor_total', label: 'Valor Total da Venda (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'valor_sinal', label: 'Valor do Sinal (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'valor_financiamento', label: 'Valor do Financiamento (R$)', tipo: 'currency', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'instituicao_financeira', label: 'Instituição Financeira', tipo: 'text', grupo: 'Pagamento' },
  { id: 'vendedor_banco', label: 'Banco do Vendedor', tipo: 'text', obrigatorio: true, grupo: 'Pagamento' },
  { id: 'vendedor_agencia', label: 'Agência', tipo: 'text', grupo: 'Pagamento' },
  { id: 'vendedor_conta', label: 'Conta Corrente', tipo: 'text', grupo: 'Pagamento' },
  { id: 'vendedor_pix', label: 'PIX do Vendedor', tipo: 'text', grupo: 'Pagamento' },
  { id: 'honorarios_perc', label: 'Honorários da Imobiliária (%)', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 6', grupo: 'Pagamento' },
  { id: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, grupo: 'Pagamento' },
];

// ─── CONTRATO PERSONALIZADO ───────────────────────────────────────────────────
const personalizadoCampos: CampoFormulario[] = [
  {
    id: 'descricao',
    label: 'Descrição do contrato',
    tipo: 'textarea',
    obrigatorio: true,
    placeholder: 'Descreva o que precisa ser contratado: partes envolvidas, objeto, valores, condições, prazos e qualquer detalhe relevante...',
    grupo: 'Contrato Personalizado',
  },
];

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const IDENTIDADE = `Você é um assistente jurídico especializado em contratos imobiliários para a Diógenes Imobiliária LTDA ME, localizada em Sobradinho, Distrito Federal. CNPJ: 01.724.706.0001/69. CRECI Jurídico 20.806. Representante: Diógenes Silveira de Oliveira.

REGRAS:
- Gere APENAS o texto do contrato, sem comentários, explicações ou marcações markdown.
- Use linguagem jurídica formal e precisa, adequada ao DF.
- Preencha TODOS os campos com os dados fornecidos.
- Onde o dado não foi fornecido, use "___________" como espaço em branco.
- Escreva valores monetários por extenso entre parênteses após o numeral: R$ 100.000,00 (cem mil reais).
- Use o foro de Sobradinho-DF.
- Formate em parágrafos com cláusulas numeradas (CLÁUSULA PRIMEIRA, SEGUNDA, etc.).`;

const systemPromptAutorizacaoVenda = `${IDENTIDADE}

TEMPLATE BASE — AUTORIZAÇÃO DE VENDA COM EXCLUSIVIDADE:
Este documento deve seguir rigorosamente a estrutura abaixo, preenchendo com os dados fornecidos:

1. Cabeçalho: "AUTORIZAÇÃO DE VENDA DE IMÓVEL"
2. DADOS DO CONTRATANTE: nome, CPF, telefone, email (para cada contratante informado)
3. DADOS DO IMÓVEL: endereço, inscrição IPTU, matrícula, valor de venda
4. CLÁUSULAS (use exatamente as cláusulas do modelo original da Diógenes Imóveis):
   - Cláusula 1: amparo legal (Art.20 Inc.III Lei 6.530/1978 e Art.1 Resolução 458/1995), exclusividade para cliente específico
   - Cláusula 2: prazo de validade em meses, renovação automática se não cancelado por escrito
   - Cláusula 3: honorários de __% pela venda/permuta, descontados no sinal, conforme tabela CRECI-DF
   - Cláusula 4: subsistência dos honorários por 6 meses após vencimento se cliente apresentado durante vigência
   - Cláusula 5: compromisso da Diógenes de comercializar o imóvel com anúncios em jornais, internet e cadastro
   - Cláusula 6: responsabilidade do contratante pelas informações e documentação
   - Cláusula 7: autorização para obter informações em CEB, CAESB, telefonia, IPTU, SRF, cartórios; acompanhamento até entrega da escritura registrada
   - Cláusula 8: foro de Sobradinho-DF
5. Observações do imóvel (se informadas)
6. Local e data
7. Linhas de assinatura: Contratante(s) e "DIÓGENES IMOBILIÁRIA / CRECI JURÍDICO 20.806"`;

const systemPromptCessaoDireitos = `${IDENTIDADE}

TEMPLATE BASE — CESSÃO DE DIREITOS:
Gere um Instrumento Particular de Cessão de Direitos seguindo esta estrutura:

1. Preâmbulo: data, cidade (Sobradinho, Distrito Federal), partes (CEDENTES e CESSIONÁRIOS com qualificação completa)
2. CLÁUSULA PRIMEIRA: identificação do imóvel objeto da cessão
3. CLÁUSULA SEGUNDA: valor total e forma de pagamento (detalhando cada parcela com forma, banco, conta, PIX; cada parcela seguida de quitação irrevogável pelos cedentes)
   - §Primeiro: honorários de intermediação pagos no mesmo dia do sinal
   - §Segundo: declaração do cessionário de ciência do imóvel usado, sem reclamações futuras
4. CLÁUSULA TERCEIRA: entrega do imóvel livre de ônus, encargos (Neoenergia, CAESB) quitados até a entrega
5. CLÁUSULA QUARTA: documentação a apresentar para escritura (certidões trabalhistas TRT10/TST, RG, CPF, estado civil, certidão negativa tributos, nada consta Neoenergia/CAESB)
6. CLÁUSULA QUINTA: obrigação dos cedentes de assinar escritura pública em 90 dias; multa 2% + juros 1% ao mês por inadimplemento
7. CLÁUSULA SEXTA: transferência de titularidade de IPTU, energia, água na posse
8. Foro de Sobradinho-DF
9. Assinaturas: CEDENTES, CESSIONÁRIOS, testemunhas, DIÓGENES IMOBILIÁRIA`;

const systemPromptAdministracao = `${IDENTIDADE}

TEMPLATE BASE — CONTRATO DE ADMINISTRAÇÃO:
Gere um Contrato de Prestação de Serviços de Administração Imobiliária seguindo esta estrutura:

1. Cabeçalho com dados da Diógenes Imobiliária e número do contrato
2. DADOS DO CONTRATANTE (LOCADOR): todos os dados pessoais, endereços, contatos, dados bancários
3. DADOS DO IMÓVEL: endereço, tipo, taxa de administração, agenciamento, aluguel garantido
4. CLÁUSULAS CONTRATUAIS:
   - Cláusula Primeira: objeto do contrato (locação do imóvel)
   - Cláusula Segunda: vigência por prazo indeterminado
   - Cláusula Terceira: rescisão pelo contratante com §1º (antes do 1º contrato - 1 aluguel de compensação), §2º (imóvel alugado - 30% do valor anual), §3º (após desocupação - sem ônus), §4º (descumprimento pela contratada - multa 1 aluguel)
   - Cláusula Quarta: autorização para locar pelo prazo combinado
   - Cláusula Quinta: taxa de administração de __% sobre o aluguel
   - Cláusula Sexta: agenciamento de __% sobre primeiro aluguel para captação de novo inquilino
   - Cláusula Sétima: responsabilidades da imobiliária (cobranças, repasses, vistorias, documentação)
   - Cláusula Oitava: obrigações do locador (manutenção estrutural, impostos, taxas)
   - Cláusula Nona: prestação de contas mensal até o 10º dia útil
   - Cláusula Décima: foro de Sobradinho-DF
5. Assinaturas: Contratante (Locador) e Contratado (Diógenes Imobiliária)`;

const systemPromptCompraVendaAVista = `${IDENTIDADE}

TEMPLATE BASE — CONTRATO DE COMPRA E VENDA À VISTA:
Gere um Instrumento Particular de Promessa de Compra e Venda seguindo esta estrutura:

1. Preâmbulo: data, cidade (Brasília, Distrito Federal), qualificação completa dos PROMITENTES VENDEDORES e PROMITENTES COMPRADORES
2. CLÁUSULA PRIMEIRA: identificação do imóvel (endereço, matrícula, área declarada ao Fisco, inscrição)
3. CLÁUSULA SEGUNDA: valor total da negociação, pagamento integral à vista após assinatura via transferência/PIX para conta informada; autorização expressa para desconto dos honorários de __% no valor total, de modo que os vendedores recebam o valor líquido e a imobiliária receba os honorários diretamente
   - §Primeiro: despesas de regularização anteriores à negociação por conta dos vendedores
   - §Segundo: ITBI, escritura e registro por conta dos compradores
   - §Terceiro: compradores declaram ciência do imóvel usado, aceitando-o no estado
   - §Quarto: chaves transferidas imediatamente após confirmação do pagamento integral
   - §Quinto: escritura pública em até 90 dias; multa 2% + juros 1% ao mês por inadimplemento
   - §Sexto: inadimplemento do comprador - multa de 2% sobre o valor
4. CLÁUSULA TERCEIRA: entrega livre de ônus, encargos (Neoenergia, CAESB) quitados
5. CLÁUSULA QUARTA: documentação para escritura (certidões trabalhistas TRT10/TST, RG, CPF, estado civil, certidão negativa tributos imobiliários, nada consta Neoenergia/CAESB)
6. CLÁUSULA QUINTA: assistência dos vendedores para transferência ao comprador
7. CLÁUSULA SEXTA: transferência de IPTU, energia, água na posse
8. Foro de Brasília-DF (para compra e venda)
9. Assinaturas: PROMITENTES VENDEDORES, PROMITENTES COMPRADORES, testemunhas, DIÓGENES IMOBILIÁRIA`;

const systemPromptPersonalizado = `${IDENTIDADE}

A partir da descrição fornecida pelo usuário, redija um contrato imobiliário completo e juridicamente adequado ao Distrito Federal.

INSTRUÇÕES:
- Identifique as partes e as qualifique adequadamente (use "___________" para dados não fornecidos).
- Crie as cláusulas necessárias para cobrir todos os aspectos descritos pelo usuário.
- Use linguagem jurídica formal, com cláusulas numeradas (CLÁUSULA PRIMEIRA, CLÁUSULA SEGUNDA, etc.).
- Adapte o foro conforme o contexto descrito (padrão: Sobradinho-DF).
- Inclua espaços para assinaturas e testemunhas ao final.
- Gere APENAS o texto do contrato, sem comentários, explicações ou markdown.`;

const systemPromptCompraVendaFinanciamento = `${IDENTIDADE}

TEMPLATE BASE — CONTRATO DE COMPRA E VENDA COM FINANCIAMENTO:
Gere um Instrumento Particular de Promessa de Compra e Venda com Financiamento seguindo esta estrutura:

1. Preâmbulo: data, cidade (Sobradinho, Distrito Federal), qualificação completa dos PROMITENTES VENDEDORES e PROMITENTES COMPRADORES com regime de bens se casados
2. CLÁUSULA PRIMEIRA: identificação do imóvel (endereço, matrícula, área de habite-se, área declarada ao Fisco, inscrição)
3. CLÁUSULA SEGUNDA: valor total; duas parcelas:
   - Sinal: valor + forma (recursos próprios) + conta bancária/PIX dos vendedores + quitação irrevogável do sinal
   - Financiamento: valor + instituição financeira + transferência pela instituição para conta dos vendedores + quitação irrevogável
   - Chaves transferidas após recebimento do sinal
4. CLÁUSULA TERCEIRA: entrega livre de ônus, encargos quitados até entrega
5. CLÁUSULA QUARTA: documentação para escritura
6. CLÁUSULA QUINTA: assistência dos vendedores
7. CLÁUSULA SEXTA: transferência de IPTU, energia, água na posse
8. Foro de Sobradinho-DF
9. Assinaturas`;

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export const TIPOS_CONTRATO: TipoContratoInfo[] = [
  {
    id: 'autorizacao_venda',
    titulo: 'Autorização de Venda',
    descricao: 'Autorização de venda com exclusividade',
    campos: autorizacaoVendaCampos,
    systemPrompt: systemPromptAutorizacaoVenda,
  },
  {
    id: 'cessao_direitos',
    titulo: 'Cessão de Direitos',
    descricao: 'Instrumento particular de cessão de direitos sobre imóvel',
    campos: cessaoDireitosCampos,
    systemPrompt: systemPromptCessaoDireitos,
  },
  {
    id: 'administracao',
    titulo: 'Contrato de Administração',
    descricao: 'Prestação de serviços de administração imobiliária',
    campos: administracaoCampos,
    systemPrompt: systemPromptAdministracao,
  },
  {
    id: 'compra_venda_avista',
    titulo: 'Compra e Venda — À Vista',
    descricao: 'Promessa de compra e venda com pagamento à vista',
    campos: compraVendaAVistaCampos,
    systemPrompt: systemPromptCompraVendaAVista,
  },
  {
    id: 'compra_venda_financiamento',
    titulo: 'Compra e Venda — Financiamento',
    descricao: 'Promessa de compra e venda com financiamento bancário',
    campos: compraVendaFinanciamentoCampos,
    systemPrompt: systemPromptCompraVendaFinanciamento,
  },
  {
    id: 'personalizado',
    titulo: 'Contrato Personalizado',
    descricao: 'Descreva livremente e a IA redige o contrato adequado',
    campos: personalizadoCampos,
    systemPrompt: systemPromptPersonalizado,
  },
];
