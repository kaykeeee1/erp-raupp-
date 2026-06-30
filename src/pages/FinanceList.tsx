import React, { useEffect, useState, useMemo } from 'react';
import { fiscalService } from '../services/fiscalService';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, 
  CheckCircle2, AlertCircle, XCircle, FileText, Search
} from 'lucide-react';

interface ClientShort {
  razao_social: string;
}

interface LancamentoFinanceiro {
  id: string;
  descricao: string;
  tipo: 'Receita' | 'Despesa';
  valor: number;
  status: 'Pendente' | 'Pago' | 'Cancelado';
  data_vencimento: string;
  data_pagamento: string | null;
  nota_fiscal_id: string | null;
  cliente_id: string | null;
  criado_em: string;
  tb_clientes: ClientShort | null;
}

const FinanceList: React.FC = () => {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Pago' | 'Cancelado'>('Todos');

  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fiscalService.getLancamentosFinanceiros();
      setLancamentos(data as LancamentoFinanceiro[]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar lançamentos financeiros.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLancamentos();
  }, []);

  const handleMarcarComoPago = async (id: string) => {
    try {
      setError(null);
      await fiscalService.updateFinanceiroStatus(id, 'Pago');
      fetchLancamentos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar status do lançamento.';
      setError(errorMsg);
    }
  };

  const handleCancelarLancamento = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar este lançamento financeiro?')) return;
    try {
      setError(null);
      await fiscalService.updateFinanceiroStatus(id, 'Cancelado');
      fetchLancamentos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao cancelar lançamento.';
      setError(errorMsg);
    }
  };

  // Cálculos de Totais
  const resumoFinanceiro = useMemo(() => {
    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach((item) => {
      if (item.status?.toLowerCase() === 'cancelado') return;
      
      if (item.tipo === 'Receita') {
        receitas += item.valor;
      } else {
        despesas += item.valor;
      }
    });

    return {
      receitas,
      despesas,
      saldo: receitas - despesas
    };
  }, [lancamentos]);

  // Filtragem dos dados
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((item) => {
      const matchesSearch = item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.tb_clientes?.razao_social && item.tb_clientes.razao_social.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTipo = tipoFilter === 'Todos' || item.tipo === tipoFilter;
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;

      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [lancamentos, searchTerm, tipoFilter, statusFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    // Remove fuso horário para evitar bugs de conversão de data local
    const date = new Date(dateString.split('T')[0] + 'T12:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6">
      {/* HEADER E TÍTULO */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 font-display">Fluxo de Caixa & Finanças</h3>
        <p className="text-slate-500 text-xs mt-0.5">Visão unificada das receitas de contratos e despesas de notas fiscais de entrada.</p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* Receitas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total em Faturamento</p>
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-1">
              R$ {resumoFinanceiro.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total de Despesas (Compras)</p>
            <h4 className="text-2xl font-extrabold text-orange-600 mt-1">
              R$ {resumoFinanceiro.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Resultado Operacional</p>
            <h4 className={`text-2xl font-extrabold mt-1 ${resumoFinanceiro.saldo >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              R$ {resumoFinanceiro.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className={`p-3 rounded-lg ${resumoFinanceiro.saldo >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-premium mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar lançamento ou cliente…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
            />
          </div>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as 'Todos' | 'Receita' | 'Despesa')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="Todos">Todos Lançamentos</option>
            <option value="Receita">Receitas (Entradas)</option>
            <option value="Despesa">Despesas (Saídas)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | 'Pendente' | 'Pago' | 'Cancelado')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="Todos">Todos Status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Pago">Pagos</option>
            <option value="Cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* LISTA FINANCEIRA */}
      {loading ? (
        <p className="p-6 text-slate-400 text-sm">Buscando lançamentos…</p>
      ) : filteredLancamentos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
          <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-medium">Nenhum lançamento financeiro localizado para estes filtros.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Descrição / Vínculo</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Pagamento</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredLancamentos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800 block">{item.descricao}</span>
                    {item.tb_clientes && (
                      <span className="text-xs text-slate-400 block mt-0.5">Cliente: {item.tb_clientes.razao_social}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-bold tabular-nums ${item.tipo === 'Receita' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(item.data_vencimento)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.data_pagamento ? (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{formatDate(item.data_pagamento)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      item.status?.toLowerCase() === 'pago' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : item.status?.toLowerCase() === 'cancelado'
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {item.status?.toLowerCase() === 'pago' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                      {item.status?.toLowerCase() === 'pendente' && <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />}
                      {item.status?.toLowerCase() === 'cancelado' && <XCircle className="w-3 h-3 text-slate-500 shrink-0" />}
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.status?.toLowerCase() === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleMarcarComoPago(item.id)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Dar Baixa (Pago)
                          </button>
                          <button
                            onClick={() => handleCancelarLancamento(item.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-xs font-semibold transition-colors cursor-pointer border border-rose-100"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {item.nota_fiscal_id && (
                        <div className="text-xs text-slate-400 self-center">
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          Vínculo Fiscal
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinanceList;
