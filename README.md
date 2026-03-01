# 🗝️ Diógenes Gestão - Sistema de Gestão de Chaves de Imóveis

Sistema completo para gerenciamento de chaves de imóveis desenvolvido para a Diógenes Imóveis. Permite controle total sobre retiradas, devoluções, status de imóveis e gestão de corretores.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [Uso](#uso)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuindo](#contribuindo)

## 🎯 Sobre o Projeto

O **Diógenes Gestão** é uma aplicação web moderna desenvolvida para facilitar o gerenciamento de chaves de imóveis. O sistema permite que corretores, gerentes e administradores controlem todo o ciclo de vida das chaves, desde a retirada até a devolução, com histórico completo de movimentações e calendário operacional.

## ✨ Funcionalidades

### 👥 Gestão de Usuários
- **Três níveis de acesso:**
  - **Corretor**: Pode visualizar imóveis e registrar retiradas/devoluções
  - **Gerente**: Acesso a calendário operacional e gestão de movimentações
  - **Administrador**: Acesso completo incluindo gestão de imóveis e corretores

### 🏠 Gestão de Imóveis
- Cadastro de imóveis com código DI único
- Controle de status (Ativo, Retirada, Negociação, Vendida, Inativa)
- Localização atual da chave (Matriz, Lago Norte, SCS)
- Link para anúncio do imóvel
- Busca por DI ou endereço
- Edição e remoção de imóveis (admin)

### 🔑 Gestão de Chaves
- **Registro de Retirada:**
  - Seleção de corretor responsável
  - Unidade de retirada
  - Data/hora de retirada
  - Previsão de devolução
  - Observações e propostas

- **Registro de Devolução:**
  - Unidade de devolução
  - Data/hora de devolução
  - Feedback e observações

### 📅 Calendário Operacional
- Visualização em múltiplas escalas:
  - **Dia**: Detalhamento completo das movimentações do dia
  - **Semana**: Visão semanal das retiradas e devoluções
  - **Mês**: Calendário mensal com eventos marcados
  - **Ano**: Visão anual com meses destacados
- Filtros por tipo de movimentação
- Navegação entre períodos

### 👨‍💼 Gestão de Corretores
- Cadastro de corretores com:
  - Nome
  - Email
  - Telefone
  - Função (Corretor, Gerente, Administrador)
- Edição e remoção de corretores
- Listagem completa no painel admin

### 📊 Histórico e Rastreabilidade
- Histórico completo de movimentações por imóvel
- Informações detalhadas de cada retirada/devolução
- Rastreamento de corretor responsável
- Timestamps de todas as operações

### 🔄 Atualizações em Tempo Real
- Sincronização automática via Supabase Realtime
- Atualizações instantâneas sem necessidade de recarregar a página

## 🛠️ Tecnologias

- **Frontend:**
  - React 19.0.0
  - TypeScript 5.8.2
  - Vite 6.2.0
  - Tailwind CSS 4.1.14
  - Motion (Framer Motion) 12.23.24
  - Lucide React (ícones)
  - date-fns 4.1.0

- **Backend:**
  - Supabase (PostgreSQL + Realtime)
  - Supabase JS Client 2.49.1

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- Conta no **Supabase** (para banco de dados)

## 🚀 Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/polimatas3/SitemaChaves-Diogenes.git
cd SitemaChaves-Diogenes
```

2. **Instale as dependências:**
```bash
npm install
```

## ⚙️ Configuração

1. **Crie um arquivo `.env.local` na raiz do projeto:**
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

2. **Configure o banco de dados no Supabase:**
   - Acesse o painel do Supabase
   - Execute as migrações na ordem:
     - `supabase/migrations/20260225_init.sql` (estrutura inicial)
     - `supabase/migrations/20260226_add_broker_contact.sql` (campos de contato)
     - `supabase/migrations/20260226_auth_setup.sql` (configuração de autenticação)
     - `supabase/migrations/20260228_nullable_key_location.sql` (localização de chave opcional)
     - `supabase/migrations/20260228_property_extensions.sql` (extensões de propriedades)

## 🗄️ Estrutura do Banco de Dados

### Tabela `users`
Armazena informações dos usuários do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | Chave primária |
| name | TEXT | Nome do usuário |
| role | TEXT | Função: 'broker', 'manager' ou 'admin' |
| email | TEXT | Email do corretor (opcional) |
| phone | TEXT | Telefone do corretor (opcional) |
| created_at | TIMESTAMPTZ | Data de criação |

### Tabela `properties`
Armazena informações dos imóveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | Chave primária |
| di | TEXT | Código DI único do imóvel |
| address | TEXT | Endereço do imóvel |
| description | TEXT | Descrição do imóvel |
| link | TEXT | Link do anúncio |
| status | TEXT | Status: 'Ativo', 'Retirada', 'Negociação', 'Vendida', 'Inativa' |
| current_key_location | TEXT | Localização atual: 'Matriz', 'Lago Norte', 'SCS' |
| responsible_broker_id | BIGINT | ID do corretor responsável (FK para users) |
| created_at | TIMESTAMPTZ | Data de criação |

### Tabela `movements`
Registra todas as movimentações de chaves.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | Chave primária |
| property_id | BIGINT | ID do imóvel (FK) |
| type | TEXT | Tipo: 'Retirada', 'Devolução', 'Status' |
| timestamp | TIMESTAMPTZ | Data/hora da movimentação |
| broker_id | BIGINT | ID do corretor (FK para users) |
| unit | TEXT | Unidade onde ocorreu a movimentação |
| observations | TEXT | Observações |
| proposal | TEXT | Proposta (para retiradas) |
| feedback | TEXT | Feedback (para devoluções) |
| return_forecast | TEXT | Previsão de devolução |
| withdrawal_datetime | TEXT | Data/hora de retirada |
| return_datetime | TEXT | Data/hora de devolução |

## 📖 Uso

### Iniciando o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Acessando o sistema:

1. **Login:**
   - O sistema utiliza autenticação via Supabase
   - Faça login com suas credenciais

2. **Navegação:**
   - **Imóveis**: Visualize e pesquise imóveis
   - **Operacional**: Acesse o calendário (gerentes e admins)
   - **Admin**: Painel administrativo (apenas admins)

3. **Registrando uma retirada:**
   - Clique em um imóvel na lista
   - Clique em "Registrar Retirada"
   - Preencha os dados do formulário
   - Selecione o corretor responsável
   - Confirme a retirada

4. **Gerenciando corretores (Admin):**
   - Acesse o painel Admin
   - Vá para "Gerenciamento de Corretores"
   - Clique em "Novo Corretor"
   - Preencha nome, email, telefone e função
   - Salve

## 📜 Scripts Disponíveis

```bash
# Inicia o servidor de desenvolvimento
npm run dev

# Cria build de produção
npm run build

# Visualiza o build de produção
npm run preview

# Remove a pasta dist
npm run clean

# Verifica erros de TypeScript
npm run lint
```

## 📁 Estrutura do Projeto

```
SitemaChaves-Diogenes/
├── src/
│   ├── App.tsx              # Componente principal da aplicação
│   ├── main.tsx             # Ponto de entrada
│   ├── index.css            # Estilos globais
│   ├── lib/
│   │   └── supabase.ts      # Configuração do cliente Supabase
│   ├── AuthGate.tsx         # Componente de autenticação
│   ├── LoginPage.tsx        # Página de login
│   ├── ResetPasswordPage.tsx # Página de recuperação de senha
│   └── PublicView.tsx       # Visualização pública (se aplicável)
├── supabase/
│   └── migrations/          # Migrações do banco de dados
│       ├── 20260225_init.sql
│       ├── 20260226_add_broker_contact.sql
│       ├── 20260226_auth_setup.sql
│       ├── 20260228_nullable_key_location.sql
│       └── 20260228_property_extensions.sql
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔐 Segurança

- As variáveis de ambiente não devem ser commitadas
- Use `.env.local` para configurações locais
- Mantenha as chaves do Supabase seguras
- O sistema utiliza autenticação via Supabase Auth

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e de propriedade da Diógenes Imóveis.

## 👨‍💻 Desenvolvido por

Sistema desenvolvido para Diógenes Imóveis.

---

**Versão:** 1.0.0  
**Última atualização:** 2025
