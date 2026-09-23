import { captureReferralFromUrl, getPendingReferral, useReferralStore } from '../referral';
import { useAuthStore } from '../auth';
import * as authApi from '@/api/auth';

jest.mock('@/api/auth', () => ({
  register: jest.fn(async () => ({ id: 'u1' })),
  loginWithGoogle: jest.fn(async () => ({ user: { id: 'u1' }, created: true })),
}));

describe('referral store', () => {
  beforeEach(async () => {
    await useReferralStore.persist.rehydrate();
    useReferralStore.getState().clear();
    jest.clearAllMocks();
  });

  it('guarda el ref de un enlace entrante, normalizado', () => {
    captureReferralFromUrl('https://porksupuesto.app/?ref=ana30');
    expect(getPendingReferral()).toBe('ANA30');
  });

  it('el primer enlace gana y un enlace sin ref no cambia nada', () => {
    captureReferralFromUrl('https://porksupuesto.app/?ref=PRIMERO');
    captureReferralFromUrl('https://porksupuesto.app/register?ref=SEGUNDO');
    captureReferralFromUrl('https://porksupuesto.app/login');
    expect(getPendingReferral()).toBe('PRIMERO');
  });

  it('vence a los 30 días', () => {
    useReferralStore.setState({ code: 'VIEJO', capturedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 });
    expect(getPendingReferral()).toBeNull();
    captureReferralFromUrl('https://porksupuesto.app/?ref=NUEVO');
    expect(getPendingReferral()).toBe('NUEVO');
  });

  it('registrarse manda el código y lo borra', async () => {
    captureReferralFromUrl('https://porksupuesto.app/?ref=ANA30');
    await useAuthStore.getState().signUp({ username: 'a', email: 'a@x.com', password: 'x'.repeat(10) });
    expect(authApi.register).toHaveBeenCalledWith(expect.objectContaining({ ref: 'ANA30' }));
    expect(getPendingReferral()).toBeNull();
  });

  it('Google lo manda, pero solo lo borra si la cuenta se creó', async () => {
    captureReferralFromUrl('https://porksupuesto.app/?ref=ANA30');
    (authApi.loginWithGoogle as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' }, created: false });
    await useAuthStore.getState().signInWithGoogle('token');
    expect(authApi.loginWithGoogle).toHaveBeenCalledWith('token', 'ANA30');
    expect(getPendingReferral()).toBe('ANA30');

    await useAuthStore.getState().signInWithGoogle('token');
    expect(getPendingReferral()).toBeNull();
  });
});
