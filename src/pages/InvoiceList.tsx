import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import XmlUploadModal from '../components/XmlUploadModal';

interface NotaFiscal {
  id: string;
  numero_nf: string;
  tipo_nota: string;
  valor_bruto: number;
  status: string;
  data_emissao: string;
  metadados_fiscais: {
    contador_anterior?: number;
    contador_atual?: number;
    paginas_excedentes?: number;
    cbs_calculado?: number;
    ibs_calculado?: number;
    lei_regencia?: string;
  };
  tb_clientes: {
    razao_social: string;
    cpf_cnpj: string;
    valor_franquia: number;
    franquia_paginas: number;
    valor_clique_excedente: number;
  } | null;
}

interface ClienteCompleto {
  id: string;
  razao_social: string;
  valor_franquia: number;
  franquia_paginas: number;
  valor_clique_excedente: number;
}

const InvoiceList: React.FC = () => {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [clientes, setClientes] = useState<ClienteCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<NotaFiscal | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [selectedCliente, setSelectedCliente] = useState<ClienteCompleto | null>(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_nota: 'Serviço',
    contador_anterior: '0',
    contador_atual: '0',
  });



  const fetchNotas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_notas_fiscais')
        .select('*, tb_clientes(razao_social, cpf_cnpj, valor_franquia, franquia_paginas, valor_clique_excedente)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setNotas(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('tb_clientes')
      .select('id, razao_social, valor_franquia, franquia_paginas, valor_clique_excedente')
      .order('razao_social', { ascending: true });
    if (data) setClientes(data);
  };

  useEffect(() => {
    fetchNotas();
    fetchClientes();
  }, []);

  const calculoPrevio = useMemo(() => {
    if (!selectedCliente) {
      return { totalImpresso: 0, excedente: 0, valorExcedente: 0, valorTotal: 0 };
    }
    const ant = Number(formData.contador_anterior) || 0;
    const atu = Number(formData.contador_atual) || 0;
    
    const totalImpresso = Math.max(0, atu - ant);
    const excedente = Math.max(0, totalImpresso - selectedCliente.franquia_paginas);
    const valorExcedente = excedente * selectedCliente.valor_clique_excedente;
    const valorTotal = selectedCliente.valor_franquia + valorExcedente;

    return { totalImpresso, excedente, valorExcedente, valorTotal };
  }, [formData.contador_anterior, formData.contador_atual, selectedCliente]);

  const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const cliente = clientes.find(c => c.id === id) || null;
    setSelectedCliente(cliente);
    setFormData(prev => ({ ...prev, cliente_id: id }));
  };

  const handleEmitirNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    setIsSaving(true);
    setError(null);

    const aliquotaCBS = 0.088; 
    const aliquotaIBS = 0.041; 

    const payload = {
      cliente_id: formData.cliente_id,
      tipo_nota: formData.tipo_nota,
      valor_bruto: calculoPrevio.valorTotal,
      numero_nf: `NF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Emitida',
      data_emissao: new Date().toISOString(),
      metadados_fiscais: {
        contador_anterior: Number(formData.contador_anterior),
        contador_atual: Number(formData.contador_atual),
        paginas_excedentes: calculoPrevio.excedente,
        cbs_calculado: calculoPrevio.valorTotal * aliquotaCBS,
        ibs_calculado: calculoPrevio.valorTotal * aliquotaIBS,
        lei_regencia: 'Nova Regra Tributária (IVA Dual 2026)',
      }
    };

    try {
      const { error } = await supabase.from('tb_notas_fiscais').insert([payload]);
      if (error) throw error;
      setIsModalOpen(false);
      setFormData({ cliente_id: '', tipo_nota: 'Serviço', contador_anterior: '0', contador_atual: '0' });
      setSelectedCliente(null);
      fetchNotas();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* CSS DE ALTA DEFINIÇÃO PARA IMPRESSÃO */}
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
          #secao-extrato-impressao {
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

      <XmlUploadModal 
        isOpen={isXmlModalOpen} 
        onClose={() => setIsXmlModalOpen(false)} 
        onSuccess={(msg) => {
          setSuccessToast(msg);
          fetchNotas();
          setTimeout(() => setSuccessToast(null), 5000);
        }}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 font-display">Faturamento Automatizado</h3>
          <p className="text-slate-500 text-xs mt-0.5">Fechamento de faturas com geração de extratos auditáveis para o cliente.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsXmlModalOpen(true)}
            className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-semibold text-xs rounded-lg border border-slate-200 cursor-pointer flex items-center space-x-1.5 uppercase tracking-wide"
          >
            <span>📥 Importar XML (Compra)</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm font-semibold text-xs rounded-lg cursor-pointer flex items-center space-x-1.5 uppercase tracking-wide"
          >
            <span>+ Novo Fechamento (Saída)</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <span>🚀</span>
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-800 font-bold ml-2">×</button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
        </div>
      )}

      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Buscando histórico fiscal…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Leituras</th>
                <th className="px-6 py-3">Excedente</th>
                <th className="px-6 py-3">Valor Bruto</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {notas.map((nota) => (
                <tr key={nota.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-900">{nota.numero_nf}</span>
                    <span className="block text-xs text-slate-400">{nota.tipo_nota}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {nota.tb_clientes?.razao_social || (nota as any).fornecedor_nome || 'Fornecedor/Cliente Não Identificado'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {nota.tipo_nota === 'Entrada' ? (
                      <span className="text-slate-400 italic">Compra de Insumos</span>
                    ) : (
                      `${(nota.metadados_fiscais.contador_anterior || 0).toLocaleString()} → ${(nota.metadados_fiscais.contador_atual || 0).toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {nota.tipo_nota === 'Entrada' ? (
                      <span className="text-slate-400 italic">Estoque Atualizado</span>
                    ) : nota.metadados_fiscais.paginas_excedentes && nota.metadados_fiscais.paginas_excedentes > 0 ? (
                      <span className="text-amber-600 font-semibold">+{nota.metadados_fiscais.paginas_excedentes.toLocaleString()} pág.</span>
                    ) : (
                      <span className="text-slate-400 italic">Na franquia</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 tabular-nums">
                    R$ {nota.valor_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {nota.tipo_nota === 'Entrada' ? (
                      <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100 font-semibold uppercase tracking-wider">
                        Nota de Entrada
                      </span>
                    ) : (
                      <button 
                        onClick={() => setInvoiceToPrint(nota)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold rounded text-xs border border-slate-200 transition-all cursor-pointer"
                      >
                        📄 Extrato PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE FECHAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Novo Fechamento de Contrato</h3>
            <form onSubmit={handleEmitirNota} className="space-y-4">
              <div>
                <label htmlFor="cliente_select" className="block text-xs font-bold text-slate-500 uppercase">Selecione o Cliente *</label>
                <select id="cliente_select" name="cliente_id" value={formData.cliente_id} onChange={handleClienteChange} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm bg-white outline-none border-slate-200">
                  <option value="">-- Buscar Cliente --</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.razao_social}</option>))}
                </select>
              </div>
              {selectedCliente && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600 border border-slate-200/60">
                  <span className="font-bold text-slate-700 block mb-1">📋 Termos Comerciais:</span>
                  <div>Franquia Base: R$ {selectedCliente.valor_franquia.toFixed(2)} ({selectedCliente.franquia_paginas.toLocaleString()} pág.)</div>
                  <div>Clique Extra: R$ {selectedCliente.valor_clique_excedente.toFixed(4)}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contador_anterior" className="block text-xs font-bold text-slate-500 uppercase">Contador Anterior *</label>
                  <input id="contador_anterior" type="number" name="contador_anterior" value={formData.contador_anterior} onChange={(e) => setFormData(prev => ({ ...prev, contador_anterior: e.target.value }))} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
                <div>
                  <label htmlFor="contador_atual" className="block text-xs font-bold text-slate-500 uppercase">Contador Atual *</label>
                  <input id="contador_atual" type="number" name="contador_atual" value={formData.contador_atual} onChange={(e) => setFormData(prev => ({ ...prev, contador_atual: e.target.value }))} required className="w-full px-3 py-2 mt-1 border rounded-lg text-sm outline-none border-slate-200" />
                </div>
              </div>
              {selectedCliente && (
                <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 space-y-2 text-xs">
                  <h4 className="font-bold uppercase text-emerald-800">Extrato do Fechamento</h4>
                  <div className="grid grid-cols-2 gap-y-1">
                    <div>Páginas Rodadas:</div><div className="font-bold text-right">{calculoPrevio.totalImpresso.toLocaleString()}</div>
                    <div>Páginas Excedentes:</div><div className="font-bold text-right text-amber-700">{calculoPrevio.excedente.toLocaleString()}</div>
                    <div className="border-t pt-1 font-bold text-sm">Total da Fatura:</div><div className="border-t pt-1 font-extrabold text-sm text-right">R$ {calculoPrevio.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedCliente(null); }} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSaving || !selectedCliente} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg">Emitir e Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DE EXTRATO DE LEITURA (PRE-IMPRESSÃO) */}
      {invoiceToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-900 text-white rounded-t-xl flex justify-between items-center print:hidden">
              <div>
                <h4 className="font-bold text-sm">Visualização do Demonstrativo Financeiro</h4>
                <p className="text-[11px] text-slate-400">Verifique as informações antes de imprimir ou gerar o arquivo PDF.</p>
              </div>
              <button onClick={() => setInvoiceToPrint(null)} className="text-slate-400 hover:text-white font-bold text-lg print:hidden">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 bg-white text-black" id="secao-extrato-impressao">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">RAUPP SOLUÇÕES</h2>
                  <p className="text-xs text-slate-500 font-medium">Outsourcing de Impressão e Ativos Tecnológicos</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demonstrativo de Medição</h3>
                  <div className="font-mono font-bold text-base mt-1">{invoiceToPrint.numero_nf}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Emissão: {new Date(invoiceToPrint.data_emissao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="my-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Razão Social do Contratante</span>
                  <span className="font-bold text-slate-800 text-sm">{invoiceToPrint.tb_clientes?.razao_social}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">CNPJ / Inscrição</span>
                  <span className="font-mono font-semibold text-slate-700">{invoiceToPrint.tb_clientes?.cpf_cnpj || 'Não Informado'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-1">1. Histórico de Bilhetagem e Contadores</h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                      <th className="p-2">Métrica Analisada</th>
                      <th className="p-2 text-right">Contador Anterior</th>
                      <th className="p-2 text-right">Contador Atual</th>
                      <th className="p-2 text-right">Total Produzido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b font-mono">
                    <tr>
                      <td className="p-2 font-sans font-medium text-slate-700">Volume de Cliques Monocromáticos (A4)</td>
                      <td className="p-2 text-right">{(invoiceToPrint.metadados_fiscais.contador_anterior || 0).toLocaleString()}</td>
                      <td className="p-2 text-right">{(invoiceToPrint.metadados_fiscais.contador_atual || 0).toLocaleString()}</td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {((invoiceToPrint.metadados_fiscais.contador_atual || 0) - (invoiceToPrint.metadados_fiscais.contador_anterior || 0)).toLocaleString()} pág.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 mt-8">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-1">2. Memória Descritiva de Cálculo Comercial</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-slate-600">Disponibilidade de Franquia Contratada (Até {invoiceToPrint.tb_clientes?.franquia_paginas.toLocaleString()} pág.):</span>
                    <span className="font-mono font-semibold">R$ {invoiceToPrint.tb_clientes?.valor_franquia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-slate-600">Excedente Produzido:</span>
                    <span className="font-mono font-semibold text-amber-700">+{invoiceToPrint.metadados_fiscais.paginas_excedentes?.toLocaleString()} páginas</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-slate-600">Tarifa por Página Excedente Pactuada:</span>
                    <span className="font-mono font-semibold">R$ {invoiceToPrint.tb_clientes?.valor_clique_excedente.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed bg-slate-50/50 px-1">
                    <span className="font-medium text-slate-700">Subtotal de Cliques Excedentes:</span>
                    <span className="font-mono font-bold text-slate-900">
                      R$ {((invoiceToPrint.metadados_fiscais.paginas_excedentes || 0) * (invoiceToPrint.tb_clientes?.valor_clique_excedente || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-slate-50 rounded text-[10px] text-slate-500 font-medium border border-slate-200">
                <strong>Informativo Fiscal:</strong> Faturamento apurado de acordo com as diretrizes do contrato ativo. Valores tributários estimados sob a regência do IVA Dual Composto (CBS: R$ {invoiceToPrint.metadados_fiscais.cbs_calculado?.toFixed(2)} | IBS: R$ {invoiceToPrint.metadados_fiscais.ibs_calculado?.toFixed(2)}).
              </div>

              <div className="mt-8 flex justify-end">
                <div className="bg-slate-900 text-white px-6 py-3 rounded-lg text-right min-w-[240px]">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">Total Geral da Fatura</span>
                  <span className="text-xl font-black font-mono">R$ {invoiceToPrint.valor_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-16 pt-6 border-t border-slate-300 text-center text-[10px] text-slate-400 font-mono flex justify-between">
                <span>ERP RAUPP - Sistema de Bilhetagem Eletrônica</span>
                <span>Raupp Soluções - Validação Técnica Interna</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-3 rounded-b-xl print:hidden">
              <button 
                onClick={() => setInvoiceToPrint(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors print:hidden"
              >
                Fechar Visualização
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

export default InvoiceList;
