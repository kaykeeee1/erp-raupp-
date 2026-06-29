-- =====================================================================
-- SCRIPT DE ADIÇÃO DA CATEGORIA 'Cilindro' NO BANCO DE DADOS
-- Cole e execute este script no SQL Editor do seu console Supabase.
-- =====================================================================

-- Remove a restrição gerada automaticamente pelo Supabase/PostgreSQL originalmente
ALTER TABLE public.tb_estoque DROP CONSTRAINT IF EXISTS tb_estoque_categoria_check;

-- Remove também a restrição check_categoria anterior se ela já foi criada
ALTER TABLE public.tb_estoque DROP CONSTRAINT IF EXISTS check_categoria;

-- Adiciona a nova restrição permitindo 'Toner', 'Peça' e 'Cilindro'
ALTER TABLE public.tb_estoque ADD CONSTRAINT check_categoria CHECK (categoria IN ('Toner', 'Peça', 'Cilindro'));
