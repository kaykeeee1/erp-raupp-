-- =====================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE ESTOQUE (SUPRIMENTOS & PEÇAS)
-- Cole e execute este script no SQL Editor do seu console Supabase.
-- =====================================================================

-- 1. Criação da tabela
CREATE TABLE IF NOT EXISTS public.tb_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_nome TEXT UNIQUE NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('Toner', 'Peça', 'Cilindro')),
    quantidade_atual INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
    quantidade_minima INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_minima >= 0),
    modelo_compativel TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar segurança de nível de linha (RLS)
ALTER TABLE public.tb_estoque ENABLE ROW LEVEL SECURITY;

-- 3. Criação de políticas RLS
-- Nota: Como o ERP usa autenticação de usuário padrão, concedemos acesso completo a usuários autenticados.
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.tb_estoque FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados" 
ON public.tb_estoque FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados" 
ON public.tb_estoque FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir exclusão para usuários autenticados" 
ON public.tb_estoque FOR DELETE 
TO authenticated 
USING (true);

-- 4. Função e trigger para atualização automática de 'atualizado_em'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.atualizado_em = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tb_estoque_atualizado_em ON public.tb_estoque;
CREATE TRIGGER update_tb_estoque_atualizado_em
BEFORE UPDATE ON public.tb_estoque
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Inserção de dados iniciais (Seed Data)
INSERT INTO public.tb_estoque (item_nome, categoria, quantidade_atual, quantidade_minima, modelo_compativel) VALUES
('Toner HP CF283A (83A)', 'Toner', 12, 5, 'HP LaserJet Pro M127fn/M125nw'),
('Toner Brother TN660', 'Toner', 8, 3, 'Brother HL-L2320D/L2360DW'),
('Toner Samsung MLT-D111S', 'Toner', 4, 3, 'Samsung M2020/M2070W'),
('Toner HP W1105A (105A)', 'Toner', 1, 3, 'HP Laser 107a/135w'), -- Baixo estoque
('Rolo Pressor HP M127', 'Peça', 5, 2, 'HP LaserJet Pro M127/M125'),
('Película de Fusor Universal 110V', 'Peça', 10, 4, 'HP/Brother/Samsung'),
('Placa Fonte HP M127fn', 'Peça', 2, 1, 'HP LaserJet Pro M127fn'),
('Rolo Tracionador (Pick-up) L2320', 'Peça', 0, 2, 'Brother HL-L2320D') -- Crítico / Fora de estoque
ON CONFLICT (item_nome) DO NOTHING;
