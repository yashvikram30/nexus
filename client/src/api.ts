export const authHeaders = () => ({ Authorization: localStorage.getItem("token") ?? "" });

// Turns a failed request into a message that is safe to show: the server's own message when there is one
export function errorMessage(e: unknown) {
  const err = e as {
    response?: { data?: { message?: string; errors?: { message?: string }[] } };
  };
  if (err.response) {
    const data = err.response.data;
    // Zod validation failures put the useful text in errors[0]
    return data?.errors?.[0]?.message ?? data?.message ?? "Something went wrong. Please try again.";
  }
  return "Could not reach the server. Please try again.";
}
