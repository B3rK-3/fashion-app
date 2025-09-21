import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { BASE as API_BASE } from "../functions";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatTurn = { role: "user" | "model"; content: string };
type ImagesResponse = { [garmentType: string]: string[] };

// Heuristic to build a proper data URI for base64 images from backend
const b64ToDataUri = (b64: string) => {
    const trimmed = b64
        .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
        .trim();
    const mime = trimmed.startsWith("/9j/") ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${trimmed}`;
};

const GarmentSlides: React.FC<{ imagesByType: ImagesResponse }> = ({
    imagesByType,
}) => {
    // Keep a per-garment index
    const [indices, setIndices] = useState<Record<string, number>>({});

    const move = useCallback(
        (garmentType: string, delta: number) => {
            setIndices((prev) => {
                const list = imagesByType[garmentType] || [];
                if (!list.length) return prev;
                const curr = prev[garmentType] ?? 0;
                const next = (curr + delta + list.length) % list.length;
                return { ...prev, [garmentType]: next };
            });
        },
        [imagesByType]
    );

    const sections = useMemo(
        () => Object.entries(imagesByType),
        [imagesByType]
    );

    return (
        <View style={{ gap: 24 }}>
            {sections.map(([garmentType, imgs]) => {
                const idx = indices[garmentType] ?? 0;
                const total = imgs.length;

                if (!total) return null;
                const uri = b64ToDataUri(imgs[idx]);

                return (
                    <View key={garmentType} style={styles.slideBlock}>
                        <Text style={styles.slideTitle}>{garmentType}</Text>

                        <View style={styles.slideRow}>
                            <TouchableOpacity
                                accessibilityLabel={`Previous ${garmentType} image`}
                                onPress={() => move(garmentType, -1)}
                                style={styles.navBtn}
                            >
                                <Text style={styles.navText}>{"‹"}</Text>
                            </TouchableOpacity>

                            <Image
                                source={{ uri }}
                                resizeMode="contain"
                                style={styles.slideImage}
                            />

                            <TouchableOpacity
                                accessibilityLabel={`Next ${garmentType} image`}
                                onPress={() => move(garmentType, +1)}
                                style={styles.navBtn}
                            >
                                <Text style={styles.navText}>{"›"}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.counterText}>
                            {idx + 1} / {total}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

const Chat: React.FC = () => {
    const insets = useSafeAreaInsets();
    const jwtString = SecureStore.getItem("jwt");
    const [convo, setConvo] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [imagesByType, setImagesByType] = useState<ImagesResponse | null>(
        null
    );
    const scrollRef = useRef<ScrollView>(null);

    const append = (turn: ChatTurn) => setConvo((prev) => [...prev, turn]);

    const onSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        // Push user turn
        append({ role: "user", content: trimmed });
        setInput("");
        setLoading(true);
        setImagesByType(null); // clear previous galleries unless you want to stack them

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    convo: [...convo, { role: "user", content: trimmed }],
                    jwtString: jwtString,
                }),
            });

            const json = await res.json();
            // server returns {status, message, chatMessage? images?}
            if (json?.images && typeof json.images === "object") {
                setImagesByType(json.images as ImagesResponse);
                append({
                    role: "model",
                    content: "Here are some outfit options I found for you:",
                });
            } else if (typeof json?.chatMessage === "string") {
                append({ role: "model", content: json.chatMessage });
            } else {
                append({
                    role: "model",
                    content: "Hmm, I received an unexpected response format.",
                });
            }
        } catch (e: any) {
            append({
                role: "model",
                content: `Request failed: ${e?.message ?? "Unknown error"}`,
            });
        } finally {
            setLoading(false);
            // auto-scroll to bottom
            requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            });
        }
    }, [API_BASE, convo, input, jwtString, loading]);

    const resetChat = () => {
        setConvo([]);
    };
    return (
        <View style={[styles.wrapper]}>
            <View style={[styles.topNav, { paddingTop: insets.top }]}>
                <Text style={styles.topNavText}>Outfit Helper</Text>
                <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
                    <Text style={styles.resetText}>New Chat</Text>
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.select({
                    ios: "padding",
                    android: "padding",
                })}
                style={styles.container}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {convo.map((t, i) => (
                        <View
                            key={i}
                            style={[
                                styles.bubble,
                                t.role === "user"
                                    ? styles.user
                                    : styles.assistant,
                            ]}
                        >
                            <Text style={styles.bubbleText}>{t.content}</Text>
                        </View>
                    ))}

                    {imagesByType && (
                        <View style={{ marginTop: 12 }}>
                            <GarmentSlides imagesByType={imagesByType} />
                        </View>
                    )}

                    {loading && (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator />
                            <Text style={{ marginLeft: 8, color: "#fff" }}>
                                Thinking…
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.inputRow}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask for an outfit…"
                        style={styles.input}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            loading ? {backgroundColor: "#363636ff",} : { backgroundColor: "#2e7dff", },
                        ]}
                        onPress={onSend}
                        disabled={loading}
                    >
                        <Text style={[styles.sendText]}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default Chat;

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: "#0b0b0c" },
    topNav: {
        borderColor: "#ffffff22",
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 20,
        paddingBottom: 5,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    resetText: { fontSize: 15, color: "#fff" },
    resetBtn: { backgroundColor: "#2c2c2cff", padding: 5, borderRadius: 14 },
    topNavText: { color: "#fff", fontSize: 23 },
    container: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 80 },
    bubble: {
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        maxWidth: "90%",
    },
    user: { backgroundColor: "#2e7dff22", alignSelf: "flex-end" },
    assistant: { backgroundColor: "#ffffff12", alignSelf: "flex-start" },
    bubbleText: { color: "white", fontSize: 16, lineHeight: 22 },

    inputRow: {
        flexDirection: "row",
        padding: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#ffffff22",
        backgroundColor: "#0b0b0c",
    },
    input: {
        flex: 1,
        backgroundColor: "#ffffff10",
        color: "white",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        maxHeight: 120,
    },
    sendBtn: {
        marginLeft: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        alignSelf: "flex-end",
    },
    sendText: { color: "white", fontWeight: "700" },

    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        alignSelf: "flex-start",
    },

    slideBlock: {
        backgroundColor: "#ffffff0f",
        borderRadius: 16,
        padding: 12,
    },
    slideTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
        textTransform: "capitalize",
    },
    slideRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    navBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#00000055",
        justifyContent: "center",
        alignItems: "center",
    },
    navText: { color: "white", fontSize: 24, fontWeight: "900" },
    slideImage: {
        flex: 1,
        height: 260,
        marginHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "#00000044",
    },
    counterText: {
        alignSelf: "center",
        marginTop: 6,
        color: "#ddd",
    },
});
