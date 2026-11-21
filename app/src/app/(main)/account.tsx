import { useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, Card, ErrorText, Screen, Title } from '../../components/ui';
import { useSession } from '../../context/session';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';
import { signOutUser } from '../../services/session';

/** Conta: nome, e-mail, sair e excluir conta (LGPD). */
export default function AccountScreen() {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (session.status !== 'signedIn') {
    return null;
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      await getApi().deleteAccount();
      await signOutUser();
    } catch (caught) {
      setError(toUserMessage(caught));
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir conta',
      'Seus dados e palpites serão apagados. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );
  }

  return (
    <Screen testID="account-screen">
      <Title>{session.profile?.displayName ?? ''}</Title>
      <Card>
        <Body muted>E-mail</Body>
        <Body>{session.user.email ?? ''}</Body>
      </Card>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        label="Sair"
        onPress={() => void signOutUser()}
        variant="secondary"
        testID="sign-out-button"
      />
      <Button
        label="Excluir conta"
        onPress={confirmDelete}
        loading={deleting}
        variant="danger"
        testID="delete-account-button"
      />
    </Screen>
  );
}
