import { useState } from 'react';
import { Link, router } from 'expo-router';
import { displayNameSchema, requestLoginCodeInput } from '@vai-chover/shared';
import { Body, Button, ErrorText, Field, Screen, Title } from '../../components/ui';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const nameOk = displayNameSchema.safeParse(displayName).success;
    const parsed = requestLoginCodeInput.safeParse({ email, displayName });
    if (!nameOk || !parsed.success) {
      setErrors({
        ...(nameOk ? {} : { name: 'O nome deve ter de 2 a 30 caracteres.' }),
        ...(requestLoginCodeInput.shape.email.safeParse(email).success
          ? {}
          : { email: 'Informe um e-mail válido.' }),
      });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await getApi().requestLoginCode(parsed.data);
      router.push({ pathname: '/verify-code', params: { email: parsed.data.email } });
    } catch (caught) {
      setErrors({ form: toUserMessage(caught) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen testID="sign-up-screen">
      <Title>Criar conta</Title>
      <Body>Só precisamos de um nome de exibição e do seu e-mail.</Body>
      <Field
        label="Nome de exibição"
        testID="name-input"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
        error={errors.name ?? null}
      />
      <Field
        label="E-mail"
        testID="email-input"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
        error={errors.email ?? null}
      />
      {errors.form ? <ErrorText>{errors.form}</ErrorText> : null}
      <Button label="Criar conta" onPress={submit} loading={loading} testID="sign-up-button" />
      <Link href="/sign-in" testID="go-sign-in">
        <Body>Já tem conta? Entrar</Body>
      </Link>
    </Screen>
  );
}
