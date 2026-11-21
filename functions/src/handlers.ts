/**
 * Ligação dos casos de uso com o runtime do Firebase (callables e job agendado).
 * Sem regra de negócio aqui: toda lógica está nos módulos testados.
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger as firebaseLogger } from 'firebase-functions';
import { createClock } from './infra/clock';
import { getAdminAuth, getDb } from './infra/firestore';
import { createLogger } from './infra/logger';
import type { Deps } from './infra/deps';
import type { AuthContext } from './infra/session-guard';
import { createOpenMeteoProvider } from './weather/open-meteo-client';
import { requestLoginCode } from './auth/request-login-code';
import { verifyLoginCode } from './auth/verify-login-code';
import { completeProfile } from './auth/complete-profile';
import { deleteAccount } from './auth/delete-account';
import { resolveRegion, listMunicipalities } from './regions/resolve-region';
import { submitVotes } from './votes/submit-votes';
import { getForecast } from './weather/get-forecast';
import { runClosePeriods } from './analysis/close-periods';

setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

const OTP_PEPPER = defineSecret('OTP_PEPPER');
const OPEN_METEO_BASE_URL = defineString('OPEN_METEO_BASE_URL', {
  default: 'https://api.open-meteo.com',
});
const OPEN_METEO_API_KEY = defineString('OPEN_METEO_API_KEY', { default: '' });

const logger = createLogger((severity, entry) => {
  const { event, ...fields } = entry;
  const message = String(event);
  if (severity === 'ERROR') firebaseLogger.error(message, fields);
  else if (severity === 'WARNING') firebaseLogger.warn(message, fields);
  else firebaseLogger.info(message, fields);
});

function buildDeps(): Deps {
  const apiKey = OPEN_METEO_API_KEY.value();
  return {
    db: getDb(),
    auth: getAdminAuth(),
    clock: createClock(),
    logger,
    otpPepper: OTP_PEPPER.value(),
    weather: createOpenMeteoProvider({
      baseUrl: OPEN_METEO_BASE_URL.value(),
      ...(apiKey ? { apiKey } : {}),
    }),
  };
}

function toAuth(request: CallableRequest): AuthContext | undefined {
  return request.auth ? { uid: request.auth.uid, token: request.auth.token } : undefined;
}

const callableOptions = { secrets: [OTP_PEPPER], enforceAppCheck: false };

type PublicHandler<T> = (deps: Deps, data: unknown) => Promise<T>;
type AuthedHandler<T> = (deps: Deps, auth: AuthContext | undefined, data: unknown) => Promise<T>;

const publicCallable = <T>(handler: PublicHandler<T>) =>
  onCall(callableOptions, (request) => handler(buildDeps(), request.data));

const authedCallable = <T>(handler: AuthedHandler<T>) =>
  onCall(callableOptions, (request) => handler(buildDeps(), toAuth(request), request.data));

export const requestLoginCodeFn = publicCallable((deps, data) => requestLoginCode(deps, data));
export const verifyLoginCodeFn = publicCallable(verifyLoginCode);
export const completeProfileFn = authedCallable(completeProfile);
export const resolveRegionFn = authedCallable((deps, auth, data) =>
  resolveRegion(deps, auth, data),
);
export const listMunicipalitiesFn = authedCallable((deps, auth, data) =>
  listMunicipalities(deps, auth, data),
);
export const submitVotesFn = authedCallable(submitVotes);
export const getForecastFn = authedCallable(getForecast);
export const deleteAccountFn = authedCallable(deleteAccount);

export const closePeriodsFn = onSchedule(
  { schedule: 'every 15 minutes', timeoutSeconds: 540, maxInstances: 1, secrets: [OTP_PEPPER] },
  async () => runClosePeriods(buildDeps()),
);
