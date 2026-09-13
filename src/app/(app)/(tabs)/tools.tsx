import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { AccentColorPicker } from '@/components/AccentColorPicker';
import { InstallAppCard } from '@/components/InstallAppCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { haptics } from '@/lib/haptics';
import { TOOL_GROUPS } from '@/lib/toolGroups';
import { useColors } from '@/theme';
import { ACCENTS, resolveAccent } from '@/theme/accents';
import { fonts } from '@/theme/typography';
import { useThemeStore, type ThemePref } from '@/store/theme';
import { useAccentStore } from '@/store/accent';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

// Círculos de color solos, sin nombre, eran difíciles de distinguir entre sí
// (paleta "tierra": a propósito de baja saturación, ver `theme/accents.ts`)
// y sin ningún orden aparente -- esta fila los muestra como una lista
// vertical de opciones (punto de color + nombre + check), mismo lenguaje que
// cualquier selector de una sola opción, en el mismo orden en que se definen
// (claro → oscuro, ver `ACCENTS`) -- "Brasa" va en la misma lista que el
// resto, sin separarla ni explicarla aparte: es una opción más.
function AccentOption({
  swatchColor,
  label,
  active,
  onPress,
}: {
  swatchColor: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        if (!active) haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="w-1/2 flex-row items-center gap-2 py-2 pr-2 active:opacity-60"
    >
      <View className="h-6 w-6 rounded-full" style={{ backgroundColor: swatchColor }} />
      <Text className="text-text flex-1 text-sm" numberOfLines={1}>
        {label}
      </Text>
      {active ? <Icon name="check" size={14} color={colors.text} /> : null}
    </Pressable>
  );
}

/**
 * Herramientas: antes 18+ botones sueltos en un grid, costaba encontrar
 * algo. Ahora son carpetas (`TOOL_GROUPS`) que llevan a `/tools/[group]`,
 * donde vive el mismo grid de tiles pero acotado a esa carpeta.
 */
export default function ToolsScreen() {
  const colors = useColors();
  const version = Constants.expoConfig?.version ?? '—';
  const themePref = useThemeStore((s) => s.pref);
  const setThemePref = useThemeStore((s) => s.setPref);
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'light' ? 'light' : 'dark';
  const accentId = useAccentStore((s) => s.accent);
  const setAccent = useAccentStore((s) => s.setAccent);
  const customHex = useAccentStore((s) => s.customHex);
  const setCustomHex = useAccentStore((s) => s.setCustomHex);
  const customSwatch = resolveAccent('custom', customHex)[scheme].primary;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-32 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader title="Herramientas" />

        <InstallAppCard />

        <Card title="Gestión">
          {/* Antes cada tile entraba con un fundido escalonado (`FadeInView
              index={i}`) -- Herramientas es una pestaña, se revisita todo el
              tiempo, así que el "goteo" se repetía en cada visita en vez de
              verse una sola vez. Se muestran directo. */}
          <View className="-my-1 flex-row flex-wrap">
            {TOOL_GROUPS.map((group) => (
              <View key={group.id} className="w-1/2 p-1">
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    router.push(`/tools/${group.id}`);
                  }}
                  accessibilityRole="button"
                  className="rounded-3xl bg-surface-2 p-3 active:opacity-60"
                >
                  <Icon name={group.icon} size={20} color={colors.text} />
                  <Text
                    className="text-text mt-2.5 text-sm"
                    style={{ fontFamily: fonts.semibold }}
                  >
                    {group.label}
                  </Text>
                  <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
                    {group.hint}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Card>

        <Card title="Apariencia">
          <Segmented value={themePref} onChange={setThemePref} options={THEME_OPTIONS} />

          <Text className="text-text-muted mb-1 mt-4 text-xs">Acento</Text>
          <View className="-mb-2 flex-row flex-wrap">
            {ACCENTS.map((accent) => (
              <AccentOption
                key={accent.id}
                swatchColor={accent[scheme].primary}
                label={accent.label}
                active={accent.id === accentId}
                onPress={() => setAccent(accent.id)}
              />
            ))}
            <AccentOption
              swatchColor={customSwatch}
              label="Personalizado"
              active={accentId === 'custom'}
              onPress={() => setAccent('custom')}
            />
          </View>

          {accentId === 'custom' ? (
            <View className="mt-3">
              <AccentColorPicker hex={customHex} onChange={setCustomHex} />
            </View>
          ) : null}
        </Card>

        <Text className="text-text-muted self-center text-xs">Versión {version}</Text>
      </ScrollView>
    </View>
  );
}
