import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import "react-native-reanimated";
import { useEffect, useState, useCallback } from "react";
import { useColorScheme } from "@/hooks/useColorScheme";

// It's better to set this once in a separate config file, but this is fine.
SecureStore.setItem("backend", "http://192.168.1.217:5000");

// Custom hook to manage the authentication state and effects
function useAuthGuard() {
    const [hasRefresh, setHasRefresh] = useState<boolean | null>(null);
    const segments = useSegments();
    const router = useRouter();
    // console.log("auth");

    const checkAuth = useCallback(() => {
        const token = SecureStore.getItem("refresh_token");
        // console.log(token);
        setHasRefresh(token != null); // More concise boolean conversion
    }, []);

    // Check token on initial mount and when the function reference changes
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        // Wait until the auth state is determined
        checkAuth();
        // console.log("HAS REFRESH:", hasRefresh)
        if (hasRefresh === null) {
            return;
        }

        const inAuthGroup = segments[0] === "(auth)";

        // If the user is not signed in and they are not in the auth group,
        // redirect them to the sign-in screen.
        if (!hasRefresh && !inAuthGroup) {
            router.replace("/(auth)/login"); // Adjust to your initial auth route
        }

        // If the user is signed in and they are in the auth group,
        // redirect them to the main app screen.
        if (hasRefresh && inAuthGroup) {
            router.replace("/(tabs)"); // Adjust to your initial app route
        }
    }, [hasRefresh]);

    return { hasRefresh };
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const { hasRefresh } = useAuthGuard();
    const [loaded] = useFonts({
        SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    });

    // Display a loading indicator or splash screen while fonts and auth state load
    if (!loaded || hasRefresh === null) {
        // You can return a <SplashScreen /> component here
        return null;
    }

    const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return (
        <ThemeProvider value={theme}>
            {/* Always render both screen groups.
              The useEffect in useAuthGuard will handle the redirection.
            */}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
            </Stack>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
    );
}
