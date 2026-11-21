import type {
  GetForecastInput,
  GetForecastOutput,
  ListMunicipalitiesOutput,
  LoginDeniedReason,
  OkOutput,
  RequestLoginCodeOutput,
  ResolveRegionInput,
  ResolveRegionOutput,
  SubmitVotesInput,
  SubmitVotesOutput,
  VerifyLoginCodeOutput,
} from '@vai-chover/shared';

/** Executa uma callable pelo nome (injetável para testes). */
export type CallFn = (name: string, data: unknown) => Promise<unknown>;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly details: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }

  get reason(): string | undefined {
    const details = this.details as { reason?: string } | null | undefined;
    return details?.reason;
  }
}

export interface Api {
  requestLoginCode(input: { email: string; displayName?: string }): Promise<RequestLoginCodeOutput>;
  verifyLoginCode(input: { email: string; code: string }): Promise<VerifyLoginCodeOutput>;
  completeProfile(input: { displayName: string }): Promise<OkOutput>;
  resolveRegion(input: ResolveRegionInput): Promise<ResolveRegionOutput>;
  listMunicipalities(input: { state: string }): Promise<ListMunicipalitiesOutput>;
  submitVotes(input: SubmitVotesInput): Promise<SubmitVotesOutput>;
  getForecast(input: GetForecastInput): Promise<GetForecastOutput>;
  deleteAccount(): Promise<OkOutput>;
}

export function createApi(call: CallFn): Api {
  const invoke = async <T>(name: string, data: unknown): Promise<T> => {
    try {
      return (await call(name, data)) as T;
    } catch (error) {
      const { code = 'unknown', details } = error as { code?: string; details?: unknown };
      throw new ApiError(code.replace(/^functions\//, ''), details);
    }
  };
  return {
    requestLoginCode: (input) => invoke('requestLoginCode', input),
    verifyLoginCode: (input) => invoke('verifyLoginCode', input),
    completeProfile: (input) => invoke('completeProfile', input),
    resolveRegion: (input) => invoke('resolveRegion', input),
    listMunicipalities: (input) => invoke('listMunicipalities', input),
    submitVotes: (input) => invoke('submitVotes', input),
    getForecast: (input) => invoke('getForecast', input),
    deleteAccount: () => invoke('deleteAccount', {}),
  };
}

const LOGIN_MESSAGES: Record<LoginDeniedReason, string> = {
  invalid_code: 'Código incorreto. Confira o e-mail e tente novamente.',
  expired: 'Este código expirou. Peça um novo código.',
  locked: 'Muitas tentativas erradas. Peça um novo código.',
};

const INTERNAL_MESSAGE = 'Algo deu errado. Tente novamente.';

const CODE_MESSAGES: Record<string, string> = {
  'resource-exhausted': 'Muitas solicitações. Tente novamente mais tarde.',
  'invalid-argument': 'Confira os dados informados.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  'not-found': 'Não encontramos sua cidade. Escolha-a na lista.',
  unavailable: 'Sem conexão com o servidor. Verifique sua internet.',
};

/** Mensagem em pt-BR para o usuário; nunca expõe detalhes internos. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'permission-denied' && error.reason) {
      return LOGIN_MESSAGES[error.reason as LoginDeniedReason] ?? LOGIN_MESSAGES.invalid_code;
    }
    return CODE_MESSAGES[error.code] ?? INTERNAL_MESSAGE;
  }
  return INTERNAL_MESSAGE;
}
