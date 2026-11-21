// Nomes exportados = nomes das Cloud Functions (contracts/callable-functions.md e scheduled-jobs.md).
export {
  requestLoginCodeFn as requestLoginCode,
  verifyLoginCodeFn as verifyLoginCode,
  completeProfileFn as completeProfile,
  resolveRegionFn as resolveRegion,
  listMunicipalitiesFn as listMunicipalities,
  submitVotesFn as submitVotes,
  getForecastFn as getForecast,
  deleteAccountFn as deleteAccount,
  closePeriodsFn as closePeriods,
} from './handlers';
