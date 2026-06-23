import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Cliente {
  id: string;
  razao_social: string;
  cnpj: string;
  telefone: string;
  email: string;
  valor_franquia: number;
  franquia_paginas: number;
  valor_clique_excedente: number;
}

interface LocalInstalacao {
  id: string;
  nome_local: string;
  endereco: string;
  cidade: string;
}

const ClientList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do Modal de Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: '', cnpj: '', telefone: '', email: '',
    valor_franquia: '0', franquia_paginas: '0', valor_clique_excedente: '0',
  });

  // Estados do Modal de Múltiplos Locais
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [locais, setLocais] = useState<LocalInstalacao[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [localFormData, setLocalFormData] = useState({ nome_local: '', endereco: '', cidade: '' });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tb_clientes').select('*').order('razao_social', { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carrega os locais do cliente selecionado
  const fetchLocais = async (clienteId: string) => {
    try {
      setLoadingLocais(true);
      const { data, error } = await supabase
        .from('tb_locais_instalacao')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('nome_local', { ascending: true });
      
      if (error) throw error;
      setLocais(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar locais:', err.message);
    } finally {
      setLoadingLocais(false);
    }
  };

  const handleOpenLocaisModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    fetchLocais(cliente.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      ...formData,
      valor_franquia: Number(formData.valor_franquia),
      franquia_paginas: Number(formData.franquia_paginas),
      valor_clique_excedente: Number(formData.valor_clique_excedente),
    };

    try {
      const { error } = await supabase.from('tb_clientes').insert([payload]);
      if (error) throw error;
      setIsModalOpen(false);
      setFormData({
        razao_social: '', cnpj: '', telefone: '', email: '',
        valor_franquia: '0', franquia_paginas: '0', valor_clique_excedente: '0'
      });
      fetchClientes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    try {
      const payload = {
        cliente_id: selectedCliente.id,
        ...localFormData
      };
      
      const { error } = await supabase.from('tb_locais_instalacao').insert([payload]);
      if (error) throw error;

      setLocalFormData({ nome_local: '', endereco: '', cidade: '' });
      fetchLocais(selectedCliente.id); // Recarrega a lista interna de locais
    } catch (err: any) {
      alert('Erro ao salvar local: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Base de Clientes Contratantes</h3>
          <p className="text-slate-500 text-xs mt-0.5">Gestão de carteira, termos comerciais e pontos de instalação.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          + Novo Cliente
        </button>
      </div>

      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Buscando parceiros...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Razão Social / CNPJ</th>
                <th className="px-6 py-3">Franquia Contratada</th>
                <th className="px-6 py-3">Custo Clique Extra</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum cliente alocado.</td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.razao_social}</div>
                      <div className="text-xs text-slate-400 font-mono">{c.cnpj}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">R$ {c.valor_franquia?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-400">{c.franquia_paginas?.toLocaleString()} pág. inclusas</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      R$ {c.valor_clique_excedente?.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenLocaisModal(c)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-md text-xs font-semibold border border-slate-200 transition-all"
                      >
                        📍 Locais
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Cadastrar Novo Cliente</h3>
            <form onSubmit={handleCreateCliente} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Razão Social *</label>
                  <input type="text" name="razao_social" value={formData.razao_social} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">CNPJ *</label>
                  <input type="text" name="cnpj" value={formData.cnpj} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Telefone</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
              </div>
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100/80 space-y-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">⚙️ Parâmetros Contratuais</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Valor Franquia</label>
                    <input type="number" step="0.01" name="valor_franquia" value={formData.valor_franquia} onChange={handleInputChange} className="w-full px-2.5 py-1.5 mt-1 border rounded-md text-sm outline-none border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Qtd Franquia</label>
                    <input type="number" name="franquia_paginas" value={formData.franquia_paginas} onChange={handleInputChange} className="w-full px-2.5 py-1.5 mt-1 border rounded-md text-sm outline-none border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Clique Extra</label>
                    <input type="number" step="0.0001" name="valor_clique_excedente" value={formData.valor_clique_excedente} onChange={handleInputChange} className="w-full px-2.5 py-1.5 mt-1 border rounded-md text-sm outline-none border-slate-200" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">Salvar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOVO MODAL: GERENCIADOR DE MÚLTIPLOS LOCAIS POR CLIENTE */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pontos de Instalação / Setores</h3>
                <p className="text-xs text-slate-500 mt-0.5">Defina os locais físicos para: <span className="font-semibold text-blue-600">{selectedCliente.razao_social}</span></p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            {/* Form de Cadastro de novo local rápido */}
            <form onSubmit={handleCreateLocal} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">+ Adicionar Novo Ponto/Setor</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Identificação *</label>
                  <input type="text" name="nome_local" value={localFormData.nome_local} onChange={handleLocalInputChange} required placeholder="Ex: Filial Norte / RH" className="w-full px-2.5 py-1.5 mt-1 border bg-white rounded-md text-xs outline-none border-slate-200" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Endereço / Bloco</label>
                  <input type="text" name="endereco" value={localFormData.endereco} onChange={handleLocalInputChange} placeholder="Av. Central, 450" className="w-full px-2.5 py-1.5 mt-1 border bg-white rounded-md text-xs outline-none border-slate-200" />
                </div>
                <div className="col-span-1 flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Cidade</label>
                    <input type="text" name="cidade" value={localFormData.cidade} onChange={handleLocalInputChange} placeholder="São Paulo" className="w-full px-2.5 py-1.5 mt-1 border bg-white rounded-md text-xs outline-none border-slate-200" />
                  </div>
                  <button type="submit" className="px-4 py-1.5 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-slate-900 transition-colors h-[31px]">
                    Inserir
                  </button>
                </div>
              </div>
            </form>

            {/* Listagem de locais existentes criados para este cliente */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locais Mapeados</h4>
              {loadingLocais ? (
                <p className="text-xs text-slate-400 italic">Buscando pontos cadastrados...</p>
              ) : locais.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-lg text-center border border-dashed">Este cliente ainda não possui pontos de instalação específicos. Use o formulário acima.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                  {locais.map((l) => (
                    <div key={l.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50/50 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{l.nome_local}</div>
                        <div className="text-slate-400 text-[11px]">{l.endereco ? `${l.endereco} - ` : ''}{l.cidade || 'Cidade não informada'}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium border border-blue-100">Ativo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button type="button" onClick={() => setSelectedCliente(null)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;