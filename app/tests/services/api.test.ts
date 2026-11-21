import { ApiError, createApi, toUserMessage } from '../../src/services/api';

describe('createApi', () => {
  it('calls the callable by name with the input', async () => {
    const call = jest.fn().mockResolvedValue({ sent: true, expiresInSeconds: 900 });
    const api = createApi(call);

    await expect(api.requestLoginCode({ email: 'a@b.co' })).resolves.toEqual({
      sent: true,
      expiresInSeconds: 900,
    });
    expect(call).toHaveBeenCalledWith('requestLoginCode', { email: 'a@b.co' });
  });

  it.each([
    [
      'verifyLoginCode',
      (api: ReturnType<typeof createApi>) =>
        api.verifyLoginCode({ email: 'a@b.co', code: '123456' }),
    ],
    [
      'completeProfile',
      (api: ReturnType<typeof createApi>) => api.completeProfile({ displayName: 'Ana' }),
    ],
    [
      'resolveRegion',
      (api: ReturnType<typeof createApi>) =>
        api.resolveRegion({ source: 'manual', ibgeCode: '3550308' }),
    ],
    [
      'listMunicipalities',
      (api: ReturnType<typeof createApi>) => api.listMunicipalities({ state: 'SP' }),
    ],
    [
      'submitVotes',
      (api: ReturnType<typeof createApi>) =>
        api.submitVotes({
          regionId: '3550308',
          localDate: '2026-11-21',
          votes: [{ targetPeriod: 'manha', value: 1 }],
        }),
    ],
    [
      'getForecast',
      (api: ReturnType<typeof createApi>) =>
        api.getForecast({ regionId: '3550308', localDate: '2026-11-21', periods: ['manha'] }),
    ],
    ['deleteAccount', (api: ReturnType<typeof createApi>) => api.deleteAccount()],
  ])('routes %s', async (name, invoke) => {
    const call = jest.fn().mockResolvedValue({ ok: true });
    await invoke(createApi(call));
    expect(call).toHaveBeenCalledWith(name, expect.anything());
  });

  it('wraps errors in ApiError without the functions/ prefix', async () => {
    const call = jest.fn().mockRejectedValue({
      code: 'functions/permission-denied',
      details: { reason: 'expired' },
    });
    const error = await createApi(call)
      .verifyLoginCode({ email: 'a@b.co', code: '123456' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'permission-denied', reason: 'expired' });
  });
});

describe('toUserMessage', () => {
  it.each([
    [
      new ApiError('permission-denied', { reason: 'invalid_code' }),
      'Código incorreto. Confira o e-mail e tente novamente.',
    ],
    [
      new ApiError('permission-denied', { reason: 'expired' }),
      'Este código expirou. Peça um novo código.',
    ],
    [
      new ApiError('permission-denied', { reason: 'locked' }),
      'Muitas tentativas erradas. Peça um novo código.',
    ],
    [new ApiError('resource-exhausted', null), 'Muitas solicitações. Tente novamente mais tarde.'],
    [new ApiError('unauthenticated', null), 'Sua sessão expirou. Entre novamente.'],
    [new ApiError('weird', null), 'Algo deu errado. Tente novamente.'],
    [new Error('boom'), 'Algo deu errado. Tente novamente.'],
  ])('maps %p', (error, message) => {
    expect(toUserMessage(error)).toBe(message);
  });
});
