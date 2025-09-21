import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { Camera, CameraView } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useIsFocused } from "@react-navigation/native";
import { Image as ImageCompressor } from "react-native-compressor";

export default function AddWardrobe() {
    const isFocused = useIsFocused(); // Add this line
    const insets = useSafeAreaInsets();
    const API = SecureStore.getItem("backend");
    const colorScheme = useColorScheme();
    const camera = useRef<CameraView | null>(null);

    const [hasPermission, setHasPermission] = useState<null | boolean>(null);
    const [imageUri, setImageUri] = useState<string | null>(null); // local preview file
    const [imageBase64, setImageBase64] = useState<string | null>(null); // for upload
    const [garmentType, setGarmentType] = useState<
        "top" | "bottom" | "dress" | "jewelry" | "hat" | ""
    >("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        })();
    }, []);

    if (hasPermission === false) {
        Alert.alert(
            "Camera permission needed",
            "To add clothes this app needs camera permission to take pictures."
        );
    }

    const refreshJwt = async (): Promise<string | null> => {
        try {
            const oldJwt = await SecureStore.getItemAsync("jwt");
            const refreshToken = await SecureStore.getItemAsync(
                "refresh_token"
            );
            if (!oldJwt || !refreshToken) return null;

            const resp = await fetch(`${API}/updatejwt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jwt: oldJwt, refreshToken }),
            });
            const data = await resp.json().catch(() => ({} as any));
            if (resp.status === 201 && data?.jwt) {
                await SecureStore.setItemAsync("jwt", data.jwt);
                return data.jwt as string;
            }
            return null;
        } catch {
            return null;
        }
    };

    const takePhoto = async () => {
        if (!hasPermission) {
            Alert.alert(
                "Camera permission needed",
                "To add clothes this app needs camera permission to take pictures."
            );
            return;
        }
        setBusy(true);
        try {
            const pic = await camera.current?.takePictureAsync({
                base64: true,
                quality: 1,
                shutterSound: false,
            });
            if (!pic?.base64) return;

            // Save to local cache for preview
            const localURI =
                FileSystem.cacheDirectory + `wardrobe_${Date.now()}.jpg`;
            await FileSystem.writeAsStringAsync(localURI, pic.base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Pass raw base64 to compressor
            const base64_str = await ImageCompressor.compress(localURI, {
                compressionMethod: "manual",
                returnableOutputType: "base64",
                quality: 0.7,
            });

            setImageUri(localURI);
            setImageBase64(base64_str);
        } catch (e: any) {
            console.log(e);
            Alert.alert("Error", "Failed to take photo.");
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        if (!imageBase64 || !garmentType) {
            Alert.alert(
                "Missing info",
                "Please select a garment type and take a photo."
            );
            return;
        }
        setBusy(true);
        try {
            let jwt = await SecureStore.getItemAsync("jwt");
            if (!jwt) {
                Alert.alert("Not authenticated", "Please log in again.");
                setBusy(false);
                return;
            }

            const tryPost = async (token: string) => {
                console.log(
                    "Requesting with",
                    {
                        jwt: token,
                        type: garmentType,
                    },
                    API
                );
                const resp = await fetch(`${API}/pushdb`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jwt: token,
                        img: imageBase64,
                        type: garmentType,
                    }),
                });
                const data = await resp.json().catch(() => ({} as any));
                console.log(data);
                return { resp, data };
            };

            // First attempt
            let { resp, data } = await tryPost(jwt);

            // If expired, refresh and retry once
            if (data?.status === "ERROR" && data?.ERROR === "expired_jwt") {
                const newJwt = await refreshJwt();
                if (!newJwt) throw new Error("Could not refresh session.");
                jwt = newJwt;
                ({ resp, data } = await tryPost(newJwt));
            }

            if (resp.status === 201) {
                Alert.alert("Success", "Garment added.");
                // Reset the screen after success
                setImageUri(null);
                setImageBase64(null);
                setGarmentType("");
            } else {
                Alert.alert(
                    "Upload failed",
                    data?.ERROR ?? "Please try again."
                );
            }
        } catch (e: any) {
            console.log(e);
            Alert.alert(
                "Network error",
                e?.message ?? "Unable to reach server."
            );
        } finally {
            setBusy(false);
        }
    };

    const showPreview = !!imageUri;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.mainContainer]}>
                {/* Top: camera or a minimized preview */}
                {showPreview ? (
                    <View
                        style={[
                            styles.previewContainer,
                            { paddingTop: insets.top },
                        ]}
                    >
                        <Image
                            source={{ uri: imageUri! }}
                            style={styles.previewImage}
                            contentFit="cover"
                        />
                    </View>
                ) : (
                    // Only render the CameraView if the screen is currently focused
                    isFocused && (
                        <CameraView style={styles.camera} ref={camera} />
                    )
                )}

                {/* Bottom controls */}
                <View style={[styles.bottomPanel, showPreview ? {backgroundColor: "rgba(11, 11, 11, 1)",         paddingBottom: 24,} : {backgroundColor: "rgba(11, 11, 11, 0.15)",}]}>
                    {showPreview ? (
                        <>
                            <Text style={styles.label}>
                                Select garment type
                            </Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={garmentType}
                                    onValueChange={(val) =>
                                        setGarmentType(val as any)
                                    }
                                >
                                    <Picker.Item
                                        label="Choose type…"
                                        value=""
                                    />
                                    <Picker.Item label="Top" value="top" />
                                    <Picker.Item
                                        label="Bottom"
                                        value="bottom"
                                    />
                                    <Picker.Item label="Dress" value="dress" />
                                    <Picker.Item
                                        label="Jewelry"
                                        value="jewelry"
                                    />
                                    <Picker.Item label="Hat" value="hat" />
                                </Picker>
                            </View>

                            <View style={styles.row}>
                                <TouchableOpacity
                                    disabled={busy}
                                    style={styles.secondaryBtn}
                                    onPress={() => {
                                        setImageUri(null);
                                        setImageBase64(null);
                                        setGarmentType("");
                                    }}
                                >
                                    <Text style={styles.secondaryText}>
                                        Retake
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={submit}
                                    disabled={busy}
                                >
                                    {busy ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryText}>
                                            Submit
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <TouchableOpacity
                            onPress={takePhoto}
                            disabled={busy}
                            style={styles.shutter}
                        >
                            {busy ? (
                                <ActivityIndicator />
                            ) : (
                                <IconSymbol
                                    size={90}
                                    name={"camera.shutter.button"}
                                    color={Colors["dark"].tint}
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000",
    },
    mainContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    camera: { flex: 1 },
    previewContainer: {
        backgroundColor: "#111",
        height: "100%",
        alignItems: "center",
    },
    previewImage: {
        width: "100%",
        height: "77%",
        borderRadius: 5,
    },
    bottomPanel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    shutter: {
        alignSelf: "center",
        paddingVertical: 8,
    },
    label: {
        color: "#fff",
        fontSize: 14,
        marginBottom: 6,
    },
    pickerWrapper: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 10,
        overflow: "hidden",
    },
    row: {
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: "#2563eb",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    primaryText: { color: "#fff", fontWeight: "600" },
    secondaryBtn: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.12)",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    secondaryText: { color: "#fff" },
});
