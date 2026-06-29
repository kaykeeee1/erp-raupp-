-- =====================================================================
-- SCRIPT DE ADIÇÃO DE NOVAS CATEGORIAS NO BANCO DE DADOS
-- Cole e execute este script no SQL Editor do seu console Supabase.
-- =====================================================================

-- Remove a restrição check_categoria antiga se ela existir
ALTER TABLE public.tb_estoque DROP CONSTRAINT IF EXISTS check_categoria;

-- Adiciona a nova restrição permitindo as novas categorias
ALTER TABLE public.tb_estoque ADD CONSTRAINT check_categoria CHECK (
    categoria IN ('Toner', 'Peça', 'Cilindro', 'Unidade de Fusor', 'Unidade de Imagem')
);
