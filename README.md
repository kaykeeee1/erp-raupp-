# 🏢 ERP Raupp - Sistema de Gestão de Outsourcing de Impressão

O **ERP Raupp** é uma plataforma integrada desenvolvida especificamente para otimizar a operação técnica, logística de insumos e o controle financeiro de empresas de **Outsourcing de Impressão**. O sistema unifica o controle físico de equipamentos no cliente, a manutenção técnica, o controle de estoque por bipagem de código de barras, e automatiza o faturamento fiscal e fluxo financeiro em tempo real.

---

## 🚀 Guia Rápido de Instalação e Execução

### Requisitos Prévios
* **Node.js** (versão 18 ou superior recomendada)
* **npm** ou **yarn**
* Conta/Projeto ativo no **Supabase**

### 1. Instalar as Dependências
No diretório raiz do projeto, instale os pacotes necessários:
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com suas chaves de API do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

### 3. Migrações de Banco de Dados (Supabase)
Para que o sistema funcione corretamente, execute os scripts SQL locais no **SQL Editor** do painel do Supabase na seguinte ordem:
1. **[supabase_estoque_setup.sql](file:///home/kayke/Projetos/erp-raupp-/supabase_estoque_setup.sql)**: Inicializa a tabela de estoque, regras de bipagem de código de barras e triggers.
2. **[supabase_fiscal_setup.sql](file:///home/kayke/Projetos/erp-raupp-/supabase_fiscal_setup.sql)**: Cria a tabela financeira, campos na tabela de notas fiscais, funções fiscais tributárias (IVA Dual 2026) e os triggers de faturamento integrados.
3. **[add_new_stock_categories.sql](file:///home/kayke/Projetos/erp-raupp-/add_new_stock_categories.sql)**: Atualiza as restrições categóricas do estoque, ativando suporte a *Unidade de Fusor* e *Unidade de Imagem*.

### 4. Executar em Desenvolvimento
Para rodar a aplicação localmente:
```bash
npm run dev
```
Acesse `http://localhost:5173` no seu navegador.

### 5. Compilar para Produção
Para gerar a versão otimizada para deploy:
```bash
npm run build
```

---

## 🛠️ Stack Tecnológica
* **Frontend**: React 19 (com Vite 8 para compilação super-rápida).
* **Linguagem**: TypeScript (com tipagem estrita para segurança de compilação).
* **Estilização**: Tailwind CSS v4 + PostCSS (configuração css-first focada em variáveis de tema).
* **Ícones**: Lucide React (gráficos vetoriais limpos e acessíveis).
* **Gráficos**: Recharts (painéis analíticos e relatórios dinâmicos).
* **Banco de Dados**: Supabase / PostgreSQL (com RLS, triggers procedimentais e funções integradas).

---

## 📦 Estrutura de Pastas e Componentes
A estrutura do código segue um padrão de arquitetura modular, simples e escalável:
```plaintext
erp-raupp/
├── supabase_*.sql             # Scripts de migração do banco de dados PostgreSQL
├── src/
│   ├── assets/                # Imagens, logotipos oficiais e mídias estáticas
│   ├── components/            # Componentes reutilizáveis (Ex: XmlUploadModal)
│   ├── lib/                   # Configuração e cliente Supabase (supabase.ts)
│   ├── pages/                 # Páginas e módulos do ERP
│   │   ├── Dashboard.tsx      # Hub central de relatórios e sidebar de navegação
│   │   ├── ClientList.tsx     # Painel de Clientes e Contratos
│   │   ├── EquipmentList.tsx  # Controle de Impressoras e Parque Alocado
│   │   ├── TicketList.tsx     # Fila de Suporte Técnico (Chamados / OS de Campo)
│   │   ├── MaintenanceList.tsx# Controle de Laboratório Técnico (OS de Oficina)
│   │   ├── ExchangeList.tsx   # Histórico de Trocas de Suprimentos
│   │   ├── StockManagement.tsx# Estoque físico com suporte a leitor USB EAN
│   │   ├── InvoiceList.tsx    # Controle Fiscal, Extratos de Contratos e Fechamentos
│   │   └── FinanceList.tsx    # Painel Financeiro e Fluxo de Caixa
│   ├── services/              # Serviços de Integração (fiscalService.ts, estoqueService.ts)
│   ├── index.css              # Padrões globais de tipografia e paleta da marca
│   └── main.tsx               # Ponto de entrada do React
```

---

## ⚙️ Funcionamento das Integrações Críticas

### 1. Faturamento Fiscal (Saídas)
Ao realizar o fechamento mensal de um contrato de cliente em **Painel Fiscal**:
1. O usuário insere as leituras atual e anterior das impressoras.
2. O sistema calcula a franquia contratada e as páginas excedentes (valores de clique).
3. Ao emitir, cria-se uma linha na tabela `tb_notas_fiscais`.
4. Uma trigger no Supabase (`trg_auto_financeiro_from_nota`) intercepta o registro e gera automaticamente uma **Receita** com status `Pendente` na aba **Financeiro** com vencimento para 30 dias.
5. O sistema disponibiliza o download/visualização do **Extrato PDF** auditável para envio ao cliente.

### 2. Entrada de Compras via XML (Entradas)
Ao receber novos suprimentos do fornecedor:
1. O usuário acessa o **Painel Fiscal** e clica em **Importar XML (Compra)**.
2. O leitor client-side faz o parsing do arquivo XML da NF-e, extraindo fornecedor, chave de acesso de 44 dígitos, itens e valores unitários.
3. Ao confirmar a importação:
   * A nota de entrada é cadastrada no histórico fiscal.
   * O sistema busca os produtos do XML na tabela de estoque (`tb_estoque`) por código de barras (EAN) ou nome. Se existirem, incrementa o saldo atual; se forem novos, cadastra-os de forma automática.
   * Uma **Despesa** (contas a pagar) é gerada automaticamente no **Financeiro** com status `Pendente` a partir da trigger do banco.

### 3. Ajuste Rápido de Estoque (Bipagem USB)
Para agilizar a liberação e contagem física na expedição de toners e cilindros:
1. O técnico posiciona o cursor no campo **"Bipar EAN"** na tela de **Estoque**.
2. Ao bipar o código de barras físico do item com um leitor óptico USB, o sistema identifica instantaneamente o item associado ao código de barras e adiciona **+1 unidade** ao estoque de forma assíncrona, exibindo uma mensagem de sucesso na tela sem a necessidade de cliques adicionais.

---

## 🎨 Diretrizes Visuais e Acessibilidade (UX/UI)
* **Purple Ban (Proibição do Roxo)**: O sistema não utiliza tons violetas, roxos ou magentas em nenhuma das páginas. As cores principais são o **Azul Oficial Raupp** (`#2b539c` como cor primária) e o **Laranja Acento** (`#ea580c`), garantindo uma identidade exclusiva e sóbria.
* **Tipografia**: Utiliza as fontes modernas **Outfit** (para títulos e headers dinâmicos) e **Inter** (para dados textuais e legibilidade), integradas diretamente através da CDN da Google Fonts.
* **Alinhamento Numérico**: Tabelas financeiras e de contagem utilizam a estilização `tabular-nums` para que números fiquem alinhados verticalmente coluna a coluna, otimizando o escaneamento ocular.
* **Acessibilidade**: Todos os inputs ocultos e botões baseados apenas em ícones vetoriais contam com atributos de acessibilidade explícitos como `aria-label` e `aria-hidden` para leitores de tela.
