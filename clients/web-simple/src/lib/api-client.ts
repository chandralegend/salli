import { client } from "./api/client.gen";
import { getStoredToken } from "./store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

client.setConfig({
  baseUrl: API_URL,
});

client.interceptors.request.use((request) => {
  const token = getStoredToken();
  if (token) {
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return new Request(request, { headers });
  }
  return request;
});

export { client, API_URL };
