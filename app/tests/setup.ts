/* eslint-disable @typescript-eslint/no-require-imports */
// O slider é um componente nativo: no Jest ele vira uma View que repassa as props.
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    Link: ({ children, testID }: { children: unknown; testID?: string }) =>
      React.createElement(Text, { testID }, children),
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, { testID: 'redirect' }, href),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});
