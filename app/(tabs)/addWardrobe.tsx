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
} from "react-native";
import { fetch } from "expo/fetch";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export default function addWardrobe() {
    const colorScheme = useColorScheme();
    const [image, setImage] = useState<string | null>(null);
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
            const a = await camera.current?.takePictureAsync({ base64: true });
            if (a?.base64) {
                const img_str = a.base64;
                const localURI = FileSystem.cacheDirectory + "example.jpg";
                console.log("process");
                fetch("http://192.168.137.1:5000/process", {
                    method: "POST",
                    body: JSON.stringify({ img: img_str }),
                    headers: {},
                })
                    .then((res) => res.text())
                    .then((base64_str) => {
                        // console.log(base64_str);
                        const img = FileSystem.writeAsStringAsync(
                            localURI,
                            base64_str,
                            {
                                encoding: FileSystem.EncodingType.Base64,
                            }
                        );
                        console.log("imageFetched");
                        return img;
                    })
                    .then(async () => {
                        setImage(localURI);
                        console.log("imageWrittn");
                        console.log(localURI);
                        FileSystem.getInfoAsync(localURI).then((res) => {
                            console.log(res);
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
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
