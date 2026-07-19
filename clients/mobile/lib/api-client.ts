import { client } from "./api/client.gen";
import { useSalliStore } from "./store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

client.setConfig({ baseUrl: API_URL });

client.interceptors.request.use((request) => {
  const token = useSalliStore.getState().token;
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

export { API_URL };
