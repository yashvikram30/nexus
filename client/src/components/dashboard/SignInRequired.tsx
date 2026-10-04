import { Link } from "react-router-dom";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-lichen";

export default function SignInRequired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lichen px-5 text-center font-body text-bark">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Sign in to see your dashboard.</h1>
      <p className="mt-4 max-w-md text-lg leading-8 text-bark/80">
        Your saved links are private to your account.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/signin"
          className={`rounded-md bg-plum px-6 py-3 font-semibold text-chalk transition-colors hover:bg-bark ${focus}`}
        >
          Sign in
        </Link>
        <Link to="/" className={`rounded px-2 py-3 font-medium underline underline-offset-4 ${focus}`}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
