import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { TOOL_GROUPS } from '@/lib/toolGroups';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** Una carpeta de Herramientas (ver `TOOL_GROUPS`): el mismo grid de tiles
 * que antes vivía suelto en la pantalla principal, acotado a este grupo. */
export default function ToolGroupScreen() {
  const colors = useColors();
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const group = TOOL_GROUPS.find((g) => g.id === groupId);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={group?.label ?? 'Herramientas'} />
      <ScrollView contentContainerClassName="py-2">
        <View className="-my-1 flex-row flex-wrap">
          {(group?.tools ?? []).map((tool, i) => (
            <View key={tool.label} className="w-1/2 p-1">
              <FadeInView index={i}>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    tool.onPress();
                  }}
                  accessibilityRole="button"
                  className="rounded-3xl bg-surface-2 p-3 active:opacity-60"
                >
                  <Icon
                    name={tool.icon}
                    size={20}
                    color={tool.destructive ? colors.expense : colors.text}
                  />
                  <Text
                    className="text-text mt-2.5 text-sm"
                    style={{ fontFamily: fonts.semibold }}
                  >
                    {tool.label}
                  </Text>
                  <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
                    {tool.hint}
                  </Text>
                </Pressable>
              </FadeInView>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
