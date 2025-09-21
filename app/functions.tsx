import * as SecureStore from "expo-secure-store";
export const BASE = SecureStore.getItem("backend");
export function saveTokens(jwt: string, refresh: string, email: string) {
    SecureStore.setItem("jwt", jwt);
    SecureStore.setItem("refresh_token", refresh);
    SecureStore.setItem("email", email);
}

export async function deleteAllTokens() {
    await SecureStore.deleteItemAsync("jwt");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("email");
}
