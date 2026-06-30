---
name: rpa-patterns
description: Core patterns for Robotic Process Automation (RPA), scraping resilience, error recovery, and robust browser selectors.
---

# RPA Patterns & Web Scraping Resiliency

Este guia define os padrões arquiteturais obrigatórios para a criação de automações robóticas de processos (RPA) estáveis e scripts de web scraping tolerantes a falhas.

---

## 🛡️ 1. Padrões de Seleção Resilientes (Selector Resilience)

Seletores CSS ou XPaths absolutos que dependem da hierarquia exata do DOM (ex: `div > div > span:nth-child(3)`) quebram ao menor ajuste visual. Use os seguintes padrões:

| Padrão | Exemplo Ruim | Exemplo Recomendado (Playwright/JS) |
| :--- | :--- | :--- |
| **Atributos de Teste** | `button.btn-primary` | `page.locator('[data-testid="submit-btn"]')` |
| **Combinação Semântica** | `//div[2]/button` | `page.getByRole('button', { name: 'Confirmar' })` |
| **Filtros por Texto** | `p.description` | `page.locator('p').filter({ hasText: 'Contrato Ativo' })` |
| **Âncora Relativa** | `//tr[3]/td[4]/a` | `page.locator('tr').filter({ hasText: 'ID 105' }).locator('a.edit')` |

### Regra de Ouro:
Sempre prefira atributos injetados pela própria equipe de desenvolvimento (ex: `data-testid="invoice-download"`) para isolar a automação de alterações estéticas na folha de estilos (Tailwind/CSS).

---

## 🔄 2. Padrões de Espera Dinâmica e Resiliência

### Esperas Implícitas (Anti-Pattern)
**NUNCA** use esperas baseadas em tempo fixo (`time.sleep(5)` ou `await delay(5000)`), pois o carregamento varia de acordo com a rede, recursos da máquina e latência do servidor.

### Esperas Ativas (Recomendado)
Sempre aguarde condições específicas da interface:
- Playwright: `page.locator('selector').wait_for(state="visible", timeout=10000)`
- Puppeteer: `await page.waitForSelector('selector', { visible: true, timeout: 10000 })`
- Esperar requisição de API: `await page.waitForResponse(response => response.url().includes('/api/invoice') && response.status() === 200)`

### Retry com Backoff Exponencial
Para ações suscetíveis a falhas de rede, utilize o padrão de Retry com tempo de espera incremental:
```typescript
async function retryAction<T>(action: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Ação falhou. Tentando novamente em ${delayMs}ms... Erro: ${error}`);
    await new Promise(res => setTimeout(res, delayMs));
    return retryAction(action, retries - 1, delayMs * 2);
  }
}
```

---

## 🕵️ 3. Evasão de Detecção Anti-Bot e CAPTCHAs

Para acessar portais públicos ou sistemas que implementam Cloudflare ou proteções similares de requisição automatizada:
1.  **Rotação de User-Agent**: Evite usar o User-Agent padrão do headless Chromium (que contém a palavra `HeadlessChrome`). Injete cabeçalhos de navegadores reais.
2.  **Modo Stealth (Modo Furtivo)**: Ative pacotes como `puppeteer-extra-plugin-stealth` ou `playwright-stealth` para mascarar variáveis de ambiente do navegador (`navigator.webdriver`).
3.  **Comportamento Humano Simulador**: Use digitação simulada com intervalos aleatórios entre teclas (`delay: 50 + Math.random() * 100`) e movimentos orgânicos de mouse.

---

## 📸 4. Depuração e Captura de Falhas

Toda automação robusta deve salvar o estado exato da aplicação quando um erro inesperado for disparado:
- **Screenshot de Erro**: `await page.screenshot({ path: 'errors/failure-step.png', fullPage: true })`
- **Dump de HTML**: Salvar o conteúdo completo do DOM em formato string (`await page.content()`) para inspecionar seletores alternativos ou mensagens de erro ocultas na página.
