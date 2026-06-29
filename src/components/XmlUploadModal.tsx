import React, { useState } from 'react';
import { fiscalService } from '../services/fiscalService';
import type { ParsedInvoiceXml } from '../services/fiscalService';
import { X, Upload, Check, AlertTriangle, FileText, ShoppingCart } from 'lucide-react';

interface XmlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const XmlUploadModal: React.FC<XmlUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoiceXml | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
      setError('Por favor, selecione um arquivo XML válido.');
      return;
    }

    setError(null);
    setParsedData(null);
    setXmlContent(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = fiscalService.parseInvoiceXml(content);
        setXmlContent(content);
        setParsedData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar o arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmarImportacao = async () => {
    if (!parsedData || !xmlContent) return;

    try {
      setIsProcessing(true);
      setError(null);

      // 1. Salva a Nota Fiscal de Entrada no banco de dados
      // Nota: campo cliente_id é null para compras/notas de entrada (pois o parceiro é o fornecedor)
      await fiscalService.salvarNotaFiscal({
        numero_nf: parsedData.numero_nf,
        chave_acesso: parsedData.chave_acesso,
        fornecedor_nome: parsedData.fornecedor_nome,
        tipo_nota: 'Entrada',
        valor_bruto: parsedData.valor_bruto,
        xml_raw: xmlContent,
        data_emissao: parsedData.data_emissao,
        cliente_id: null,
        metadados_fiscais: {
          fonte: 'Importação de XML',
          total_itens: parsedData.itens.length,
          lei_regencia: 'Nova Regra Tributária (IVA Dual 2026)',
          ibs_calculado: parsedData.valor_bruto * 0.041,
          cbs_calculado: parsedData.valor_bruto * 0.088
        }
      });

      // 2. Sincroniza os itens da nota com o estoque
      await fiscalService.syncInvoiceWithInventory(parsedData.itens);

      onSuccess(`Nota ${parsedData.numero_nf} importada com sucesso! Estoque e contas a pagar atualizados.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados da nota.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-premium border border-slate-200 w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-brand-primary" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Importar Nota Fiscal (XML)</h4>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* DRAG & DROP / FILE INPUT */}
          {!parsedData && (
            <div className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-xl p-8 text-center bg-slate-50 hover:bg-blue-50/20 transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".xml"
                aria-label="Selecionar arquivo XML da nota fiscal"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-brand-primary mx-auto mb-3 transition-colors" />
              <p className="text-slate-700 font-semibold text-sm">Arraste seu arquivo XML ou clique para navegar</p>
              <p className="text-slate-400 text-xs mt-1">Suporta arquivos XML padrão NF-e ou NFS-e</p>
            </div>
          )}

          {/* PARSED DATA PREVIEW */}
          {parsedData && (
            <div className="space-y-6">
              {/* Resumo da Nota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-wide mb-0.5">Número Documento</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{parsedData.numero_nf}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-wide mb-0.5">Emitente / Fornecedor</span>
                  <span className="font-semibold text-slate-800 text-sm">{parsedData.fornecedor_nome}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-wide mb-0.5">Valor Bruto NF</span>
                  <span className="font-extrabold text-brand-primary text-sm">
                    R$ {parsedData.valor_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block uppercase font-bold tracking-wide mb-0.5">Chave de Acesso</span>
                  <span className="font-mono text-slate-600 block truncate">{parsedData.chave_acesso}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold tracking-wide mb-0.5">Data Emissão</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(parsedData.data_emissao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Tabela de Itens Extraídos */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Produtos / Insumos no XML</h5>
                </div>
                
                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                        <th className="px-4 py-2.5">Nome do Item</th>
                        <th className="px-4 py-2.5">Categoria</th>
                        <th className="px-4 py-2.5 text-right">Qtd</th>
                        <th className="px-4 py-2.5 text-right">Unitário</th>
                        <th className="px-4 py-2.5">Cód. Barras (GTIN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedData.itens.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/40">
                          <td className="px-4 py-2 font-semibold text-slate-800 max-w-xs truncate">{item.nome}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.categoria === 'Toner' 
                                ? 'bg-blue-50 text-blue-700' 
                                : item.categoria === 'Cilindro'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-orange-50 text-orange-700'
                            }`}>
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold tabular-nums">{item.quantidade}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600 tabular-nums">
                            R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-400">{item.codigo_barras || 'Sem código'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="text-slate-400 text-[10px] font-bold flex items-center space-x-1 uppercase">
            <FileText className="w-3.5 h-3.5" />
            <span>IVA Dual IBS/CBS será computado automaticamente</span>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            {parsedData && (
              <button
                onClick={handleConfirmarImportacao}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Importar Nota & Itens</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default XmlUploadModal;
