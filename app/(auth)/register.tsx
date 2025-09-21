import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useState } from "react";
import { View, TextInput, Button, Alert } from "react-native";
import { useRouter } from "expo-router";
import { saveTokens, BASE } from "../functions";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function Register() {
     const colorScheme = useColorScheme();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const handleRegister = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const resp = await fetch(`${BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await resp.json().catch(() => ({} as any));
            console.log(data);

            if (resp.status === 201 && data?.jwt && data?.refreshToken) {
                console.log('SUCCESS')
                saveTokens(data.jwt, data.refreshToken, email);
                router.replace("/(tabs)");
                console.log('(tabs)')
                return;
            }

            // If email exists, auto switch to login and try credentials there
            if (data?.status === "ERROR" && data?.ERROR === "email_exists") {
                console.log('ERROR')
                // Option A: auto-attempt login immediately
                const loginResp = await fetch(`${BASE}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                const loginData = await loginResp
                    .json()
                    .catch(() => ({} as any));
                if (
                    loginResp.status === 201 &&
                    loginData?.jwt &&
                    loginData?.refreshToken
                ) {
                    saveTokens(loginData.jwt, loginData.refreshToken, email);
                    router.replace("/(tabs)");
                    return;
                }
                // Option B: navigate to login screen with prefilled params
                router.replace({
                    pathname: "/(auth)/login",
                    params: { email },
                });
                console.log("login")
                return;
            }

            Alert.alert(
                "Registration failed",
                data?.ERROR ?? "Please try again."
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
                    title={busy ? "Please wait…" : "Register"}
                    onPress={handleRegister}
                />
                <Button
                    title="I already have an account"
                    onPress={() => router.push("/(auth)/login")}
                />
            </View>
        </ThemeProvider>
    );
}
