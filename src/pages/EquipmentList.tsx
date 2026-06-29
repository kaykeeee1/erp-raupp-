import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Equipamento {
  id: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  ip: string; // Corrigido de ip_rede para ip
  contador_inicial: number;
  status: string;
  cliente_id: string | null;
  local_instalacao_id: string | null; // Corrigido de local_id para local_instalacao_id
  tb_clientes: {
    razao_social: string;
  } | null;
  tb_locais_instalacao: {
    nome_local: string;
  } | null;
}

interface ClienteDropdown {
  id: string;
  razao_social: string;
}

interface LocalDropdown {
  id: string;
  nome_local: string;
}

const INITIAL_FORM = {
  marca: '',
  modelo: '',
  numero_serie: '',
  ip: '',
  contador_inicial: 0,
  status: 'Estoque', // Corrigido para corresponder ao padrão do banco
  cliente_id: '',
  local_instalacao_id: '',
};

const EquipmentList: React.FC = () => {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [clientes, setClientes] = useState<ClienteDropdown[]>([]);
  const [locais, setLocais] = useState<LocalDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para o Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<Equipamento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEquipamentos = async () => {
    try {
      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('tb_equipamentos')
        .select(`
          *,
          tb_clientes (razao_social),
          tb_locais_instalacao!local_instalacao_id (nome_local)
        `)
        .order('modelo', { ascending: true });

      if (sbError) throw sbError;
      setEquipamentos(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data } = await supabase.from('tb_clientes').select('id, razao_social').order('razao_social', { ascending: true });
      setClientes(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(errorMsg);
    }
  };

  const fetchLocaisDoCliente = async (clienteId: string) => {
    try {
      setLoadingLocais(true);
      const { data } = await supabase
        .from('tb_locais_instalacao')
        .select('id, nome_local')
        .eq('cliente_id', clienteId)
        .order('nome_local', { ascending: true });
      setLocais(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(errorMsg);
    } finally {
      setLoadingLocais(false);
    }
  };

  useEffect(() => {
    fetchEquipamentos();
    fetchClientes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'cliente_id') {
      if (!value) {
        setLocais([]);
        setFormData((prev) => ({ ...prev, local_instalacao_id: '' }));
      } else {
        fetchLocaisDoCliente(value);
      }
    }
  };

  // ---- CRUD: CREATE ----
  const handleOpenCreateModal = () => {
    setEditingEquip(null);
    setFormData({ ...INITIAL_FORM });
    setLocais([]);
    setError(null);
    setIsModalOpen(true);
  };

  // ---- CRUD: EDIT ----
  const handleOpenEditModal = (equip: Equipamento) => {
    setEditingEquip(equip);
    setFormData({
      marca: equip.marca,
      modelo: equip.modelo,
      numero_serie: equip.numero_serie,
      ip: equip.ip || '',
      contador_inicial: equip.contador_inicial,
      status: equip.status,
      cliente_id: equip.cliente_id || '',
      local_instalacao_id: equip.local_instalacao_id || '',
    });
    if (equip.cliente_id) {
      fetchLocaisDoCliente(equip.cliente_id);
    } else {
      setLocais([]);
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmitEquipamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Mapeamento EXATO para o banco de dados
    const payload = {
      marca: formData.marca,
      modelo: formData.modelo,
      numero_serie: formData.numero_serie,
      ip: formData.ip || null,
      contador_inicial: Number(formData.contador_inicial),
      status: formData.status,
      cliente_id: formData.cliente_id === '' ? null : formData.cliente_id,
      local_instalacao_id: formData.local_instalacao_id === '' ? null : formData.local_instalacao_id,
    };

    try {
      if (editingEquip) {
        const { error } = await supabase.from('tb_equipamentos').update(payload).eq('id', editingEquip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tb_equipamentos').insert([payload]);
        if (error) throw error;
      }

      setFormData({ ...INITIAL_FORM });
      setEditingEquip(null);
      setIsModalOpen(false);
      fetchEquipamentos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg || 'Erro ao salvar equipamento.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- CRUD: DELETE ----
  const handleDeleteEquipamento = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      const { error } = await supabase.from('tb_equipamentos').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchEquipamentos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Parque de Máquinas</h3>
          <p className="text-slate-500 text-xs mt-0.5">Rastreamento de ativos e alocações geográficas/setoriais.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
          + Novo Equipamento
        </button>
      </div>

      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg text-sm border border-red-200">⚠️ Erro: {error}</div>}

      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Mapeando parque tecnológico...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Modelo / Marca</th>
                <th className="px-6 py-3">Nº de Série / IP</th>
                <th className="px-6 py-3">Cliente / Local de Instalação</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {equipamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum equipamento listado.</td>
                </tr>
              ) : (
                equipamentos.map((equip) => (
                  <tr key={equip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{equip.modelo}</div>
                      <div className="text-xs text-slate-400">{equip.marca}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-slate-600 font-medium">{equip.numero_serie}</div>
                      <div className="text-xs text-slate-400 font-mono">{equip.ip || 'Sem IP'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {equip.tb_clientes?.razao_social ? (
                        <div>
                          <span className="text-slate-900 font-semibold">{equip.tb_clientes.razao_social}</span>
                          <span className="block text-xs text-blue-600 font-medium mt-0.5">
                            📍 {equip.tb_locais_instalacao?.nome_local || 'Ponto não especificado'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded text-xs">Disponível em Estoque</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        equip.status === 'Em Campo' ? 'bg-emerald-100 text-emerald-800' :
                        equip.status === 'Manutenção' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {equip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(equip)}
                        className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-semibold border border-amber-200 transition-all"
                        title="Editar equipamento"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(equip)}
                        className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-semibold border border-red-200 transition-all"
                        title="Excluir equipamento"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
              {editingEquip ? 'Editar Equipamento' : 'Cadastrar Equipamento'}
            </h3>

            <form onSubmit={handleSubmitEquipamento} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Marca *</label>
                  <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" placeholder="Ex: Brother, HP" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Modelo *</label>
                  <input type="text" name="modelo" value={formData.modelo} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" placeholder="Ex: DCP-8157DN" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Número de Série *</label>
                  <input type="text" name="numero_serie" value={formData.numero_serie} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">IP de Rede</label>
                  <input type="text" name="ip" value={formData.ip} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" placeholder="192.168.1.50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Contador Inicial</label>
                  <input type="number" name="contador_inicial" value={formData.contador_inicial} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Status Operacional</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200">
                    <option value="Estoque">Em Estoque</option>
                    <option value="Em Campo">Em Campo</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase">Vincular a um Cliente</label>
                  <select name="cliente_id" value={formData.cliente_id} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200">
                    <option value="">Nenhum (Manter em Estoque)</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.razao_social}</option>
                    ))}
                  </select>
                </div>

                {formData.cliente_id && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase">Ponto de Instalação / Setor</label>
                    <select
                      name="local_instalacao_id"
                      value={formData.local_instalacao_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200"
                    >
                      <option value="">-- Selecione o Local deste Cliente --</option>
                      {loadingLocais ? (
                        <option disabled>Carregando pontos mapeados...</option>
                      ) : locais.length === 0 ? (
                        <option value="">Nenhum ponto cadastrado para este cliente</option>
                      ) : (
                        locais.map((l) => (
                          <option key={l.id} value={l.id}>{l.nome_local}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingEquip(null); }} className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
                  {isSaving ? 'Gravando...' : editingEquip ? 'Atualizar Equipamento' : 'Salvar Equipamento'}
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
              <h3 className="text-lg font-bold text-slate-800">Excluir Equipamento</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir <strong className="text-slate-700">{deleteTarget.modelo}</strong>?
              </p>
              <p className="text-xs text-slate-400">S/N: {deleteTarget.numero_serie}</p>
              <p className="text-xs text-red-500 mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-2 border-t">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
              <button type="button" onClick={handleDeleteEquipamento} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;