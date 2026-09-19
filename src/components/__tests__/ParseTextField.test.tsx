import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ParseTextField } from '@/components/ParseTextField';
import type { ParseCandidate } from '@/api/types';

const mockParseMutateAsync = jest.fn<Promise<ParseCandidate>, [unknown]>();

let mockStatus: {
  enabled: boolean;
  quotas: Record<string, { limit: number | null; used: number; remaining: number | null }>;
} | null = null;
let mockParsePending = false;

jest.mock('@/api/queries', () => ({
  useAIStatus: () => ({ data: mockStatus }),
  useParseText: () => ({ mutateAsync: mockParseMutateAsync, isPending: mockParsePending }),
}));

const CANDIDATA: ParseCandidate = {
  type: 'expense',
  amount: '12.50',
  currency: 'USD',
  date: '2026-09-18',
  merchant: 'Super Selectos',
  description: 'almuerzo',
  wallet: null,
  wallet_source: null,
  category: null,
  category_source: null,
  confidence: { amount: 'high', date: 'high', merchant: 'high' },
  possible_duplicates: [],
};

const CAMPO = 'Describir la transacción en una línea';

function conCuota(remaining: number, limit: number | null = 50) {
  mockStatus = { enabled: true, quotas: { parse: { limit, used: 0, remaining } } };
}

describe('ParseTextField', () => {
  beforeEach(() => {
    mockParseMutateAsync.mockReset();
    mockParsePending = false;
    conCuota(48);
  });

  it('no se muestra si el backend no tiene IA configurada', async () => {
    mockStatus = { enabled: false, quotas: {} };
    await render(<ParseTextField walletId={null} onParsed={jest.fn()} />);
    expect(screen.queryByLabelText(CAMPO)).toBeNull();
  });

  it('parsea la frase y devuelve la candidata', async () => {
    mockParseMutateAsync.mockResolvedValue(CANDIDATA);
    const onParsed = jest.fn();

    await render(<ParseTextField walletId="w-1" onParsed={onParsed} />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), 'gasté 12.50 en almuerzo');
    await fireEvent.press(screen.getByText('Leer'));

    await waitFor(() => expect(onParsed).toHaveBeenCalledWith(CANDIDATA));
    // La cartera viaja para buscar duplicados cuando la frase no nombra una.
    expect(mockParseMutateAsync).toHaveBeenCalledWith({
      text: 'gasté 12.50 en almuerzo',
      wallet: 'w-1',
    });
  });

  it('no manda una frase vacía', async () => {
    await render(<ParseTextField walletId={null} onParsed={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), '    ');
    // Sin texto no aparece el botón: no hay nada que leer.
    expect(screen.queryByText('Leer')).toBeNull();
    expect(mockParseMutateAsync).not.toHaveBeenCalled();
  });

  it('con la cuota agotada no deja escribir y dice por qué', async () => {
    conCuota(0);
    await render(<ParseTextField walletId={null} onParsed={jest.fn()} />);
    expect(screen.getByLabelText(CAMPO).props.editable).toBe(false);
    expect(screen.getByText(/Se acabaron los textos de este mes/)).toBeTruthy();
  });

  it('si falla deja la frase escrita para reintentar sin volver a tipearla', async () => {
    mockParseMutateAsync.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 503, data: { detail: 'No se pudo leer la frase ahora mismo.' } },
      }),
    );
    const onParsed = jest.fn();

    await render(<ParseTextField walletId={null} onParsed={onParsed} />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), 'gasté 12.50');
    await fireEvent.press(screen.getByText('Leer'));

    await waitFor(() =>
      expect(screen.getByText('No se pudo leer la frase ahora mismo.')).toBeTruthy(),
    );
    expect(screen.getByLabelText(CAMPO).props.value).toBe('gasté 12.50');
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('limpia la frase sólo cuando sirvió', async () => {
    mockParseMutateAsync.mockResolvedValue(CANDIDATA);
    await render(<ParseTextField walletId={null} onParsed={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), 'gasté 12.50');
    await fireEvent.press(screen.getByText('Leer'));

    await waitFor(() => expect(screen.getByLabelText(CAMPO).props.value).toBe(''));
  });

  it('mientras lee no deja mandar otra vez la misma frase', async () => {
    mockParsePending = true;
    await render(<ParseTextField walletId={null} onParsed={jest.fn()} />);
    expect(screen.getByLabelText(CAMPO).props.editable).toBe(false);
  });
});
