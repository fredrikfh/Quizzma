import { AudienceApi, HostApi, Configuration, SessionsApi } from "./apiService";
import { auth } from "@/api/firebaseClient.ts";

const apiConfig = new Configuration({
  basePath: import.meta.env.VITE_API_URL || "http://localhost:8000",
  middleware: [
    {
      // "pre" runs before the request
      async pre(context) {
        const token = auth.currentUser
          ? await auth.currentUser.getIdToken()
          : "";
        context.init.headers = {
          ...context.init.headers,
          Authorization: `Bearer ${token}`,
        };
        return context;
      },
    },
  ],
});

export const api = {
  host: new HostApi(apiConfig),
  audience: new AudienceApi(apiConfig),
  sessions: new SessionsApi(apiConfig),
};
