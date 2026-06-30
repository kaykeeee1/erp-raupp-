---
description: Guide to building, testing, and verifying RPA (Robotic Process Automation) and scraping scripts.
---

# /build-rpa - Criar Automotor/Scraper RPA

Este comando inicia o fluxo guiado para criar, depurar e implantar rotinas automatizadas de RPA (Robotic Process Automation) ou scripts de web scraping resilientes.

---

## 🚀 Passos do Workflow

### 1. Entender o Fluxo Manual
- Peça ao usuário o fluxo exato passo a passo de como ele executa o processo em uma interface web ou desktop.
- Identifique os portais de entrada, necessidade de credenciais (guardar em `.env`), botões e inputs envolvidos.

### 2. Mapeamento de Seletores
- O agente `rpa-engineer` deve realizar um mapeamento dos elementos interativos.
- Documente os seletores identificados (IDs estáveis, atributos `data-testid`, tags semânticas) em uma tabela de mapeamento.
- Evite caminhos absolutos XPath ou CSS puramente estruturais.

### 3. Escrita do Script (Implementação Resiliente)
- Escreva a rotina usando Playwright, Puppeteer ou bibliotecas Python de RPA.
- **Regra de Ouro**: Todo clique, preenchimento ou navegação deve ser precedido por uma verificação dinâmica de visibilidade/disponibilidade do elemento.
- Adicione blocos try-catch para capturar falhas no momento exato e tirar screenshots de erro.

### 4. Simulação e Teste Local
- Execute a automação no modo de desenvolvimento local (se possível no ambiente do usuário).
- Registre o tempo de execução e valide as saídas geradas (ex: arquivos baixados, dados salvos no banco).

### 5. Auditoria de Estabilidade
- Verifique se o script trata adequadamente timeouts, telas de carregamento intermediárias, erros de login e limitação de requisições (rate limits).

---

## 💡 Exemplos de Uso

```bash
/build-rpa automatizar download de notas da prefeitura
/build-rpa criar script para preenchimento de faturas no portal parceiro
/build-rpa fazer scraper de preços de insumos concorrentes
/build-rpa automação de importação de contratos legados em lote
```

---

## ⚠️ Restrições e Boas Práticas
- Nunca salve credenciais ou chaves privadas nos arquivos do script. Utilize `.env` ou o gerenciador de segredos.
- Sempre configure um limite de timeout explícito para que o script não fique travado indefinidamente.
- Em caso de falha de automação, certifique-se de fechar as instâncias do browser (`browser.close()`) para evitar vazamento de memória.
