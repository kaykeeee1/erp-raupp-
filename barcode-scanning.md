# Plano de Projeto: Leitura de Código de Barras para Entrada de Estoque (Bipagem USB)

Este plano detalha as especificações para implementar a leitura de códigos de barras (bipagem) via leitor físico USB (emulação de teclado) para entrada rápida e cadastro de insumos (Toners e Peças) no inventário.

---

## 📋 1. Visão Geral
A gestão de estoque do ERP será otimizada com a integração de leitores de código de barras USB/Bluetooth que operam em modo emulação de teclado (Keyboard Wedge). O sistema capturará as leituras rápidas enviadas pelo leitor, identificará o produto no banco e fará o incremento automático de saldo (+1) ou abrirá a tela de cadastro pré-preenchida caso o item ainda não exista.

---

## 🛠️ 2. Tipo de Projeto e Pilha Tecnológica
* **Tipo de Projeto**: WEB (React + TypeScript + Vite + Tailwind CSS v4)
* **Banco de Dados**: Supabase (PostgreSQL)

### Tecnologias e Recursos Utilizados:
1. **Banco de Dados (Supabase)**: Nova coluna `codigo_barras` (texto único) na tabela `tb_estoque`.
2. **Emulação de Teclado**: Listeners de inputs do formulário de bipagem para interceptar o código enviado seguido da quebra de linha (`Enter`) simulada pelo dispositivo USB.

---

## 🎯 3. Critérios de Sucesso
- [ ] Nova coluna `codigo_barras` adicionada à tabela `tb_estoque`.
- [ ] Campo de entrada "Bipar Insumo" visível na barra de ferramentas do Estoque.
- [ ] Ao bipar um código cadastrado, incrementa instantaneamente `+1` na quantidade física daquele item com feedback visual de sucesso (alert/toast).
- [ ] Ao bipar um código inédito, abre automaticamente o modal de "Novo Cadastro" com o campo do código de barras já preenchido e focado.
- [ ] Testes de integração do fluxo de bipagem cobrindo incrementos e novos cadastros.

---

## 📁 4. Estrutura de Arquivos Planejada

```plaintext
src/
├── pages/
│   ├── StockManagement.tsx # Campo de bipagem integrado com foco automático e modais
│   └── __tests__/
│       └── BarcodeScanning.test.tsx # Testes de fluxo de bipagem e incremento automático
```

---

## 📝 5. Cronograma de Tarefas (Task Breakdown)

### Prioridade P0: Infraestrutura e Banco de Dados
#### Tarefa 1: SQL de Alteração de Tabela (`codigo_barras`)
* **Agente**: `database-architect`
* **Skills**: `database-design`
* **Dependências**: Nenhuma
* **INPUT**: Tabela `tb_estoque` existente.
* **OUTPUT**: Arquivo SQL com comando para adicionar a coluna `codigo_barras TEXT UNIQUE` na tabela `tb_estoque`.
* **VERIFY**: Executar comando e verificar existência da coluna na tabela do Supabase.

#### Tarefa 2: Atualização do Serviço de Estoque (`estoqueService.ts`)
* **Agente**: `backend-specialist`
* **Skills**: `clean-code`, `api-patterns`
* **Dependências**: Tarefa 1
* **INPUT**: Tipo `EstoqueItem` e funções de banco.
* **OUTPUT**: `EstoqueItem` atualizado com propriedade `codigo_barras?: string`. Novas funções `estoqueService.getItemByBarcode(barcode)` e `estoqueService.incrementarQuantidade(id, delta)`.
* **VERIFY**: Rodar compilador TypeScript para checar consistência de tipos.

---

### Prioridade P1: Lógica do Campo de Bipagem
#### Tarefa 3: Integração do input de bipagem em `StockManagement.tsx`
* **Agente**: `frontend-specialist`
* **Skills**: `frontend-design`, `clean-code`
* **Dependências**: Tarefa 2
* **INPUT**: Tela [StockManagement.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/StockManagement.tsx).
* **OUTPUT**: Campo de entrada "Bipar Insumo" com escuta do evento `keydown` (detectar `Enter`). No gatilho do enter, o código é pesquisado:
  * Se localizado: incrementa +1 unidade no estoque e limpa o input de bipagem. Exibe toast/alerta temporário de sucesso.
  * Se não localizado: abre o modal de criação pré-preenchendo a propriedade `codigo_barras` e posicionando o cursor no nome do produto.
* **VERIFY**: Testar fluxo digitando um código de barras de teste e apertando `Enter`.

---

### Prioridade P2: Testes e Estabilidade
#### Tarefa 4: Escrita de Testes de Integração
* **Agente**: `test-engineer`
* **Skills**: `testing-patterns`, `webapp-testing`
* **Dependências**: Tarefa 3
* **INPUT**: Vitest e React Testing Library.
* **OUTPUT**: Arquivo `src/pages/__tests__/BarcodeScanning.test.tsx` testando o ciclo de bipagem de itens e incremento do inventário correspondente.
* **VERIFY**: Rodar `npx vitest run` e validar se todos os testes passaram.

---

## 🏁 6. Fase X: Verificação Final
Antes de marcar a entrega como concluída, as seguintes verificações devem ser executadas e marcadas como aprovadas:

- [x] Lint: `npm run lint` -> Pass
- [x] TypeScript: `npx tsc --noEmit` -> Pass
- [x] Build de Produção: `npm run build` -> Pass
- [x] Testes Automatizados: `npx vitest run` -> Pass

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-29
