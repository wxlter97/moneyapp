import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { haptics } from '@/lib/haptics';
import { TOOL_GROUPS } from '@/lib/toolGroups';
import { useColors } from '@/theme';
import { ACCENTS, type Accent } from '@/theme/accents';
import { fonts } from '@/theme/typography';
import { useThemeStore, type ThemePref } from '@/store/theme';
import { useAccentStore } from '@/store/accent';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

// "Brasa" se separa del resto del selector (ver más abajo): es el único
// acento deliberadamente vivo, no una tonalidad tierra más.
const MUTED_ACCENTS = ACCENTS.filter((a) => a.id !== 'ember');
const EMBER_ACCENT = ACCENTS.find((a) => a.id === 'ember');

function AccentSwatch({
  accent,
  scheme,
  active,
  onPress,
}: {
  accent: Accent;
  scheme: 'light' | 'dark';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!active) haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accent.label}
      style={{ backgroundColor: accent[scheme].primary }}
      className={`h-9 w-9 rounded-full border-2 ${active ? 'border-text' : 'border-transparent'}`}
    />
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

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-32 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader title="Herramientas" />

        <Card title="Gestión">
          <View className="-my-1 flex-row flex-wrap">
            {TOOL_GROUPS.map((group, i) => (
              <View key={group.id} className="w-1/2 p-1">
                <FadeInView index={i}>
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
                </FadeInView>
              </View>
            ))}
          </View>
        </Card>

        <Card title="Apariencia">
          <Segmented value={themePref} onChange={setThemePref} options={THEME_OPTIONS} />

          <Text className="text-text-muted mb-2 mt-4 text-xs">Acento</Text>
          <View className="flex-row flex-wrap gap-3">
            {MUTED_ACCENTS.map((accent) => (
              <AccentSwatch
                key={accent.id}
                accent={accent}
                scheme={scheme}
                active={accent.id === accentId}
                onPress={() => setAccent(accent.id)}
              />
            ))}
          </View>

          {/* "Brasa" es, a propósito, el único acento vivo -- se separa del
              resto para que elegirlo sea una decisión consciente, no una
              opción más entre las tonalidades tierra. */}
          {EMBER_ACCENT ? (
            <>
              <View className="my-3 h-px bg-border/60" />
              <View className="flex-row items-center gap-3">
                <AccentSwatch
                  accent={EMBER_ACCENT}
                  scheme={scheme}
                  active={EMBER_ACCENT.id === accentId}
                  onPress={() => setAccent(EMBER_ACCENT.id)}
                />
                <Text className="text-text-muted flex-1 text-xs leading-4">
                  Vivo -- a propósito, no combina con el resto de la paleta.
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        <Text className="text-text-muted self-center text-xs">Versión {version}</Text>
      </ScrollView>
    </View>
  );
}
