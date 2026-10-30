import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { colors } from "../../constants/colors";
import { strings } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";

export default function TabLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.grayLight,
        tabBarStyle: { borderTopColor: colors.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: strings.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: strings.summary,
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: strings.admin,
          // Hidden for staff. The admin screens and the database check the role too.
          href: isAdmin ? "/admin" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
