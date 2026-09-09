/* eslint-env jest */

// expo-secure-store: sin módulo nativo en jest.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

// AsyncStorage: implementación en memoria oficial para tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-reanimated: tanto el módulo real como el mock OFICIAL de la
// librería terminan enganchando el binding nativo de react-native-worklets
// al importarse y revientan bajo jest ("Cannot read properties of
// undefined (reading 'loadUnpackers')", luego "createSerializable is not a
// function" -- todavía no hay un mock estable publicado para esta versión
// de reanimated 4 + worklets separado). Ningún componente de esta app
// necesita que la animación sea real bajo test (sólo se verifica el
// resultado renderizado/las props, nunca el movimiento en sí), así que se
// stubea a mano con la porción mínima que usan: `Animated.View`/`Text` como
// las vistas normales, `useSharedValue` como una caja mutable, `withSpring`
// pasando el valor final derecho (sin animar), `useAnimatedStyle`
// ejecutando el callback ya mismo.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const React = require('react');

  const useSharedValue = (initial) => {
    const ref = React.useRef({ value: initial });
    return ref.current;
  };
  const withSpring = (toValue) => toValue;
  const withTiming = (toValue) => toValue;
  const useAnimatedStyle = (factory) => factory();
  const interpolate = (value, input, output) => {
    const [x0, x1] = input;
    const [y0, y1] = output;
    if (x1 === x0) return y0;
    const t = (value - x0) / (x1 - x0);
    return y0 + t * (y1 - y0);
  };
  const passthrough = (fn) => fn;
  // `Easing.out(Easing.cubic)`, `Easing.in(Easing.cubic)`,
  // `Easing.out(Easing.back(1.2))`... como `withTiming` de este mock ya
  // ignora la curva (ver arriba), cualquier función identidad como "easing"
  // alcanza -- lo único que hace falta es que las llamadas encadenadas no
  // exploten.
  const easingIdentity = (t) => t;
  const Easing = {
    linear: easingIdentity,
    ease: easingIdentity,
    cubic: easingIdentity,
    in: () => easingIdentity,
    out: () => easingIdentity,
    inOut: () => easingIdentity,
    back: () => easingIdentity,
    bezier: () => easingIdentity,
  };

  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      // react-native-gesture-handler (Swipeable) espera poder envolver
      // cualquier componente con esto -- un passthrough alcanza, no hace
      // falta que "anime" nada bajo test.
      createAnimatedComponent: (Component) => Component,
    },
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps: (factory) => factory(),
    useAnimatedRef: () => ({ current: null }),
    useDerivedValue: (factory) => useSharedValue(factory()),
    withSpring,
    withTiming,
    withDelay: (_delay, animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    interpolate,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    runOnJS: passthrough,
    runOnUI: passthrough,
    cancelAnimation: () => {},
    // `react-native-gesture-handler`'s `GestureDetector` (usado por
    // `ModalHeader`'s dismiss gesture y por `ReanimatedSwipeable`) carga el
    // módulo entero de reanimated (no el `default`) y llama a `useEvent`/
    // `setGestureState` directo -- sin esto revienta con "useEvent is not a
    // function" apenas se monta cualquier pantalla con `<ModalHeader>`.
    // Ningún test dispara gestos reales, así que un stub que no hace nada
    // alcanza.
    useEvent: () => null,
    setGestureState: () => {},
    Easing,
  };
});
