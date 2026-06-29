# Plano de Projeto: Controle de Estoque e Consumo (Suprimentos & Peças)

Este documento detalha o planejamento para a implementação do controle de estoque categorizado (Toners e Peças), controle de quantidade mínima, alertas de nível crítico e baixa automática ao registrar trocas ou manutenções.

---

## 📋 1. Visão Geral
Atualmente, o ERP registra o histórico de trocas de suprimentos em formato de texto livre, sem validar a disponibilidade física ou controlar o inventário de peças e toners. Este projeto adicionará um controle de inventário centralizado no banco de dados Supabase e integrará a baixa de insumos às ações de troca de suprimentos e ordens de manutenção.

---

## 🛠️ 2. Tipo de Projeto e Pilha Tecnológica
* **Tipo de Projeto**: WEB (React + TypeScript + Vite + Tailwind CSS v4)
* **Banco de Dados**: Supabase (PostgreSQL)

### Tecnologias Adicionadas/Utilizadas:
1. **Supabase (PostgreSQL)**: Criação da tabela `tb_estoque` para armazenar o inventário.
2. **React Context/State**: Gerenciamento de estado para exibição de alertas globais.
3. **Tailwind CSS v4**: Estilização dos indicadores de nível de estoque (badges de alerta).

---

## 🎯 3. Critérios de Sucesso
- [ ] Tabela `tb_estoque` criada no banco com colunas para categoria ('Toner' ou 'Peça'), quantidade atual e mínima.
- [ ] Nova aba/página de "Estoque" acessível através do painel do Dashboard.
- [ ] Baixa automática de 1 unidade no estoque de **Toners** ao salvar uma nova troca em `ExchangeList.tsx`.
- [ ] Baixa automática no estoque de **Peças** ao finalizar uma manutenção com peças em `MaintenanceList.tsx`.
- [ ] Alertas visuais exibidos no Dashboard e na tela de estoque para itens com quantidade abaixo do limite mínimo.
- [ ] Suíte de testes atualizada para validar a lógica de baixa e limites de estoque.

---

## 📁 4. Estrutura de Arquivos Planejada

```plaintext
src/
├── services/               # Nova camada para separar chamadas do banco (Otimização)
│   └── estoqueService.ts   # Consultas e mutações da tabela tb_estoque
├── pages/
│   ├── StockManagement.tsx # Nova tela de controle de inventário (CRUD + Filtros)
│   ├── ExchangeList.tsx    # Atualizada para selecionar Toners do estoque e dar baixa
│   ├── MaintenanceList.tsx # Atualizada para selecionar Peças do estoque e dar baixa
│   └── __tests__/
│       └── StockManagement.test.tsx # Testes de integração do fluxo de estoque
```

---

## 📝 5. Cronograma de Tarefas (Task Breakdown)

### Prioridade P0: Banco de Dados e Camada de Serviço
#### Tarefa 1: Modelagem e Criação da Tabela `tb_estoque`
* **Agente**: `database-architect`
* **Skills**: `database-design`, `clean-code`
* **Dependências**: Nenhuma
* **INPUT**: Acesso ao Supabase / Definição do Schema.
* **OUTPUT**: Tabela `tb_estoque` criada com as colunas: `id`, `item_nome`, `categoria` ('Toner' | 'Peça'), `quantidade_atual` (int), `quantidade_minima` (int), `modelo_compativel` (text), `criado_em`, `atualizado_em`.
* **VERIFY**: Verificar no painel de tabelas do Supabase se a tabela e os tipos foram criados corretamente.

#### Tarefa 2: Criação do Serviço de Estoque (`estoqueService.ts`)
* **Agente**: `backend-specialist`
* **Skills**: `nodejs-best-practices`, `api-patterns`
* **Dependências**: Tarefa 1
* **INPUT**: Conexão com Supabase em [supabase.ts](file:///home/kayke/Projetos/erp-raupp-/src/lib/supabase.ts).
* **OUTPUT**: Arquivo `src/services/estoqueService.ts` contendo funções tipadas: `getEstoque()`, `updateQuantidade()`, `adicionarItem()`, `deletarItem()`.
* **VERIFY**: Executar teste de compilação rápida utilizando o TypeScript compiler.

---

### Prioridade P1: Interface de Gerenciamento de Estoque
#### Tarefa 3: Tela de Gestão de Inventário (`StockManagement.tsx`)
* **Agente**: `frontend-specialist`
* **Skills**: `frontend-design`, `tailwind-patterns`
* **Dependências**: Tarefa 2
* **INPUT**: Serviço de estoque.
* **OUTPUT**: Página de controle contendo tabela de itens, filtros por categoria (Toners / Peças), formulário para cadastrar novos itens, ajuste rápido de quantidade e sinalização de estoque baixo (vermelho/laranja se `quantidade_atual <= quantidade_minima`).
* **VERIFY**: Adicionar a página ao [Dashboard.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/Dashboard.tsx) e validar visualmente a filtragem e alertas de estoque crítico.

---

### Prioridade P2: Integração e Baixa Automática
#### Tarefa 4: Integração de Baixa de Toners em `ExchangeList`
* **Agente**: `frontend-specialist`
* **Skills**: `frontend-design`, `clean-code`
* **Dependências**: Tarefa 3
* **INPUT**: Tela `ExchangeList.tsx` e lógica de criação de troca.
* **OUTPUT**: Formulário de trocas modificado para selecionar um Toner cadastrado no estoque (categoria 'Toner') e, ao confirmar, executar a transação de inserção de troca e decremento do item no estoque.
* **VERIFY**: Realizar uma troca de suprimento no sistema e verificar se a quantidade no inventário reduziu em 1 unidade.

#### Tarefa 5: Integração de Baixa de Peças em `MaintenanceList`
* **Agente**: `frontend-specialist`
* **Skills**: `frontend-design`, `clean-code`
* **Dependências**: Tarefa 3
* **INPUT**: Tela `MaintenanceList.tsx` e lógica de encerramento de OS.
* **OUTPUT**: Ao adicionar peças ou finalizar a OS, permitir selecionar a peça do estoque (categoria 'Peça') e subtrair a quantidade utilizada.
* **VERIFY**: Cadastrar uma OS com peças de reposição e verificar se a peça correspondente teve sua quantidade reduzida no estoque.

---

### Prioridade P3: Alertas Globais e Dashboard
#### Tarefa 6: Indicadores de Alerta no Dashboard
* **Agente**: `frontend-specialist`
* **Skills**: `frontend-design`, `performance-profiling`
* **Dependências**: Tarefa 3
* **INPUT**: Arquivo `Dashboard.tsx`.
* **OUTPUT**: Card de resumo informando a quantidade de itens com "Estoque Crítico" com link direto para a página de Estoque.
* **VERIFY**: Reduzir a quantidade de um toner abaixo do mínimo e verificar se o número de alertas de estoque crítico incrementou no Dashboard principal.

---

### Prioridade P4: Garantia de Qualidade e Testes
#### Tarefa 7: Escrita de Testes de Integração
* **Agente**: `test-engineer`
* **Skills**: `testing-patterns`, `webapp-testing`
* **Dependências**: Tarefa 4, Tarefa 5
* **INPUT**: Vitest e React Testing Library configurados.
* **OUTPUT**: Arquivo `src/pages/__tests__/StockManagement.test.tsx` testando a exibição do estoque crítico e a baixa nas trocas.
* **VERIFY**: Rodar `npx vitest run` e validar que 100% dos testes passaram.

---

## 🏁 6. Fase X: Verificação Final
Antes de marcar a entrega como concluída, as seguintes verificações devem ser executadas e marcadas como aprovadas:

- [x] Lint: `npm run lint` -> Pass
- [x] TypeScript: `npx tsc --noEmit` -> Pass
- [x] Build de Produção: `npm run build` -> Pass
- [x] Testes Automatizados: `npx vitest run` -> Pass
- [x] Sem cores proibidas (sem roxos/violetas)

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-29
