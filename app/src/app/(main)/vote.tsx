import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import {
  getQuestionsFor,
  type Period,
  type RainValue,
  type SubmitVotesOutput,
} from '@vai-chover/shared';
import { LastPeriodCard } from '../../components/LastPeriodCard';
import { PERIOD_LABELS } from '../../components/period-labels';
import { RainSlider } from '../../components/RainSlider';
import { describeRejections } from '../../components/vote-messages';
import { Body, Button, ErrorText, Screen, Title } from '../../components/ui';
import { useRegionContext } from '../../context/region';
import { useSignedInUser } from '../../context/session';
import { useLastResult } from '../../hooks/useResults';
import { ApiError, toUserMessage } from '../../services/api';
import { fetchVotedPeriods } from '../../services/data';
import { getApi } from '../../services/firebase';

/** Tela de palpites (contracts/ui-screens.md `/vote`). */
export default function VoteScreen() {
  const { region } = useRegionContext();
  const user = useSignedInUser();
  const lastResult = useLastResult(user.uid);
  const [values, setValues] = useState<Partial<Record<Period, RainValue>>>({});
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!region) {
      return;
    }
    let active = true;
    fetchVotedPeriods(user.uid, region.localDate)
      .then((voted) => {
        if (active && voted.includes(region.currentPeriod)) {
          router.replace('/results');
        }
      })
      .catch(() => undefined)
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [region, user.uid]);

  if (!region) {
    return <Redirect href="/" />;
  }

  const questions = getQuestionsFor(region.currentPeriod);
  const complete = questions.every((question) => values[question.targetPeriod] !== undefined);

  async function confirm() {
    if (!region || !complete) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getApi().submitVotes({
        regionId: region.regionId,
        localDate: region.localDate,
        votes: questions.map((question) => ({
          targetPeriod: question.targetPeriod,
          value: values[question.targetPeriod] as RainValue,
        })),
      });
      router.replace({
        pathname: '/results',
        params: {
          periods: result.accepted.join(','),
          notice: describeRejections(result.rejected) ?? '',
        },
      });
    } catch (caught) {
      const rejected =
        (caught instanceof ApiError &&
          (caught.details as { result?: SubmitVotesOutput } | null)?.result?.rejected) ||
        null;
      if (rejected && rejected.every((item) => item.reason === 'already_voted')) {
        router.replace('/results');
        return;
      }
      setError(rejected ? describeRejections(rejected) : toUserMessage(caught));
      setLoading(false);
    }
  }

  return (
    <Screen testID="vote-screen">
      <Title>
        {region.name}/{region.state}
      </Title>
      <Body muted>Agora é {PERIOD_LABELS[region.currentPeriod]}. Dê seu palpite:</Body>
      {lastResult ? <LastPeriodCard result={lastResult} /> : null}
      {questions.map((question) => (
        <RainSlider
          key={question.targetPeriod}
          testID={`question-${question.targetPeriod}`}
          question={question.text}
          value={values[question.targetPeriod] ?? null}
          onChange={(value) =>
            setValues((current) => ({ ...current, [question.targetPeriod]: value }))
          }
        />
      ))}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        label="Confirmar palpites"
        onPress={confirm}
        disabled={!complete || checking}
        loading={loading}
        testID="confirm-votes-button"
      />
    </Screen>
  );
}
