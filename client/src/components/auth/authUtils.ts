import axios from "axios";
import { BACKEND_URL } from "../../config";

export const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-lichen";

export const field =
  "mt-2 w-full rounded-md border border-bark/40 bg-chalk px-4 py-3 font-normal text-bark placeholder:text-bark/50 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum";

export { errorMessage } from "../../api";

export async function passwordSignin(username: string, password: string) {
  const response = await axios.post<{ token: string }>(BACKEND_URL + "/api/v1/signin", {
    username,
    password,
  });
  return response.data.token;
}

export async function googleSignin(credential: string) {
  const response = await axios.post<{ token: string }>(BACKEND_URL + "/api/v1/auth/google", {
    credential,
  });
  return response.data.token;
}
