import { useState } from 'react';
import { Link, router } from 'expo-router';
import { requestLoginCodeInput } from '@vai-chover/shared';
import { Body, Button, ErrorText, Field, Screen, Title } from '../../components/ui';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = requestLoginCodeInput.safeParse({ email });
    if (!parsed.success) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await getApi().requestLoginCode(parsed.data);
      router.push({ pathname: '/verify-code', params: { email: parsed.data.email } });
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen testID="sign-in-screen">
      <Title>Vai chover?</Title>
      <Body>Entre com seu e-mail. Enviaremos um código de acesso — sem senha.</Body>
      <Field
        label="E-mail"
        testID="email-input"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label="Receber código" onPress={submit} loading={loading} testID="send-code-button" />
      <Link href="/sign-up" testID="go-sign-up">
        <Body>Ainda não tem conta? Criar conta</Body>
      </Link>
    </Screen>
  );
}
