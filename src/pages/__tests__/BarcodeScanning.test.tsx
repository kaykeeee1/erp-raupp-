import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockManagement from '../StockManagement';
import { estoqueService } from '../../services/estoqueService';

// Mock do estoqueService
vi.mock('../../services/estoqueService', () => {
  const mockService = {
    estoqueService: {
      getEstoque: vi.fn(),
      adicionarItem: vi.fn(),
      updateQuantidade: vi.fn(),
      updateItem: vi.fn(),
      deletarItem: vi.fn(),
      getItemByBarcode: vi.fn(),
      incrementarQuantidade: vi.fn(),
    }
  };
  return mockService;
});

const mockGetEstoque = vi.mocked(estoqueService.getEstoque);
const mockGetItemByBarcode = vi.mocked(estoqueService.getItemByBarcode);
const mockIncrementarQuantidade = vi.mocked(estoqueService.incrementarQuantidade);

const mockEstoqueData = [
  {
    id: 'e1',
    item_nome: 'Toner HP CF283A (83A)',
    categoria: 'Toner' as const,
    quantidade_atual: 12,
    quantidade_minima: 5,
    modelo_compativel: 'HP LaserJet Pro M127fn',
    codigo_barras: '7891234567890',
  }
];

describe('BarcodeScanning Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEstoque.mockResolvedValue(mockEstoqueData);
  });

  it('deve incrementar o estoque em +1 ao bipar um produto cadastrado', async () => {
    const user = userEvent.setup();
    mockGetItemByBarcode.mockResolvedValue(mockEstoqueData[0]);
    mockIncrementarQuantidade.mockResolvedValue();

    render(<StockManagement />);
    
    // Aguarda carregar dados
    expect(await screen.findByText('Toner HP CF283A (83A)')).toBeInTheDocument();

    // Digita o código de barras no input do bipador
    const barcodeInput = screen.getByPlaceholderText('Bipar EAN…');
    await user.type(barcodeInput, '7891234567890');

    // Clica no botão Bipar
    const submitBtn = screen.getByRole('button', { name: /bipar/i });
    await user.click(submitBtn);

    // Verifica se buscou no banco de dados e incrementou
    expect(mockGetItemByBarcode).toHaveBeenCalledWith('7891234567890');
    expect(mockIncrementarQuantidade).toHaveBeenCalledWith('e1', 1);

    // Verifica se o toast de sucesso está na tela
    expect(await screen.findByText(/1 unidade de "Toner HP CF283A \(83A\)" adicionada/i)).toBeInTheDocument();
  });

  it('deve abrir o modal de cadastro pré-preenchido ao bipar um produto inédito', async () => {
    const user = userEvent.setup();
    mockGetItemByBarcode.mockResolvedValue(null); // Produto não cadastrado

    render(<StockManagement />);
    
    // Aguarda carregar dados
    expect(await screen.findByText('Toner HP CF283A (83A)')).toBeInTheDocument();

    // Digita um código novo
    const barcodeInput = screen.getByPlaceholderText('Bipar EAN…');
    await user.type(barcodeInput, '7899999999999');

    // Clica no botão Bipar
    const submitBtn = screen.getByRole('button', { name: /bipar/i });
    await user.click(submitBtn);

    // Abre o modal de cadastro automaticamente
    expect(await screen.findByText('Cadastrar Novo Insumo')).toBeInTheDocument();

    // O campo código de barras do formulário deve vir pré-preenchido
    const formBarcodeField = screen.getByLabelText('Código de Barras (EAN)') as HTMLInputElement;
    expect(formBarcodeField.value).toBe('7899999999999');
  });
});
