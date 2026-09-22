import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ChatScreen from '@/app/(app)/chat';
import type { ChatAnswer } from '@/api/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
}));

const mockAskMutateAsync = jest.fn<Promise<ChatAnswer>, [string]>();

let mockStatus: {
  enabled: boolean;
  quotas: Record<string, { limit: number | null; used: number; remaining: number | null }>;
} | null = null;
let mockAskPending = false;

jest.mock('@/api/queries', () => ({
  useAIStatus: () => ({ data: mockStatus }),
  useAskChat: () => ({ mutateAsync: mockAskMutateAsync, isPending: mockAskPending }),
}));

const CAMPO = 'Escribir una pregunta';

function conCuota(remaining: number, limit: number | null = 20) {
  mockStatus = { enabled: true, quotas: { chat: { limit, used: 0, remaining } } };
}

describe('ChatScreen', () => {
  beforeEach(() => {
    mockAskMutateAsync.mockReset();
    mockAskPending = false;
    conCuota(18);
  });

  it('sin IA en el backend muestra el aviso en vez del chat', async () => {
    mockStatus = { enabled: false, quotas: {} };
    await render(<ChatScreen />);
    expect(screen.getByText('Esta función todavía no está disponible.')).toBeTruthy();
    expect(screen.queryByLabelText(CAMPO)).toBeNull();
  });

  it('muestra cuánta cuota queda antes de que el usuario choque con el tope', async () => {
    await render(<ChatScreen />);
    expect(screen.getByText('Te quedan 18 de 20 preguntas este mes.')).toBeTruthy();
  });

  it('manda la pregunta y agrega la respuesta a la conversación', async () => {
    mockAskMutateAsync.mockResolvedValue({
      answer: 'Gastaste 45.00 USD en Comida en septiembre.',
      function_used: 'spending_by_category',
    });

    await render(<ChatScreen />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), '¿cuánto gasté en comida?');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(screen.getByText('¿cuánto gasté en comida?')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText('Gastaste 45.00 USD en Comida en septiembre.')).toBeTruthy(),
    );
    expect(mockAskMutateAsync).toHaveBeenCalledWith('¿cuánto gasté en comida?');
    // El campo se limpia tras mandarla.
    expect(screen.getByLabelText(CAMPO).props.value).toBe('');
  });

  it('con la cuota agotada el campo queda deshabilitado y dice por qué', async () => {
    conCuota(0);
    await render(<ChatScreen />);
    expect(screen.getByLabelText(CAMPO).props.editable).toBe(false);
    expect(screen.getByText(/Se acabaron las preguntas de este mes/)).toBeTruthy();
  });

  it('si falla, deja la pregunta en el campo para reintentar sin volver a tipearla', async () => {
    mockAskMutateAsync.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 503, data: { detail: 'No se pudo responder ahora mismo.' } },
      }),
    );

    await render(<ChatScreen />);
    await fireEvent.changeText(screen.getByLabelText(CAMPO), '¿cuánto gasté?');
    await fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() => expect(screen.getByText('No se pudo responder ahora mismo.')).toBeTruthy());
    // La pregunta vuelve al campo para reintentar, no queda colgada como
    // mensaje fallido en la conversación (que vuelve a estar vacía).
    expect(screen.getByLabelText(CAMPO).props.value).toBe('¿cuánto gasté?');
    expect(
      screen.getByText('Preguntá algo como "¿cuánto gasté en comida este mes?" o "¿qué tengo programado esta semana?".'),
    ).toBeTruthy();
  });

  it('mientras espera la respuesta lo avisa', async () => {
    mockAskPending = true;
    await render(<ChatScreen />);
    expect(screen.getByText('Pensando...')).toBeTruthy();
  });

  it('sin texto no aparece el botón de enviar', async () => {
    await render(<ChatScreen />);
    expect(screen.queryByText('Enviar')).toBeNull();
  });
});
