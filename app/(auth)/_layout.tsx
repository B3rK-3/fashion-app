import { Stack } from "expo-router";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AuthLayout() {
    const colorScheme = useColorScheme();
    const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return (
        <ThemeProvider value={theme}>
            <Stack>
                <Stack.Screen name="login" options={{ title: "Log in" }} />
                <Stack.Screen
                    name="register"
                    options={{ title: "Create account" }}
                />
            </Stack>
        </ThemeProvider>
    );
}
