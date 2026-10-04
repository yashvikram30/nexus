import { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSection from "../components/auth/GoogleSection";
import { errorMessage, field, focus, googleSignin, passwordSignin } from "../components/auth/authUtils";
import { BACKEND_URL, GOOGLE_CLIENT_ID } from "../config";

const MIN_PASSWORD = 8;

const Signup = () => {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Runs a request that resolves to a token, then stores it and opens the dashboard
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

  function signup(e: FormEvent) {
    e.preventDefault();
    const username = usernameRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    // Create the account, then sign straight in so there is no second form to fill
    run(async () => {
      await axios.post(`${BACKEND_URL}/api/v1/signup`, { username, password });
      return passwordSignin(username, password);
    });
  }

  return (
    <AuthLayout
      headline="Save once. Ask whenever you need it."
      blurb="Create an account and start collecting links, videos, posts and notes in one place."
      title="Create your account"
      subtitle="Sign up with Google or choose a username and password."
    >
      <GoogleSection onCredential={(c) => run(() => googleSignin(c))} onError={setError} />

      <form onSubmit={signup} className={GOOGLE_CLIENT_ID ? "" : "mt-8"}>
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
            autoComplete="new-password"
            required
            aria-describedby="password-hint"
            className={field}
          />
          <span id="password-hint" className="mt-2 block text-sm font-normal text-bark/70">
            At least {MIN_PASSWORD} characters.
          </span>
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-bark/80">
        Already have an account?{" "}
        <Link to="/signin" className={`rounded font-semibold underline underline-offset-4 ${focus}`}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
