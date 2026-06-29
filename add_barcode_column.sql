-- =====================================================================
-- SCRIPT DE ADIÇÃO DA COLUNA DE CÓDIGO DE BARRAS NO ESTOQUE
-- Cole e execute este script no SQL Editor do seu console Supabase.
-- =====================================================================

ALTER TABLE public.tb_estoque 
ADD COLUMN IF NOT EXISTS codigo_barras TEXT UNIQUE;
