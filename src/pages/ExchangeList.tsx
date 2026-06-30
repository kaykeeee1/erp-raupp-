import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { estoqueService } from '../services/estoqueService';
import type { EstoqueItem } from '../services/estoqueService';

interface TrocaSuprimento {
  id: string;
  equipamento_id: string;
  tipo: string;
  data_troca: string;
  contador_na_troca: number;
  tecnico_responsavel: string;
  observacoes: string;
  tb_equipamentos: {
    modelo: string;
    numero_serie: string;
  } | null;
}

interface EquipamentoDropdown {
  id: string;
  modelo: string;
  numero_serie: string;
}

const INITIAL_FORM = {
  equipamento_id: '',
  tipo: '',
  contador_na_troca: 0,
  tecnico_responsavel: '',
  observacoes: '',
};

const ExchangeList: React.FC = () => {
  const [trocas, setTrocas] = useState<TrocaSuprimento[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Insumos carregados do estoque
  const [tonersEstoque, setTonersEstoque] = useState<EstoqueItem[]>([]);

  // Estados para o Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTroca, setEditingTroca] = useState<TrocaSuprimento | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<TrocaSuprimento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTrocas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_consumiveis')
        .select('*, tb_equipamentos(modelo, numero_serie)')
        .order('data_troca', { ascending: false });

      if (error) throw error;
      setTrocas(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('tb_equipamentos')
        .select('id, modelo, numero_serie')
        .order('modelo', { ascending: true });

      if (error) throw error;
      setEquipamentos(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Erro ao carregar equipamentos para o dropdown:', errorMsg);
    }
  };

  const fetchToners = async () => {
    try {
      const data = await estoqueService.getEstoque();
      setTonersEstoque(data.filter((item) => item.categoria === 'Toner'));
    } catch (err) {
      console.error('Erro ao carregar toners do estoque:', err);
    }
  };

  useEffect(() => {
    fetchTrocas();
    fetchEquipamentos();
    fetchToners();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- CRUD: CREATE ----
  const handleOpenCreateModal = () => {
    setEditingTroca(null);
    setFormData({ ...INITIAL_FORM });
    setError(null);
    fetchToners();
    setIsModalOpen(true);
  };

  // ---- CRUD: EDIT ----
  const handleOpenEditModal = (troca: TrocaSuprimento) => {
    setEditingTroca(troca);
    setFormData({
      equipamento_id: troca.equipamento_id || '',
      tipo: troca.tipo,
      contador_na_troca: troca.contador_na_troca,
      tecnico_responsavel: troca.tecnico_responsavel || '',
      observacoes: troca.observacoes || '',
    });
    setError(null);
    fetchToners();
    setIsModalOpen(true);
  };

  const handleSubmitTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipamento_id) {
      setError('Por favor, selecione um equipamento.');
      return;
    }
    if (!formData.tipo) {
      setError('Por favor, selecione um insumo.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Se for uma nova troca de suprimento, realiza a baixa no estoque
      if (!editingTroca) {
        const selectedToner = tonersEstoque.find(t => t.item_nome === formData.tipo);
        if (selectedToner) {
          if (selectedToner.quantidade_atual <= 0) {
            setError(`O insumo "${selectedToner.item_nome}" está fora de estoque.`);
            setIsSaving(false);
            return;
          }
          await estoqueService.updateQuantidade(selectedToner.id, selectedToner.quantidade_atual - 1);
        }
      }

      const payload = {
        equipamento_id: formData.equipamento_id,
        tipo: formData.tipo,
        contador_na_troca: Number(formData.contador_na_troca),
        tecnico_responsavel: formData.tecnico_responsavel,
        observacoes: formData.observacoes,
      };

      if (editingTroca) {
        const { error } = await supabase.from('tb_consumiveis').update(payload).eq('id', editingTroca.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tb_consumiveis').insert([payload]);
        if (error) throw error;
      }

      setFormData({ ...INITIAL_FORM });
      setEditingTroca(null);
      setIsModalOpen(false);
      fetchTrocas();
      fetchToners();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg || 'Erro ao registar troca.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- CRUD: DELETE ----
  const handleDeleteTroca = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      const { error } = await supabase.from('tb_consumiveis').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchTrocas();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Histórico de Trocas (Suprimentos)</h3>
          <p className="text-slate-500 text-xs mt-0.5">Controle de insumos, cilindros e peças por equipamento.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          + Registar Troca
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Carregando dados...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Equipamento</th>
                <th className="px-6 py-3">Consumível</th>
                <th className="px-6 py-3">Contador na Troca</th>
                <th className="px-6 py-3">Técnico</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {trocas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Nenhuma troca registada ainda.
                  </td>
                </tr>
              ) : (
                trocas.map((troca) => (
                  <tr key={troca.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {new Date(troca.data_troca).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{troca.tb_equipamentos?.modelo}</div>
                      <div className="text-xs text-slate-400 font-mono">S/N: {troca.tb_equipamentos?.numero_serie}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{troca.tipo}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{troca.contador_na_troca.toLocaleString()} pág.</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{troca.tecnico_responsavel || '---'}</td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(troca)}
                        className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-semibold border border-amber-200 transition-all"
                        title="Editar troca"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(troca)}
                        className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-semibold border border-red-200 transition-all"
                        title="Excluir troca"
                      >
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg mx-4 p-6 bg-white rounded-xl shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingTroca ? 'Editar Troca de Suprimento' : 'Registar Troca de Suprimento'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTroca(null); }} className="text-slate-400 hover:text-slate-600 text-xl font-semibold">&times;</button>
            </div>

            <form onSubmit={handleSubmitTroca} className="space-y-4">
              <div>
                <label htmlFor="form_equipamento" className="block text-xs font-bold text-slate-500 uppercase">Selecione a Impressora *</label>
                <select
                  id="form_equipamento"
                  name="equipamento_id"
                  value={formData.equipamento_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200"
                >
                  <option value="">-- Escolha o Equipamento pelo Modelo (S/N) --</option>
                  {equipamentos.map((e) => (
                    <option key={e.id} value={e.id}>{e.modelo} (S/N: {e.numero_serie})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form_tipo_consumivel" className="block text-xs font-bold text-slate-500 uppercase">Tipo de Consumível *</label>
                  <select
                    id="form_tipo_consumivel"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200"
                  >
                    <option value="">-- Escolha no Estoque --</option>
                    {tonersEstoque.map((t) => (
                      <option key={t.id} value={t.item_nome} disabled={t.quantidade_atual <= 0}>
                        {t.item_nome} ({t.quantidade_atual} un.)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="form_contador" className="block text-xs font-bold text-slate-500 uppercase">Contador Atual *</label>
                  <input
                    id="form_contador"
                    type="number"
                    name="contador_na_troca"
                    value={formData.contador_na_troca}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Técnico Responsável</label>
                <input
                  type="text"
                  name="tecnico_responsavel"
                  value={formData.tecnico_responsavel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200"
                  placeholder="Nome do técnico"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Observações</label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200 resize-none"
                  placeholder="Ex: Substituído por insumo compatível / original..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingTroca(null); }} className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
                  {isSaving ? 'Gravando...' : editingTroca ? 'Atualizar Registro' : 'Gravar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-slate-800">Excluir Registro de Troca</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir esta troca de <strong className="text-slate-700">{deleteTarget.tipo}</strong>?
              </p>
              <p className="text-xs text-slate-400">Equipamento: {deleteTarget.tb_equipamentos?.modelo}</p>
              <p className="text-xs text-red-500 mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-2 border-t">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
              <button type="button" onClick={handleDeleteTroca} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeList;
