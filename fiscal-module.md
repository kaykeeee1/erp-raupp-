# Fiscal Module Implementation Plan

## Overview
This plan outlines the architecture, database schema, and task breakdown to implement the **Fiscal Module** in the ERP Raupp system. The module will handle invoice entries (manual and XML upload), tax calculations (IVA Dual 2026), billing, and tight integration with both the financial records (Accounts Payable/Receivable) and inventory stock levels.

---

## Project Type
- **Type**: WEB
- **Primary Agent**: `frontend-specialist` (UI/UX, XML Upload & Form Handling)
- **Secondary Agents**: `database-architect` (Supabase Schema & Triggers), `backend-specialist` (Fiscal logic, Tax calculations, Services)

---

## Success Criteria
- **XML Import**: Parsing standard NF-e/NFS-e XML files client-side, automatically extracting invoice metadata, items, taxes, values, and access keys.
- **Taxes**: Support calculation and view of Dual IVA (CBS + IBS) for invoices.
- **Finance Integration**: Saving an invoice automatically creates a corresponding accounts receivable/payable entry in `tb_financeiro`.
- **Stock Integration**: Registering a purchase invoice increments stock quantity in `tb_estoque` for matching items.
- **Verification**: Zero TypeScript/ESLint errors, passes security scans, builds successfully.

---

## Tech Stack
- **Frontend**: React (v19) + TypeScript
- **Styling**: Tailwind CSS (v4) with Raupp brand palette
- **Icons**: Lucide React
- **Database/Backend**: Supabase (PostgreSQL) + pgSQL Triggers

---

## Proposed Database Schema Changes
A new migration file [supabase_fiscal_setup.sql](file:///home/kayke/Projetos/erp-raupp-/supabase_fiscal_setup.sql) will be created to define the financial transactions table and add fiscal integration columns:

```sql
-- 1. Create financial transactions table
CREATE TABLE IF NOT EXISTS public.tb_financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
    valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
    status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Cancelado')),
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    nota_fiscal_id UUID REFERENCES public.tb_notas_fiscais(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.tb_clientes(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enhance existing tb_notas_fiscais table
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44) UNIQUE;
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS xml_raw TEXT;
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
```

---

## File Structure
```plaintext
erp-raupp/
├── supabase_fiscal_setup.sql      # Database migrations (tables, triggers)
├── src/
│   ├── services/
│   │   └── fiscalService.ts       # XML parser & fiscal calculations service
│   ├── pages/
│   │   ├── InvoiceList.tsx        # Updated invoice screen with XML upload & integrations
│   │   └── FinanceList.tsx        # New financial screen (receivables and payables)
│   └── components/
│       └── XmlUploadModal.tsx     # Reusable XML parser/upload component
```

---

## Task Breakdown

### Phase 1: Database Setup
- [x] **Task 1**: Create and run the database migration [supabase_fiscal_setup.sql](file:///home/kayke/Projetos/erp-raupp-/supabase_fiscal_setup.sql) to set up financial schemas and columns.
  - **Agent**: `database-architect`
  - **Skills**: `database-design`, `prisma-expert`
  - **INPUT**: Schema requirements
  - **OUTPUT**: Valid SQL file running on Supabase
  - **VERIFY**: Check on Supabase console that `tb_financeiro` exists and `tb_notas_fiscais` columns are updated.

### Phase 2: Backend Services
- [x] **Task 2**: Implement `fiscalService.ts` in `src/services/` to parse standard XML invoices client-side.
  - **Agent**: `backend-specialist`
  - **Skills**: `clean-code`, `api-patterns`
  - **INPUT**: XML raw string structure
  - **OUTPUT**: File `src/services/fiscalService.ts` containing `parseInvoiceXml()` and tax computation logic
  - **VERIFY**: Unit tests parsing sample XML structures return correct JS object.

- [x] **Task 3**: Create inventory-sync helper inside `fiscalService.ts` to automatically increment items in `tb_estoque` when an inlet invoice items match.
  - **Agent**: `backend-specialist`
  - **Skills**: `clean-code`, `nodejs-best-practices`
  - **INPUT**: Items list extracted from XML
  - **OUTPUT**: `syncInvoiceWithInventory()` method calling `estoqueService`
  - **VERIFY**: Item quantities in `tb_estoque` increase correctly after simulation.

### Phase 3: Frontend - Financial List
- [x] **Task 4**: Create `FinanceList.tsx` page to display revenues/expenses, filter by status, and show corresponding invoice links.
  - **Agent**: `frontend-specialist`
  - **Skills**: `react-best-practices`, `frontend-design`
  - **INPUT**: database fields from `tb_financeiro`
  - **OUTPUT**: File `src/pages/FinanceList.tsx`
  - **VERIFY**: Component compiles, displays listings, and navigation handles filters.

- [x] **Task 5**: Integrate the new `FinanceList.tsx` view mode into [src/pages/Dashboard.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/Dashboard.tsx).
  - **Agent**: `frontend-specialist`
  - **Skills**: `react-best-practices`
  - **INPUT**: Nav links layout
  - **OUTPUT**: Updated `Dashboard.tsx` with "Financeiro" sidebar button
  - **VERIFY**: Clicking sidebar redirects or changes view to FinanceList.

### Phase 4: Frontend - XML Upload & Billing
- [x] **Task 6**: Design and code `XmlUploadModal.tsx` utilizing standard file upload inputs, extracting EAN, values, and items.
  - **Agent**: `frontend-specialist`
  - **Skills**: `frontend-design`
  - **INPUT**: User selects `.xml` file
  - **OUTPUT**: File `src/components/XmlUploadModal.tsx`
  - **VERIFY**: Uploading dummy XML displays preview of invoice fields and items correctly.

- [x] **Task 7**: Update [src/pages/InvoiceList.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/InvoiceList.tsx) to support XML upload integration, automatic creation of accounts receivable on billing submission, and matching invoice items with stock.
  - **Agent**: `frontend-specialist`
  - **Skills**: `react-best-practices`
  - **INPUT**: XML upload callbacks
  - **OUTPUT**: Enhanced `InvoiceList.tsx`
  - **VERIFY**: Processing closing invoice inserts records into both `tb_notas_fiscais` and `tb_financeiro`.

---

## Phase X: Final Verification

### Automated Validations
- [x] **Lint and Types**: Ensure typescript passes: `npm run build`
- [x] **Security Scan**: Completed build and validation
- [x] **UX Audit**: Verified floating elements and accessibility

### Compliance Checklist
- [x] No violet/purple hex codes in styles
- [x] Floating logo card matches the Raupp official blue/orange theme
- [x] Responsive navigation works across all window sizes

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-29

