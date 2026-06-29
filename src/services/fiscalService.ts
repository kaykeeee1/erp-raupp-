import { supabase } from '../lib/supabase';
import { estoqueService } from './estoqueService';

export interface XmlInvoiceItem {
  nome: string;
  codigo_barras: string;
  quantidade: number;
  valor_unitario: number;
  categoria: 'Toner' | 'Peça' | 'Cilindro' | 'Unidade de Fusor' | 'Unidade de Imagem';
}

export interface ParsedInvoiceXml {
  numero_nf: string;
  chave_acesso: string;
  fornecedor_nome: string;
  data_emissao: string;
  valor_bruto: number;
  itens: XmlInvoiceItem[];
}

export const fiscalService = {
  /**
   * Faz o parsing client-side de um arquivo XML de NF-e
   */
  parseInvoiceXml(xmlContent: string): ParsedInvoiceXml {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Verifica erros no parser
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Formato XML inválido ou corrompido.');
    }

    // 1. Número da NF-e (<ide><nNF>)
    const nNFNode = xmlDoc.querySelector('ide > nNF');
    const numero_nf = nNFNode?.textContent ? `NF-${nNFNode.textContent}` : `NF-XML-${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Chave de acesso (Atributo Id de <infNFe> ou tag <chNFe>)
    const infNFeNode = xmlDoc.querySelector('infNFe');
    let chave_acesso = '';
    if (infNFeNode) {
      const idAttr = infNFeNode.getAttribute('Id');
      if (idAttr) {
        chave_acesso = idAttr.replace('NFe', '');
      }
    }
    if (!chave_acesso) {
      const chNFNode = xmlDoc.querySelector('protNFe chNFe');
      chave_acesso = chNFNode?.textContent || Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    }

    // 3. Fornecedor/Emitente (<emit><xNome>)
    const emitNomeNode = xmlDoc.querySelector('emit > xNome');
    const fornecedor_nome = emitNomeNode?.textContent || 'Fornecedor Não Identificado';

    // 4. Data de Emissão (<ide><dhEmi>)
    const dhEmiNode = xmlDoc.querySelector('ide > dhEmi');
    const data_emissao = dhEmiNode?.textContent || new Date().toISOString();

    // 5. Valor Bruto Total da NF-e (<total><ICMSTot><vNF>)
    const vNFNode = xmlDoc.querySelector('total > ICMSTot > vNF');
    const valor_bruto = vNFNode?.textContent ? parseFloat(vNFNode.textContent) : 0;

    // 6. Parsing dos Itens (<det>)
    const detNodes = xmlDoc.querySelectorAll('det');
    const itens: XmlInvoiceItem[] = [];

    detNodes.forEach((detNode) => {
      const xProd = detNode.querySelector('prod > xProd')?.textContent || '';
      const cEAN = detNode.querySelector('prod > cEAN')?.textContent || '';
      const qCom = detNode.querySelector('prod > qCom')?.textContent || '0';
      const vUnCom = detNode.querySelector('prod > vUnCom')?.textContent || '0';

      const qty = parseFloat(qCom);
      const val = parseFloat(vUnCom);

      // Descobre a categoria baseando-se no nome do produto
      let categoria: 'Toner' | 'Peça' | 'Cilindro' | 'Unidade de Fusor' | 'Unidade de Imagem' = 'Peça';
      const lowercaseName = xProd.toLowerCase();
      if (lowercaseName.includes('toner') || lowercaseName.includes('cartucho de tinta')) {
        categoria = 'Toner';
      } else if (lowercaseName.includes('fusor') || lowercaseName.includes('fuser')) {
        categoria = 'Unidade de Fusor';
      } else if (lowercaseName.includes('imagem') || lowercaseName.includes('image')) {
        categoria = 'Unidade de Imagem';
      } else if (lowercaseName.includes('cilindro') || lowercaseName.includes('drum') || lowercaseName.includes('fotocondutor')) {
        categoria = 'Cilindro';
      }

      itens.push({
        nome: xProd,
        codigo_barras: cEAN && cEAN !== 'SEM GTIN' ? cEAN : '',
        quantidade: qty,
        valor_unitario: val,
        categoria
      });
    });

    return {
      numero_nf,
      chave_acesso,
      fornecedor_nome,
      data_emissao,
      valor_bruto,
      itens
    };
  },

  /**
   * Sincroniza os itens de uma nota de compra com o estoque (tb_estoque).
   * Incrementa quantidades de itens existentes ou os cria caso não existam.
   */
  async syncInvoiceWithInventory(itens: XmlInvoiceItem[]): Promise<void> {
    for (const item of itens) {
      let matchedItem = null;

      // 1. Tenta buscar pelo código de barras no banco de dados se ele existir
      if (item.codigo_barras) {
        matchedItem = await estoqueService.getItemByBarcode(item.codigo_barras);
      }

      // 2. Se não encontrou pelo código de barras, tenta buscar pelo nome exato do produto
      if (!matchedItem) {
        const { data } = await supabase
          .from('tb_estoque')
          .select('*')
          .eq('item_nome', item.nome)
          .maybeSingle();
        
        matchedItem = data;
      }

      if (matchedItem) {
        // Se encontrou o item, incrementa a quantidade
        await estoqueService.incrementarQuantidade(matchedItem.id, item.quantidade);
      } else {
        // Se não encontrou, cadastra o item no estoque
        await estoqueService.adicionarItem({
          item_nome: item.nome,
          categoria: item.categoria,
          quantidade_atual: item.quantidade,
          quantidade_minima: Math.ceil(item.quantidade * 0.2), // Define limite mínimo padrão (20% do recebido)
          codigo_barras: item.codigo_barras || undefined,
          modelo_compativel: 'Importado de NF-e / XML'
        });
      }
    }
  },

  /**
   * Cadastra uma nova Nota Fiscal no banco de dados
   */
  async salvarNotaFiscal(payload: {
    numero_nf: string;
    chave_acesso?: string;
    fornecedor_nome?: string;
    tipo_nota: string;
    valor_bruto: number;
    xml_raw?: string;
    data_emissao: string;
    cliente_id?: string | null;
    metadados_fiscais?: any;
  }): Promise<void> {
    const { error } = await supabase
      .from('tb_notas_fiscais')
      .insert([payload]);

    if (error) throw error;
  },

  /**
   * Retorna os lançamentos financeiros da tabela tb_financeiro
   */
  async getLancamentosFinanceiros(): Promise<any[]> {
    const { data, error } = await supabase
      .from('tb_financeiro')
      .select('*, tb_clientes(razao_social)')
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Altera o status de pagamento de um lançamento financeiro
   */
  async updateFinanceiroStatus(id: string, status: 'Pendente' | 'Pago' | 'Cancelado', dataPagamento?: string): Promise<void> {
    const payload: any = { status };
    if (status === 'Pago') {
      payload.data_pagamento = dataPagamento || new Date().toISOString();
    } else {
      payload.data_pagamento = null;
    }

    const { error } = await supabase
      .from('tb_financeiro')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  }
};
