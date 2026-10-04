import { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSection from "../components/auth/GoogleSection";
import { errorMessage, field, focus, googleSignin, passwordSignin } from "../components/auth/authUtils";
import { GOOGLE_CLIENT_ID } from "../config";

const Signin = () => {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Runs a sign-in request, then stores the token and moves on, or shows the error
  async function run(request: () => Promise<string>) {
    setError("");
    setLoading(true);
    try {
      localStorage.setItem("token", await request());
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  function signin(e: FormEvent) {
    e.preventDefault();
    run(() => passwordSignin(usernameRef.current?.value ?? "", passwordRef.current?.value ?? ""));
  }

  return (
    <AuthLayout
      headline="Welcome back. Your saved links are ready to answer."
      blurb="Pick up where you left off and ask anything you have saved."
      title="Sign in"
      subtitle="Use your Nexus account or continue with Google."
    >
      <GoogleSection onCredential={(c) => run(() => googleSignin(c))} onError={setError} />

      <form onSubmit={signin} className={GOOGLE_CLIENT_ID ? "" : "mt-8"}>
        <label className="block font-medium" htmlFor="username">
          Username
          <input id="username" ref={usernameRef} type="text" autoComplete="username" required className={field} />
        </label>

        <label className="mt-5 block font-medium" htmlFor="password">
          Password
          <input
            id="password"
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            required
            className={field}
          />
        </label>

        {error && (
          <p role="alert" className="mt-5 rounded-md border border-red-800/40 bg-chalk px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`mt-6 w-full rounded-md bg-plum px-6 py-3 font-semibold text-chalk transition-colors hover:bg-bark disabled:opacity-60 ${focus}`}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-bark/80">
        New to Nexus?{" "}
        <Link to="/signup" className={`rounded font-semibold underline underline-offset-4 ${focus}`}>
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signin;
