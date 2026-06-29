import { supabase } from '../lib/supabase';

export interface EstoqueItem {
  id: string;
  item_nome: string;
  categoria: 'Toner' | 'Peça' | 'Cilindro';
  quantidade_atual: number;
  quantidade_minima: number;
  modelo_compativel?: string;
  codigo_barras?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export const estoqueService = {
  /**
   * Retorna a lista completa de itens em estoque ordenados alfabeticamente.
   */
  async getEstoque(): Promise<EstoqueItem[]> {
    const { data, error } = await supabase
      .from('tb_estoque')
      .select('*')
      .order('item_nome', { ascending: true });
    
    if (error) throw error;
    return (data as EstoqueItem[]) || [];
  },

  /**
   * Cadastra um novo insumo no estoque.
   */
  async adicionarItem(item: Omit<EstoqueItem, 'id' | 'criado_em' | 'atualizado_em'>): Promise<EstoqueItem> {
    const { data, error } = await supabase
      .from('tb_estoque')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data as EstoqueItem;
  },

  /**
   * Atualiza a quantidade física de um item específico do estoque.
   */
  async updateQuantidade(id: string, quantidade: number): Promise<void> {
    const { error } = await supabase
      .from('tb_estoque')
      .update({ quantidade_atual: quantidade })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Atualiza as informações cadastrais e quantidades de um item.
   */
  async updateItem(id: string, item: Partial<Omit<EstoqueItem, 'id' | 'criado_em' | 'atualizado_em'>>): Promise<void> {
    const { error } = await supabase
      .from('tb_estoque')
      .update(item)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Remove um item do estoque permanentemente.
   */
  async deletarItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('tb_estoque')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Busca um item específico pelo código de barras.
   * Retorna o item se localizado, ou null se não existir.
   */
  async getItemByBarcode(barcode: string): Promise<EstoqueItem | null> {
    const { data, error } = await supabase
      .from('tb_estoque')
      .select('*')
      .eq('codigo_barras', barcode)
      .maybeSingle();

    if (error) throw error;
    return data as EstoqueItem | null;
  },

  /**
   * Incrementa ou decrementa a quantidade física de um item baseado no delta especificado.
   */
  async incrementarQuantidade(id: string, delta: number): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('tb_estoque')
      .select('quantidade_atual')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    const novaQtd = (data?.quantidade_atual || 0) + delta;
    if (novaQtd < 0) return;

    const { error: updateError } = await supabase
      .from('tb_estoque')
      .update({ quantidade_atual: novaQtd })
      .eq('id', id);

    if (updateError) throw updateError;
  }
};
