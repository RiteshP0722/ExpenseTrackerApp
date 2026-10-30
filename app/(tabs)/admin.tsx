import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminOnly from "../../components/AdminOnly";
import type { IconName } from "../../components/Button";
import ScreenHeader from "../../components/ScreenHeader";
import { colors } from "../../constants/colors";
import { strings } from "../../constants/strings";
import { useItemRequests } from "../../hooks/useItems";
import { useAuth } from "../../hooks/useAuth";

function MenuButton({
  icon,
  title,
  sub,
  href,
  badge,
}: {
  icon: IconName;
  title: string;
  sub: string;
  href: Href;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={28} color={colors.green} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={22} color={colors.gray} />
    </Pressable>
  );
}

export default function AdminHome() {
  const { isAdmin } = useAuth();
  const requests = useItemRequests(isAdmin);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={strings.adminArea} />
      <AdminOnly>
        <ScrollView contentContainerStyle={styles.content}>
          <MenuButton
            icon="list-outline"
            title={strings.allEntries}
            sub={strings.searchPlaceholder}
            href="/entries"
          />
          <MenuButton
            icon="people-outline"
            title={strings.staff}
            sub={strings.staffHelp}
            href="/admin/staff"
          />
          <MenuButton
            icon="pricetags-outline"
            title={strings.items}
            sub={strings.itemRequests}
            href="/admin/items"
            badge={requests.data?.length}
          />
        </ScrollView>
      </AdminOnly>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  menu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 76,
  },
  pressed: { opacity: 0.8 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 18, fontWeight: "700", color: colors.dark },
  menuSub: { fontSize: 14, color: colors.gray, marginTop: 2 },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orangeText,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
