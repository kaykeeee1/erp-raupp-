# Plano de Projeto: Implementação do Módulo de RPA e Engenharia de Contextos

Este plano detalha as tarefas, dependências e critérios de aceitação para implementar a extensão de **RPA e Engenharia de Contextos** no Antigravity Agent Toolkit do **ERP Raupp**. Esta melhoria adicionará um novo agente especialista, duas novas habilidades com padrões de desenvolvimento e um workflow completo de automação.

---

## 📋 1. Visão Geral
Conforme o planejado no roadmap do toolkit (`.agent/ARCHITECTURE.md`), a implementação do módulo de RPA trará inteligência para automação de processos legados e extração de contextos estruturados de interfaces web ou relatórios. A Engenharia de Contextos focará em extrair dados brutos (de notas, ERPs ou telas), organizá-los e injetá-los de forma ótima nos prompts dos agentes.

---

## 🛠️ 2. Tipo de Projeto e Pilha Tecnológica
* **Tipo de Projeto**: BACKEND / TOOLKIT EXTENSION
* **Pilha Tecnológica**:
  1. **Markdown (Especificações de Agentes/Skills)**: Configuração baseada em YAML frontmatter e guias markdown compatíveis com o Antigravity Kit.
  2. **Python/Shell Scripts**: Para validação e automações locais (se necessário).
  3. **Playwright / Scrapers**: Tecnologias de automação referenciadas nos guias.

---

## 🎯 3. Critérios de Sucesso
- [x] Criação do agente especialista `.agent/agents/rpa-engineer.md` com YAML frontmatter válido.
- [x] Criação da skill `.agent/skills/rpa-patterns/SKILL.md` contendo padrões de resiliência e seletores estáveis.
- [x] Criação da skill `.agent/skills/context-engineering/SKILL.md` definindo esquemas de extração e injeção de contexto.
- [x] Criação do workflow `.agent/workflows/build-rpa.md` contendo o guia passo a passo de desenvolvimento.
- [x] Atualização do arquivo `.agent/ARCHITECTURE.md` para integrar e expor os novos componentes.
- [x] Passar em todas as validações de scripts e formatação markdown do toolkit.

---

## 📁 4. Estrutura de Arquivos Planejada

```plaintext
.agent/
├── agents/
│   └── rpa-engineer.md            # Personas e diretrizes do engenheiro de RPA
├── skills/
│   ├── rpa-patterns/
│   │   └── SKILL.md               # Padrões de resiliência, retry e mapeamento
│   └── context-engineering/
│       └── SKILL.md               # Extração, transformação e injeção de contexto
├── workflows/
│   └── build-rpa.md               # Passo a passo para criar automações
└── ARCHITECTURE.md                # Atualizado com o mapeamento do novo agente
```

---

## 📝 5. Cronograma de Tarefas (Task Breakdown)

### Prioridade P0: Estrutura do Agente e Fluxo de Trabalho
#### Tarefa 1: Criação do Agente `rpa-engineer.md`
* **Agente**: `project-planner`
* **Skills**: `plan-writing`, `clean-code`
* **Dependências**: Nenhuma
* **INPUT**: Arquivos de agentes existentes em `.agent/agents/` como referência de estrutura.
* **OUTPUT**: Arquivo `.agent/agents/rpa-engineer.md` contendo as regras de persona, instruções de manipulação de erros (ex: timeouts, seletores quebrados) e skills habilitadas (`rpa-patterns`, `context-engineering`).
* **VERIFY**: Validar que o arquivo contém frontmatter válido e respeita a proibição de cores roxas na identidade.

#### Tarefa 2: Criação do Workflow `build-rpa.md`
* **Agente**: `orchestrator`
* **Skills**: `plan-writing`
* **Dependências**: Tarefa 1
* **INPUT**: Workflows em `.agent/workflows/` (ex: `enhance.md`) como modelo de estrutura.
* **OUTPUT**: Arquivo `.agent/workflows/build-rpa.md` especificando a sequência de passos para mapear processos, criar scripts de automação, testar fallbacks e revisar o código de raspagem.
* **VERIFY**: Verificar integridade dos links relativos de arquivos criados no workflow.

---

### Prioridade P1: Módulos de Conhecimento (Skills)
#### Tarefa 3: Implementação da Skill `rpa-patterns`
* **Agente**: `backend-specialist`
* **Skills**: `clean-code`, `api-patterns`
* **Dependências**: Tarefa 2
* **INPUT**: Definição de problemas comuns de automação (timeouts, captchas, iframes, selectors mutáveis).
* **OUTPUT**: Arquivo `.agent/skills/rpa-patterns/SKILL.md` documentando boas práticas em Playwright/Python, estratégias de retry exponencial, gestão de estado de cookies e tratamento de falhas críticas.
* **VERIFY**: Validar que a estrutura do markdown está sob a limitação de linhas e contém metadados válidos.

#### Tarefa 4: Implementação da Skill `context-engineering`
* **Agente**: `ai-architect`
* **Skills**: `clean-code`, `prompt-engineering`
* **Dependências**: Tarefa 3
* **INPUT**: Teorias de Engenharia de Contexto para LLMs (Janelas de contexto, injeção XML, RAG Just-in-Time).
* **OUTPUT**: Arquivo `.agent/skills/context-engineering/SKILL.md` definindo estratégias de limpeza de HTML/JSON para alimentar prompts, uso de tags semânticas delimitadoras e arquiteturas de injeção dinâmica de dados de ERP no fluxo de tomada de decisão do agente.
* **VERIFY**: Checar conformidade dos códigos e exemplos de formatação de prompts descritos na skill.

---

### Prioridade P2: Integração e Documentação Geral
#### Tarefa 5: Integração em `ARCHITECTURE.md` e Referências
* **Agente**: `documentation-writer`
- **Skills**: `clean-code`
* **Dependências**: Tarefa 4
* **INPUT**: Arquivos `.agent/ARCHITECTURE.md` e `README.md`.
* **OUTPUT**: Arquivos atualizados mapeando o agente `rpa-engineer` e suas respectivas skills na tabela geral de componentes e cobertura técnica.
* **VERIFY**: Compilação de links markdown e links clicáveis sem erros de caminho relativo.

---

## 🏁 6. Fase X: Verificação Final

Antes de finalizar o projeto de implementação da feature, execute e passe nas seguintes validações:

- [x] Executar check de ferramentas: `python3 .agent/scripts/checklist.py .` -> Pass
- [x] Executar suíte completa: `python3 .agent/scripts/verify_all.py .` -> Pass
- [x] Conferir que nenhum arquivo novo de skill ou agente viola a proibição do roxo (Purple Ban) ou usa layouts clichês.
- [x] Validar integridade dos arquivos markdown.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-29
