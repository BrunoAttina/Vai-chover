import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Body, Button, ErrorText, Field, Screen, Title } from '../../components/ui';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';
import { signInWithToken } from '../../services/session';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyCodeScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      setError('O código tem 6 dígitos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { customToken } = await getApi().verifyLoginCode({ email, code });
      // A navegação acontece pelo layout raiz ao detectar a sessão (perfil ou app).
      await signInWithToken(customToken);
    } catch (caught) {
      setError(toUserMessage(caught));
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await getApi().requestLoginCode({ email });
      setInfo('Enviamos um novo código.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      setError(toUserMessage(caught));
    }
  }

  return (
    <Screen testID="verify-code-screen">
      <Title>Digite o código</Title>
      <Body>Enviamos um código de 6 dígitos para {email}. Ele vale por 15 minutos.</Body>
      <Field
        label="Código"
        testID="code-input"
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {info ? <Body muted>{info}</Body> : null}
      <Button label="Entrar" onPress={verify} loading={loading} testID="verify-button" />
      <Button
        label={cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
        onPress={resend}
        disabled={cooldown > 0}
        variant="secondary"
        testID="resend-button"
      />
    </Screen>
  );
}
