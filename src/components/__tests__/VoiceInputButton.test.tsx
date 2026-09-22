import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { VoiceInputButton } from '@/components/VoiceInputButton';
import type { ParseCandidate } from '@/api/types';

const mockParseMutateAsync = jest.fn<Promise<ParseCandidate>, [unknown]>();
const mockRequestPermissions = jest.fn<Promise<{ granted: boolean }>, []>();
const mockPrepareToRecordAsync = jest.fn(async () => {});
const mockRecord = jest.fn();
const mockStop = jest.fn(async () => {});

let mockStatus: {
  enabled: boolean;
  quotas: Record<string, { limit: number | null; used: number; remaining: number | null }>;
} | null = null;
let mockParsePending = false;
let mockRecorderState: { isRecording: boolean; durationMillis: number } = {
  isRecording: false,
  durationMillis: 0,
};
let mockRecorderUri: string | null = 'file:///tmp/dictado.m4a';

jest.mock('@/api/queries', () => ({
  useAIStatus: () => ({ data: mockStatus }),
  useParseVoice: () => ({ mutateAsync: mockParseMutateAsync, isPending: mockParsePending }),
}));

jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: () => mockRequestPermissions() },
  RecordingPresets: { HIGH_QUALITY: { extension: '.m4a', web: { mimeType: 'audio/webm' } } },
  useAudioRecorder: () => ({
    prepareToRecordAsync: mockPrepareToRecordAsync,
    record: mockRecord,
    stop: mockStop,
    get uri() {
      return mockRecorderUri;
    },
  }),
  useAudioRecorderState: () => mockRecorderState,
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

const BOTON = 'Dictar la transacción';

function conCuota(remaining: number, limit: number | null = 50) {
  mockStatus = { enabled: true, quotas: { parse: { limit, used: 0, remaining } } };
}

describe('VoiceInputButton', () => {
  beforeEach(() => {
    mockParseMutateAsync.mockReset();
    mockRequestPermissions.mockReset();
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockPrepareToRecordAsync.mockClear();
    mockRecord.mockClear();
    mockStop.mockClear();
    mockParsePending = false;
    mockRecorderState = { isRecording: false, durationMillis: 0 };
    mockRecorderUri = 'file:///tmp/dictado.m4a';
    conCuota(48);
  });

  it('no se muestra si el backend no tiene IA configurada', async () => {
    mockStatus = { enabled: false, quotas: {} };
    await render(<VoiceInputButton walletId={null} onParsed={jest.fn()} />);
    expect(screen.queryByLabelText(BOTON)).toBeNull();
  });

  it('pide permiso y empieza a grabar al tocar el botón', async () => {
    await render(<VoiceInputButton walletId={null} onParsed={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText(BOTON));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockPrepareToRecordAsync).toHaveBeenCalled();
  });

  it('sin permiso de micrófono no arranca a grabar', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    await render(<VoiceInputButton walletId={null} onParsed={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText(BOTON));
    await waitFor(() => expect(screen.getByText('Sin permiso de micrófono.')).toBeTruthy());
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('con la cuota agotada no arranca a grabar y dice por qué', async () => {
    conCuota(0);
    await render(<VoiceInputButton walletId={null} onParsed={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText(BOTON));
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(screen.getByText(/Se acabaron los textos\/dictados de este mes/)).toBeTruthy();
  });

  it('mientras graba, tocar de nuevo detiene y manda el audio a leer', async () => {
    mockRecorderState = { isRecording: true, durationMillis: 4200 };
    mockParseMutateAsync.mockResolvedValue(CANDIDATA);
    const onParsed = jest.fn();

    await render(<VoiceInputButton walletId="w-1" onParsed={onParsed} />);
    expect(screen.getByText(/Grabando... 4s/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Detener grabación y enviar'));

    await waitFor(() => expect(onParsed).toHaveBeenCalledWith(CANDIDATA));
    expect(mockStop).toHaveBeenCalled();
    expect(mockParseMutateAsync).toHaveBeenCalledWith({
      file: { uri: 'file:///tmp/dictado.m4a', name: 'dictado.m4a', type: 'audio/mp4' },
      wallet: 'w-1',
    });
  });

  it('muestra el motivo que manda el backend si falla', async () => {
    mockRecorderState = { isRecording: true, durationMillis: 1000 };
    mockParseMutateAsync.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 503, data: { detail: 'No se pudo procesar el audio ahora mismo.' } },
      }),
    );
    const onParsed = jest.fn();

    await render(<VoiceInputButton walletId={null} onParsed={onParsed} />);
    await fireEvent.press(screen.getByLabelText('Detener grabación y enviar'));

    await waitFor(() =>
      expect(screen.getByText('No se pudo procesar el audio ahora mismo.')).toBeTruthy(),
    );
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('mientras se procesa el audio lo avisa', async () => {
    mockParsePending = true;
    await render(<VoiceInputButton walletId={null} onParsed={jest.fn()} />);
    expect(screen.getByText('Escuchando el audio...')).toBeTruthy();
  });
});
