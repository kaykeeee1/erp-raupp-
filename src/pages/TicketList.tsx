import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Chamado {
  id: string;
  descricao_problema: string;
  prioridade: string;
  status: string;
  solucao_tecnica: string | null;
  criado_em: string;
  tb_clientes: { razao_social: string } | null;
  tb_locais_instalacao: { nome_local: string } | null;
  tb_equipamentos: { modelo: string; numero_serie: string } | null;
}

interface ClienteDropdown { id: string; razao_social: string; }
interface LocalDropdown { id: string; nome_local: string; }
interface EquipamentoDropdown { id: string; modelo: string; numero_serie: string; }

const TicketList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [clientes, setClientes] = useState<ClienteDropdown[]>([]);
  const [locais, setLocais] = useState<LocalDropdown[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDropdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null); // Para encerrar chamado
  const [solucaoText, setSolucaoText] = useState('');
  
  const [formData, setFormData] = useState({
    cliente_id: '', local_id: '', equipamento_id: '', descricao_problema: '', prioridade: 'Média'
  });

  const fetchChamados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_chamados')
        .select('*, tb_clientes(razao_social), tb_locais_instalacao(nome_local), tb_equipamentos(modelo, numero_serie)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setChamados(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from('tb_clientes').select('id, razao_social').order('razao_social', { ascending: true });
    if (data) setClientes(data);
  };

  const fetchDadosDoCliente = async (clienteId: string) => {
    // Busca locais
    const { data: locaisData } = await supabase.from('tb_locais_instalacao').select('id, nome_local').eq('cliente_id', clienteId);
    setLocais(locaisData || []);
    
    // Busca impressoras alocadas neste cliente
    const { data: equipData } = await supabase.from('tb_equipamentos').select('id, modelo, numero_serie').eq('cliente_id', clienteId);
    setEquipamentos(equipData || []);
  };

  useEffect(() => {
    fetchChamados();
    fetchClientes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'cliente_id') {
      if (!value) {
        setLocais([]);
        setEquipamentos([]);
        setFormData(prev => ({ ...prev, local_id: '', equipamento_id: '' }));
      } else {
        fetchDadosDoCliente(value);
      }
    }
  };

  const handleAbrirChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        local_id: formData.local_id || null,
        equipamento_id: formData.equipamento_id || null
      };

      const { error } = await supabase.from('tb_chamados').insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ cliente_id: '', local_id: '', equipamento_id: '', descricao_problema: '', prioridade: 'Média' });
      fetchChamados();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(errorMsg);
    }
  };

  const handleEncerrarChamado = async () => {
    if (!selectedChamado) return;
    try {
      const { error } = await supabase
        .from('tb_chamados')
        .update({
          status: 'Concluído',
          solucao_tecnica: solucaoText,
          encerrado_em: new Date().toISOString()
        })
        .eq('id', selectedChamado.id);

      if (error) throw error;
      setSelectedChamado(null);
      setSolucaoText('');
      fetchChamados();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(errorMsg);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Chamados Técnicos & OS</h3>
          <p className="text-slate-500 text-xs mt-0.5">Controle de manutenção corretiva, preventiva e suporte técnico.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ cliente_id: '', local_id: '', equipamento_id: '', descricao_problema: '', prioridade: 'Média' });
            setLocais([]);
            setEquipamentos([]);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm rounded-lg"
        >
          + Abrir Chamado (OS)
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Carregando fila de suporte...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Data / Protocolo</th>
                <th className="px-6 py-3">Cliente / Local</th>
                <th className="px-6 py-3">Equipamento</th>
                <th className="px-6 py-3">Problema / Prioridade</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {chamados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum chamado pendente na fila.</td>
                </tr>
              ) : (
                chamados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                      <span className="block text-[10px] text-slate-400">ID: {item.id.substring(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.tb_clientes?.razao_social}</div>
                      <div className="text-xs text-slate-500">📍 {item.tb_locais_instalacao?.nome_local || 'Não especificado'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.tb_equipamentos ? (
                        <div>
                          <div className="font-medium text-slate-800">{item.tb_equipamentos.modelo}</div>
                          <div className="text-xs font-mono text-slate-400">S/N: {item.tb_equipamentos.numero_serie}</div>
                        </div>
                      ) : <span className="text-slate-400 italic">Geral (Sem máquina)</span>}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="truncate text-slate-800" title={item.descricao_problema}>{item.descricao_problema}</div>
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                        item.prioridade === 'Crítica' || item.prioridade === 'Alta' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-600'
                      }`}>{item.prioridade}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'Aberto' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.status === 'Aberto' ? (
                        <button 
                          onClick={() => setSelectedChamado(item)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded transition-all"
                        >
                          ✓ Fechar OS
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Concluído</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: ABERTURA DE CHAMADO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Abertura de Chamado Técnico</h3>
            <form onSubmit={handleAbrirChamado} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Cliente Solicitante *</label>
                <select name="cliente_id" value={formData.cliente_id} onChange={handleInputChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200">
                  <option value="">-- Selecione o Cliente --</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.razao_social}</option>))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Local / Filial</label>
                  <select name="local_id" value={formData.local_id} onChange={handleInputChange} disabled={!formData.cliente_id} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200 disabled:opacity-50">
                    <option value="">-- Todos / Geral --</option>
                    {locais.map((l) => (<option key={l.id} value={l.id}>{l.nome_local}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Impressora Alvo</label>
                  <select name="equipamento_id" value={formData.equipamento_id} onChange={handleInputChange} disabled={!formData.cliente_id} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200 disabled:opacity-50">
                    <option value="">-- Nenhuma / Problema Geral --</option>
                    {equipamentos.map((e) => (<option key={e.id} value={e.id}>{e.modelo} (S/N: {e.numero_serie})</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Gravidade / Prioridade *</label>
                <select name="prioridade" value={formData.prioridade} onChange={handleInputChange} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200">
                  <option value="Baixa">Baixa (Dúvidas/Suporte simples)</option>
                  <option value="Média">Média (Defeito intermitente)</option>
                  <option value="Alta">Alta (Máscara parando o setor)</option>
                  <option value="Crítica">Crítica (Faturamento parado)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Relato do Cliente (Defeito) *</label>
                <textarea name="descricao_problema" value={formData.descricao_problema} onChange={handleInputChange} required rows={3} placeholder="Descreva os sintomas relatados pelo cliente..." className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200 resize-none" />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700">Registrar Ordem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENCERRAMENTO DE CHAMADO / LAUDO TÉCNICO */}
      {selectedChamado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Baixa de Ordem de Serviço</h3>
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border">
              <div><strong>Cliente:</strong> {selectedChamado.tb_clientes?.razao_social}</div>
              <div><strong>Problema:</strong> {selectedChamado.descricao_problema}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Solução Aplicada / Laudo Técnico *</label>
              <textarea 
                value={solucaoText} 
                onChange={(e) => setSolucaoText(e.target.value)} 
                required 
                rows={4} 
                placeholder="Ex: Efetuada a troca do rolete de tração de papel e limpeza do vidro do scanner. Equipamento testado e operacional." 
                className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200 resize-none" 
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setSelectedChamado(null)} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg">Voltar</button>
              <button 
                type="button" 
                onClick={handleEncerrarChamado} 
                disabled={!solucaoText.trim()} 
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg font-medium disabled:opacity-50 hover:bg-emerald-700"
              >
                Concluir Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketList;