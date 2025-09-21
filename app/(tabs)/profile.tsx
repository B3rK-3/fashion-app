import { useEffect, useState } from "react";
import {
    StyleSheet,
    View,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { deleteAllTokens } from "../functions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const e = await SecureStore.getItemAsync("email");
                setEmail(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const onSignOut = async () => {
        if (signingOut) return;
        setSigningOut(true);
        try {
            await deleteAllTokens();
            // Kick back to root to trigger the auth gate to re-run
            console.log("Email:", SecureStore.getItem("email"));
            router.replace("/(auth)/login"); // Root will now render (auth)
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <ThemedText type="title">Profile</ThemedText>
            </View>

            <View style={styles.card}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Email
                </ThemedText>
                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <ThemedText style={styles.emailText}>
                        {email ?? "Not set"}
                    </ThemedText>
                )}
            </View>

            <TouchableOpacity
                style={styles.signOutBtn}
                onPress={onSignOut}
                disabled={signingOut}
            >
                {signingOut ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <ThemedText style={styles.signOutText}>Sign out</ThemedText>
                )}
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    container: { flex: 1, padding: 16, gap: 16 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(127,127,127,0.25)",
        gap: 6,
    },
    label: { opacity: 0.7 },
    emailText: { fontSize: 16 },
    signOutBtn: {
        marginTop: "auto",
        backgroundColor: "#ef4444",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    signOutText: { color: "#fff", fontWeight: "700" },
});
