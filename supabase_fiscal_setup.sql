-- =====================================================================
-- SCRIPT DE CONFIGURAÇÃO DO MÓDULO FISCAL & FINANCEIRO
-- Cole e execute este script no SQL Editor do seu console Supabase.
-- =====================================================================

-- 1. Criação da Tabela Financeira
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

-- 2. Extensão da Tabela de Notas Fiscais
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44) UNIQUE;
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS xml_raw TEXT;
ALTER TABLE public.tb_notas_fiscais ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;

-- 3. Habilitar RLS na Tabela Financeira
ALTER TABLE public.tb_financeiro ENABLE ROW LEVEL SECURITY;

-- 4. Criação de Políticas RLS para tb_financeiro (Acesso total para usuários autenticados)
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.tb_financeiro;
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.tb_financeiro FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.tb_financeiro;
CREATE POLICY "Permitir inserção para usuários autenticados" 
ON public.tb_financeiro FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.tb_financeiro;
CREATE POLICY "Permitir atualização para usuários autenticados" 
ON public.tb_financeiro FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON public.tb_financeiro;
CREATE POLICY "Permitir exclusão para usuários autenticados" 
ON public.tb_financeiro FOR DELETE 
TO authenticated 
USING (true);

-- 5. Trigger para Atualização Automática de 'atualizado_em' em tb_financeiro
CREATE OR REPLACE FUNCTION update_financeiro_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.atualizado_em = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tb_financeiro_atualizado_em ON public.tb_financeiro;
CREATE TRIGGER update_tb_financeiro_atualizado_em
BEFORE UPDATE ON public.tb_financeiro
FOR EACH ROW
EXECUTE FUNCTION update_financeiro_updated_at_column();

-- 6. Trigger para Gerar Automaticamente Lançamento Financeiro a partir de uma Nota Fiscal
CREATE OR REPLACE FUNCTION auto_generate_financeiro_from_nota()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT;
    v_desc TEXT;
BEGIN
    -- Determina se é receita ou despesa com base no tipo da nota
    -- Notas de Entrada são Despesas (ex: compras), Notas de Saída/Serviço são Receitas (faturamento)
    IF NEW.tipo_nota = 'Entrada' THEN
        v_tipo := 'Despesa';
        v_desc := 'Compra / Entrada Insumos - NF ' || NEW.numero_nf;
        -- Se fornecedor_nome for informado, anexa à descrição
        IF NEW.fornecedor_nome IS NOT NULL THEN
            v_desc := v_desc || ' (Fornecedor: ' || NEW.fornecedor_nome || ')';
        END IF;
    ELSE
        v_tipo := 'Receita';
        v_desc := 'Faturamento de Contrato - NF ' || NEW.numero_nf;
    END IF;

    -- Insere o registro correspondente no financeiro
    INSERT INTO public.tb_financeiro (
        descricao,
        tipo,
        valor,
        status,
        data_vencimento,
        nota_fiscal_id,
        cliente_id
    ) VALUES (
        v_desc,
        v_tipo,
        NEW.valor_bruto,
        'Pendente',
        (NEW.data_emissao::date + INTERVAL '30 days'), -- Vencimento padrão em 30 dias
        NEW.id,
        NEW.cliente_id
    );

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_auto_financeiro_from_nota ON public.tb_notas_fiscais;
CREATE TRIGGER trg_auto_financeiro_from_nota
AFTER INSERT ON public.tb_notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION auto_generate_financeiro_from_nota();
