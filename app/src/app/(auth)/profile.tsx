import { useState } from 'react';
import { displayNameSchema } from '@vai-chover/shared';
import { Body, Button, ErrorText, Field, Screen, Title } from '../../components/ui';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      setError('O nome deve ter de 2 a 30 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // O layout raiz leva ao app quando o perfil atualizado chega.
      await getApi().completeProfile({ displayName: parsed.data });
    } catch (caught) {
      setError(toUserMessage(caught));
      setLoading(false);
    }
  }

  return (
    <Screen testID="profile-screen">
      <Title>Como quer ser chamado?</Title>
      <Body>Este nome aparece só para você.</Body>
      <Field
        label="Nome de exibição"
        testID="name-input"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label="Continuar" onPress={save} loading={loading} testID="save-profile-button" />
    </Screen>
  );
}
