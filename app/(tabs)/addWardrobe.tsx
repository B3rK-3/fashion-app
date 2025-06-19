import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { Camera, CameraView } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";

export default function addWardrobe() {
    const colorScheme = useColorScheme();
    const camera = useRef<CameraView | null>(null);
    const [hasPermission, setHasPermission] = useState<null | boolean>(null);
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        })();
    }, []);

    if (hasPermission == false) {
        alert(
            "To add clothes this app needs camera permission to take pictures."
        );
    }

    const takePhoto = () => {
        if (hasPermission == false) {
            alert(
                "To add clothes this app needs camera permission to take pictures."
            );
        }
        (async () => {
            const a  = await camera.current?.takePictureAsync();
            console.log(a?.uri)
        })();
    };
    return (
        <SafeAreaView style={styles.mainContainer}>
            <CameraView style={styles.camera} ref={camera} />
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={takePhoto}>
                    <IconSymbol
                        size={90}
                        name={"camera.shutter.button"}
                        color={Colors["dark"].tint}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1 },
    camera: {
        height: "100%",
    },
    buttonContainer: {
        position: "absolute",
        zIndex: 5,
        width: "100%",
        height: "100%",
        justifyContent: "flex-end",
        alignItems: "center",
    },
});
