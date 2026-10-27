import { Tabs } from "expo-router";
import { colors } from "../../constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
    </Tabs>
  );
}
