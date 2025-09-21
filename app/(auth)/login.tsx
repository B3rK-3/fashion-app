import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useEffect, useState } from "react";
import { View, TextInput, Button, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { saveTokens, BASE } from "../functions";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function Login() {
    const colorScheme = useColorScheme();

    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(params.email ?? "");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (params.email) setEmail(params.email);
    }, [params.email]);

    const handleLogin = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const resp = await fetch(`${BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            
            const data = await resp.json().catch(() => ({} as any));

            if (resp.status === 201 && data?.jwt && data?.refreshToken) {
                saveTokens(data.jwt, data.refreshToken, email);
                router.replace("/(tabs)");
                return;
            }

            Alert.alert(
                "Login failed",
                data?.ERROR ?? "Check your credentials."
            );
        } catch (e: any) {
            Alert.alert(
                "Network error",
                e?.message ?? "Unable to reach server."
            );
        } finally {
            setBusy(false);
        }
    };

    const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return (
        <ThemeProvider value={theme}>
          <View style={{ padding: 16, gap: 12 }}>
            <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
            />
            <Button
                title={busy ? "Please wait…" : "Log in"}
                onPress={handleLogin}
            />
            <Button
                title="Create an account"
                onPress={() => router.push("/(auth)/register")}
            />
        </View>
        </ThemeProvider>
    );
}
