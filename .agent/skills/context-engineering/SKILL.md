---
name: context-engineering
description: Standards and patterns for context extraction, transformation, token pruning, and structured injection in LLM/AI workflows.
---

# Context Engineering for AI & RPA Systems

Este guia define as práticas recomendadas para a **Engenharia de Contextos**, que envolve extrair informações brutas de diversas fontes (ERPs, e-mails, bancos de dados, arquivos), estruturá-las e injetá-las de forma otimizada e econômica na janela de contexto de modelos de linguagem (LLMs).

---

## 📐 1. Padrões de Extração e Limpeza de Contexto

Reinjetar dados brutos não estruturados (ex: páginas HTML completas, logs de servidor brutos) desperdiça tokens e causa desatenção no modelo ("lost in the middle").

### Estratégias de Pruning (Poda de Tokens)
- **HTML Pruning**: Remova tags irrelevantes para a tomada de decisão (como `<script>`, `<style>`, `<iframe>`, folhas de estilo, SVG embutidos, rodapés de navegação) e converta para Markdown simplificado.
- **JSON Pruning**: Filtre chaves desnecessárias do payload antes de enviá-lo ao prompt:
```typescript
// Exemplo: Limpar objeto de cliente mantendo apenas o necessário para faturamento
const clientContext = {
  razao_social: client.razao_social,
  valor_franquia: client.valor_franquia,
  franquia_paginas: client.franquia_paginas,
  valor_clique_excedente: client.valor_clique_excedente
}; // Pruna ids internos, timestamps, campos de auditoria
```

---

## 🏗️ 2. Estruturação e Delimitação no Prompt

Para que o modelo diferencie instruções de dados contextuais, utilize delimitadores estruturados e padronizados.

### Uso de Tags XML
A melhor prática para injeção de contexto estruturado em modelos avançados (como Claude e Gemini) é o uso de tags XML nomeadas.
```xml
Você é um assistente fiscal. Analise o extrato abaixo para validar se os excedentes batem com o contratado.

<client_contract>
razao_social: Cliente Teste Ltda
franquia_paginas: 1000
valor_franquia: 250.00
valor_clique: 0.15
</client_contract>

<billing_period_readings>
contador_anterior: 4500
contador_atual: 5800
</billing_period_readings>

Instruções: Calcule o valor total a ser faturado.
```

---

## ⚡ 3. Contexto Just-in-Time (JIT)

Evite sobrecarregar o prompt com informações globais de histórico. Use a técnica de carregamento preguiçoso (Lazy Loading) do contexto:
1.  **RAG Híbrido**: Recupere apenas as chunks relevantes para a pergunta atual (vetores + palavras-chave).
2.  **Stateful Memory Context**: Armazene dados persistentes do usuário em bancos vetoriais leves e recupere apenas os perfis ativos correspondentes à tarefa em execução.
3.  **ERP Context Hydration**: Busque no banco de dados (Supabase) os registros dependentes apenas no momento do disparo da execução (ex: obter dados específicos do cliente ao iniciar a geração de boleto).

---

## 📦 4. Esquemas de Contexto de Integração RPA

Ao integrar a automação com a IA, forneça um contexto que instrua o robô sobre o estado atual da automação:
- **Estado do Navegador**: URL atual, títulos, visibilidade de elementos importantes.
- **Histórico de Cliques**: Array de últimas ações tomadas pelo robô para que o LLM possa guiar a navegação em caso de desvios.
- **Esquema de Erros**: Mensagem de erro capturada e a estrutura de tags do elemento que falhou.
