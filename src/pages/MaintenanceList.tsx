import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { estoqueService } from '../services/estoqueService';
import type { EstoqueItem } from '../services/estoqueService';

interface OSBancada {
  id: string;
  is_avulso: boolean;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  defeito_relatado: string;
  diagnostico_tecnico: string | null;
  status: string;
  valor_pecas: number;
  valor_mao_de_obra: number;
  valor_total: number;
  tecnico_responsavel: string | null;
  criado_em: string;
  tb_clientes: { razao_social: string; cpf_cnpj: string } | null; // CORREÇÃO AQUI
  tb_equipamentos: { modelo: string; numero_serie: string } | null;
}

interface ClienteDropdown { id: string; razao_social: string; }
interface EquipamentoDropdown { id: string; modelo: string; numero_serie: string; }

const MaintenanceList: React.FC = () => {
  const [ordens, setOrdens] = useState<OSBancada[]>([]);
  const [clientes, setClientes] = useState<ClienteDropdown[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDropdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OSBancada | null>(null);
  const [osToPrint, setOsToPrint] = useState<OSBancada | null>(null);

  // Formulário Nova OS
  const [isAvulso, setIsAvulso] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '', equipamento_id: '',
    marca: '', modelo: '', numero_serie: '',
    defeito_relatado: ''
  });

  // Formulário Atualização/Laudo
  const [laudoData, setLaudoData] = useState({
    status: 'Em Manutenção', diagnostico_tecnico: '', valor_pecas: '0', valor_mao_de_obra: '0', peca_id: ''
  });

  // Peças carregadas do estoque
  const [pecasEstoque, setPecasEstoque] = useState<EstoqueItem[]>([]);

  const fetchOrdens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_os_bancada')
        // CORREÇÃO: Trocado 'cnpj' por 'cpf_cnpj' no select
        .select('*, tb_clientes(razao_social, cpf_cnpj), tb_equipamentos(modelo, numero_serie)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setOrdens(data || []);
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

  const fetchEquipamentosDoCliente = async (id: string) => {
    const { data } = await supabase.from('tb_equipamentos').select('id, modelo, numero_serie').eq('cliente_id', id);
    if (data) setEquipamentos(data);
  };

  const fetchPecas = async () => {
    try {
      const data = await estoqueService.getEstoque();
      setPecasEstoque(data.filter((item) => item.categoria === 'Peça'));
    } catch (err) {
      console.error('Erro ao carregar peças do estoque:', err);
    }
  };

  useEffect(() => {
    fetchOrdens();
    fetchClientes();
    fetchPecas();
  }, []);

  const handleOpenLaudo = (os: OSBancada) => {
    setSelectedOS(os);
    setLaudoData({
      status: os.status,
      diagnostico_tecnico: os.diagnostico_tecnico || '',
      valor_pecas: os.valor_pecas.toString(),
      valor_mao_de_obra: os.valor_mao_de_obra.toString(),
      peca_id: ''
    });
    fetchPecas();
  };

  const handleAbrirOS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const operador = user?.user_metadata?.nome || user?.email || 'Técnico Interno';

      const payload = {
        cliente_id: formData.cliente_id,
        is_avulso: isAvulso,
        equipamento_id: isAvulso ? null : (formData.equipamento_id || null),
        marca: isAvulso ? formData.marca : null,
        modelo: isAvulso ? formData.modelo : null,
        numero_serie: isAvulso ? formData.numero_serie : null,
        defeito_relatado: formData.defeito_relatado,
        tecnico_responsavel: operador,
        status: 'Orçamento'
      };

      const { error } = await supabase.from('tb_os_bancada').insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ cliente_id: '', equipamento_id: '', marca: '', modelo: '', numero_serie: '', defeito_relatado: '' });
      fetchOrdens();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(errorMsg);
    }
  };

  const handleAtualizarOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;

    const pecas = Number(laudoData.valor_pecas) || 0;
    const maoObra = Number(laudoData.valor_mao_de_obra) || 0;
    const total = pecas + maoObra;

    try {
      // Se selecionou uma peça de reposição do estoque, realiza a baixa
      if (laudoData.peca_id) {
        const selectedPeca = pecasEstoque.find((p) => p.id === laudoData.peca_id);
        if (selectedPeca) {
          if (selectedPeca.quantidade_atual <= 0) {
            alert(`A peça "${selectedPeca.item_nome}" está sem saldo em estoque.`);
            return;
          }
          await estoqueService.updateQuantidade(selectedPeca.id, selectedPeca.quantidade_atual - 1);
        }
      }

      const { error } = await supabase
        .from('tb_os_bancada')
        .update({
          status: laudoData.status,
          diagnostico_tecnico: laudoData.diagnostico_tecnico,
          valor_pecas: pecas,
          valor_mao_de_obra: maoObra,
          valor_total: total,
          finalizado_em: laudoData.status === 'Entregue' || laudoData.status === 'Pronto' ? new Date().toISOString() : null
        })
        .eq('id', selectedOS.id);

      if (error) throw error;
      setSelectedOS(null);
      fetchOrdens();
      fetchPecas();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(errorMsg);
    }
  };

  return (
    <div className="p-6">
      <style>{`
        @media print {
          aside, header, nav, button, .print\\:hidden {
            display: none !important;
          }
          body, main, .fixed, .bg-slate-50\\/50 {
            background: white !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          #secao-os-impressao {
            display: block !important;
            width: 100% !important;
            padding: 20mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @page {
          size: auto;
          margin: 0mm; 
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Manutenção em Bancada</h3>
          <p className="text-slate-500 text-xs mt-0.5">Controle de laboratório interno, orçamentos e consertos avulsos.</p>
        </div>
        <button 
          onClick={() => {
            setIsAvulso(false);
            setFormData({ cliente_id: '', equipamento_id: '', marca: '', modelo: '', numero_serie: '', defeito_relatado: '' });
            setEquipamentos([]);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          + Entrada de Máquina (OS)
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm p-6">Buscando ordens de bancada...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Criação</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Equipamento</th>
                <th className="px-6 py-3">Responsável</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Custo Total</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{new Date(os.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{os.tb_clientes?.razao_social}</td>
                  <td className="px-6 py-4">
                    {os.is_avulso ? (
                      <div>
                        <span className="font-medium text-slate-800">{os.modelo} ({os.marca})</span>
                        <span className="block text-[10px] text-amber-600 font-bold uppercase mt-0.5">⚠️ Particular</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-slate-800">{os.tb_equipamentos?.modelo}</span>
                        <span className="block text-xs text-slate-400 font-mono">S/N: {os.tb_equipamentos?.numero_serie}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 truncate max-w-[140px]" title={os.tecnico_responsavel || ''}>
                    {os.tecnico_responsavel || 'Não Informado'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      os.status === 'Orçamento' ? 'bg-amber-100 text-amber-800' :
                      os.status === 'Em Manutenção' ? 'bg-blue-100 text-blue-800' :
                      os.status === 'Pronto' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>{os.status}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold">
                    R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenLaudo(os)}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold transition-all"
                    >
                      🛠️ Editar
                    </button>
                    <button 
                      onClick={() => setOsToPrint(os)}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-xs font-bold border border-blue-200 transition-all"
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: ENTRADA DE EQUIPAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 border max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Nova OS de Oficina (Entrada)</h3>
            <form onSubmit={handleAbrirOS} className="space-y-4">
              
              <div className="flex space-x-6 p-2 bg-slate-50 rounded-lg border text-xs font-bold text-slate-600">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={!isAvulso} onChange={() => { setIsAvulso(false); if (formData.cliente_id) { fetchEquipamentosDoCliente(formData.cliente_id); } else { setEquipamentos([]); } }} className="text-blue-600" />
                  <span>Máquina do Contrato (Parque Raupp)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={isAvulso} onChange={() => { setIsAvulso(true); setEquipamentos([]); }} className="text-blue-600" />
                  <span>Máquina Própria do Cliente (Avulsa)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Cliente Dono *</label>
                <select 
                  value={formData.cliente_id} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, cliente_id: val, equipamento_id: '' }));
                    if (val && !isAvulso) {
                      fetchEquipamentosDoCliente(val);
                    } else {
                      setEquipamentos([]);
                    }
                  }} 
                  required 
                  className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                </select>
              </div>

              {!isAvulso ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Selecione a Impressora Recolhida *</label>
                  <select value={formData.equipamento_id} onChange={(e) => setFormData(prev => ({ ...prev, equipamento_id: e.target.value }))} required={!isAvulso} disabled={!formData.cliente_id} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none disabled:opacity-50">
                    <option value="">-- Selecione a Máquina --</option>
                    {equipamentos.map(e => <option key={e.id} value={e.id}>{e.modelo} (S/N: {e.numero_serie})</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Marca *</label>
                    <input type="text" value={formData.marca} onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))} required className="w-full px-2 py-1.5 mt-1 border rounded bg-white text-xs outline-none" placeholder="Brother" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Modelo *</label>
                    <input type="text" value={formData.modelo} onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))} required className="w-full px-2 py-1.5 mt-1 border rounded bg-white text-xs outline-none" placeholder="HL-L1212W" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nº Série</label>
                    <input type="text" value={formData.numero_serie} onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))} className="w-full px-2 py-1.5 mt-1 border rounded bg-white text-xs outline-none" placeholder="U6432..." />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Sintomas / Defeito Relatado *</label>
                <textarea value={formData.defeito_relatado} onChange={(e) => setFormData(prev => ({ ...prev, defeito_relatado: e.target.value }))} required rows={3} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none resize-none" placeholder="Descreva os sintomas..." />
              </div>

              <div className="flex justify-end space-x-3 border-t pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg font-medium">Registrar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LAUDO TÉCNICO */}
      {selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4 border max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Laudo e Evolução de Oficina</h3>
            <form onSubmit={handleAtualizarOS} className="space-y-4">
              <div>
                <label htmlFor="form_status_os" className="block text-xs font-bold text-slate-500 uppercase">Estágio da OS *</label>
                <select id="form_status_os" value={laudoData.status} onChange={(e) => setLaudoData(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none">
                  <option value="Orçamento">Aguardando Orçamento</option>
                  <option value="Aprovado">Orçamento Aprovado</option>
                  <option value="Em Manutenção">Em Manutenção (Na Bancada)</option>
                  <option value="Pronto">Pronto para Retirada</option>
                  <option value="Entregue">Entregue / Finalizado</option>
                  <option value="Sem Conserto">Sem Conserto / Devolvido</option>
                </select>
              </div>
              <div>
                <label htmlFor="form_peca_estoque" className="block text-xs font-bold text-slate-500 uppercase">Peça do Estoque (Baixa Automática)</label>
                <select
                  id="form_peca_estoque"
                  value={laudoData.peca_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLaudoData(prev => ({ ...prev, peca_id: val }));
                    const selected = pecasEstoque.find(p => p.id === val);
                    if (selected) {
                      setLaudoData(prev => ({
                        ...prev,
                        diagnostico_tecnico: prev.diagnostico_tecnico 
                          ? `${prev.diagnostico_tecnico}\n- Substituído: ${selected.item_nome}`
                          : `- Substituído: ${selected.item_nome}`
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200"
                >
                  <option value="">-- Nenhuma (Lançar valor manual) --</option>
                  {pecasEstoque.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantidade_atual <= 0}>
                      {p.item_nome} ({p.quantidade_atual} un. disp.)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="form_diagnostico" className="block text-xs font-bold text-slate-500 uppercase">Diagnóstico Técnico / Peças Trocadas</label>
                <textarea id="form_diagnostico" value={laudoData.diagnostico_tecnico} onChange={(e) => setLaudoData(prev => ({ ...prev, diagnostico_tecnico: e.target.value }))} rows={3} className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <label htmlFor="form_custo_pecas" className="block text-xs font-bold text-slate-500 uppercase">Custo de Peças (R$)</label>
                  <input id="form_custo_pecas" type="number" step="0.01" value={laudoData.valor_pecas} onChange={(e) => setLaudoData(prev => ({ ...prev, valor_pecas: e.target.value }))} className="w-full px-3 py-1.5 mt-1 border rounded-lg text-sm bg-white outline-none" />
                </div>
                <div>
                  <label htmlFor="form_mao_obra" className="block text-xs font-bold text-slate-500 uppercase">Mão de Obra (R$)</label>
                  <input id="form_mao_obra" type="number" step="0.01" value={laudoData.valor_mao_de_obra} onChange={(e) => setLaudoData(prev => ({ ...prev, valor_mao_de_obra: e.target.value }))} className="w-full px-3 py-1.5 mt-1 border rounded-lg text-sm bg-white outline-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 border-t pt-2">
                <button type="button" onClick={() => setSelectedOS(null)} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg">Voltar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg font-medium">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PREVIEW DO LAUDO COORDENADO PARA IMPRESSÃO */}
      {osToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-900 text-white rounded-t-xl flex justify-between items-center print:hidden">
              <div>
                <h4 className="font-bold text-sm">Visualização da Ordem de Serviço (Oficina)</h4>
                <p className="text-[11px] text-slate-400">Gere o documento oficial para anexar ao ativo ou entregar ao cliente.</p>
              </div>
              <button onClick={() => setOsToPrint(null)} className="text-slate-400 hover:text-white font-bold text-lg print:hidden">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 bg-white text-black" id="secao-os-impressao">
              
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">RAUPP SOLUÇÕES</h2>
                  <p className="text-xs text-slate-500 font-medium">Laboratório Especializado de Assistência Técnica</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordem de Serviço Eletrônica</h3>
                  <div className="font-mono font-bold text-base mt-1">OS-{osToPrint.id.substring(0, 8).toUpperCase()}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Abertura: {new Date(osToPrint.criado_em).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="my-6 p-4 bg-slate-50 rounded-lg border text-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Cliente / Proprietário</span>
                  <span className="font-bold text-slate-800 text-sm">{osToPrint.tb_clientes?.razao_social}</span>
                  {/* CORREÇÃO AQUI NO LAYOUT DE IMPRESSÃO */}
                  <span className="block text-[11px] text-slate-500 font-mono mt-0.5">CNPJ/CPF: {osToPrint.tb_clientes?.cpf_cnpj}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Equipamento / Ativo Identificado</span>
                  {osToPrint.is_avulso ? (
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{osToPrint.modelo} ({osToPrint.marca})</span>
                      <span className="block text-[10px] text-amber-600 font-bold uppercase font-mono mt-0.5">Equipamento Particular Exclusivo</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{osToPrint.tb_equipamentos?.modelo}</span>
                      <span className="block font-mono text-slate-500 text-[11px] mt-0.5">S/N: {osToPrint.tb_equipamentos?.numero_serie}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 border rounded-lg bg-white">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-1 mb-2">1. Triagem e Defeito Relatado</h4>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{osToPrint.defeito_relatado}</p>
                </div>

                <div className="p-4 border rounded-lg bg-white">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-1 mb-2">2. Parecer do Técnico e Peças Trocadas</h4>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {osToPrint.diagnostico_tecnico || "Equipamento em fase de análise de bancada e testes de estresse mecânico/eletrônico."}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-1">3. Quadro de Custos Descriminados</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-slate-600">Componentes e Peças Substituídas:</span>
                    <span className="font-mono font-semibold">R$ {osToPrint.valor_pecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-slate-600">Serviço Especializado de Mão de Obra:</span>
                    <span className="font-mono font-semibold">R$ {osToPrint.valor_mao_de_obra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed bg-slate-50 px-1 font-bold">
                    <span className="text-slate-700">Estado Atual da Ordem:</span>
                    <span className="text-blue-700 uppercase font-mono tracking-wider">{osToPrint.status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="bg-slate-900 text-white px-6 py-3 rounded-lg text-right min-w-[240px]">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">Investimento Total da OS</span>
                  <span className="text-xl font-black font-mono">R$ {osToPrint.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 mx-4 pt-2 font-bold text-slate-800 truncate">
                    {osToPrint.tecnico_responsavel || 'Técnico Não Informado'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Responsável Técnico / Emissor</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 mx-4 pt-2 font-medium text-slate-700">Autorizado / Recebido por</div>
                  <div className="text-[10px] text-slate-400 font-mono">Assinatura do Cliente</div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-3 rounded-b-xl print:hidden">
              <button 
                onClick={() => setOsToPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors print:hidden"
              >
                Fechar Painel
              </button>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors flex items-center space-x-1 print:hidden"
              >
                <span>🖨️</span> <span>Imprimir / Salvar PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceList;