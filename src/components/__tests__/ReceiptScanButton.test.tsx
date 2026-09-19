import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import type { ReceiptCandidate } from '@/api/types';
import type { PickedFile } from '@/lib/receipt';

const mockScanMutateAsync = jest.fn<Promise<ReceiptCandidate>, [unknown]>();
const mockPickReceiptImage = jest.fn<Promise<PickedFile | null>, [string]>();

let mockStatus: {
  enabled: boolean;
  quotas: Record<string, { limit: number | null; used: number; remaining: number | null }>;
} | null = null;
let mockScanPending = false;

jest.mock('@/api/queries', () => ({
  useAIStatus: () => ({ data: mockStatus }),
  useScanReceipt: () => ({ mutateAsync: mockScanMutateAsync, isPending: mockScanPending }),
}));

jest.mock('@/lib/receipt', () => {
  const actual = jest.requireActual('@/lib/receipt');
  return {
    ...actual,
    pickReceiptImage: (source: string) => mockPickReceiptImage(source),
  };
});

const FOTO: PickedFile = { uri: 'file:///tmp/recibo.jpg', name: 'recibo.jpg', type: 'image/jpeg' };

const CANDIDATA: ReceiptCandidate = {
  amount: '12.50',
  tax_amount: null,
  currency: 'USD',
  date: '2026-09-10',
  merchant: 'Super Selectos',
  description: 'Super Selectos',
  category: null,
  category_source: null,
  items: [],
  confidence: { amount: 'high', date: 'high', merchant: 'high' },
  possible_duplicates: [],
};

function conCuota(remaining: number, limit: number | null = 30) {
  mockStatus = { enabled: true, quotas: { receipt: { limit, used: 0, remaining } } };
}

describe('ReceiptScanButton', () => {
  beforeEach(() => {
    mockScanMutateAsync.mockReset();
    mockPickReceiptImage.mockReset();
    mockScanPending = false;
    conCuota(26);
  });

  it('no se muestra si el backend no tiene IA configurada', async () => {
    mockStatus = { enabled: false, quotas: {} };
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    expect(screen.queryByText('Escanear recibo')).toBeNull();
  });

  it('tampoco se muestra mientras no se sabe si hay IA', async () => {
    mockStatus = null;
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    expect(screen.queryByText('Escanear recibo')).toBeNull();
  });

  it('muestra cuánta cuota queda antes de que el usuario choque con el tope', async () => {
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    expect(screen.getByText('Te quedan 26 de 30 este mes.')).toBeTruthy();
  });

  it('con la cuota agotada el botón queda deshabilitado y dice por qué', async () => {
    conCuota(0);
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    await fireEvent.press(screen.getByText('Escanear recibo'));
    expect(mockPickReceiptImage).not.toHaveBeenCalled();
    expect(screen.getByText(/Se acabaron los recibos de este mes/)).toBeTruthy();
  });

  it('escanea la foto y devuelve la candidata junto con el archivo', async () => {
    mockPickReceiptImage.mockResolvedValue(FOTO);
    mockScanMutateAsync.mockResolvedValue(CANDIDATA);
    const onScanned = jest.fn();

    await render(<ReceiptScanButton walletId="w-1" onScanned={onScanned} />);
    await fireEvent.press(screen.getByText('Escanear recibo'));
    await fireEvent.press(screen.getByText('Tomar foto'));

    await waitFor(() => expect(onScanned).toHaveBeenCalledWith(CANDIDATA, FOTO));
    // La cartera viaja para que la respuesta traiga los posibles duplicados.
    expect(mockScanMutateAsync).toHaveBeenCalledWith({ file: FOTO, wallet: 'w-1' });
  });

  it('cancelar la cámara no manda nada a leer', async () => {
    mockPickReceiptImage.mockResolvedValue(null);
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    await fireEvent.press(screen.getByText('Escanear recibo'));
    await fireEvent.press(screen.getByText('Tomar foto'));
    expect(mockScanMutateAsync).not.toHaveBeenCalled();
  });

  it('muestra el motivo que manda el backend (429 de cuota, 503 de Gemini caído)', async () => {
    mockPickReceiptImage.mockResolvedValue(FOTO);
    mockScanMutateAsync.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 503, data: { detail: 'No se pudo leer el recibo ahora mismo.' } },
      }),
    );
    const onScanned = jest.fn();

    await render(<ReceiptScanButton walletId={null} onScanned={onScanned} />);
    await fireEvent.press(screen.getByText('Escanear recibo'));
    await fireEvent.press(screen.getByText('Tomar foto'));

    await waitFor(() =>
      expect(screen.getByText('No se pudo leer el recibo ahora mismo.')).toBeTruthy(),
    );
    // Un escaneo que falló no llena nada: el usuario sigue a mano.
    expect(onScanned).not.toHaveBeenCalled();
  });

  it('mientras lee, avisa en vez de dejar el botón como si no hubiera pasado nada', async () => {
    mockScanPending = true;
    await render(<ReceiptScanButton walletId={null} onScanned={jest.fn()} />);
    expect(screen.getByText('Leyendo el recibo...')).toBeTruthy();
  });
});
