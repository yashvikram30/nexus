import { useEffect, useRef, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "../../config";

interface GoogleSectionProps {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

// Google button plus the "or" divider. Renders nothing when no client id is configured.
export default function GoogleSection({ onCredential, onError }: GoogleSectionProps) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  // Google's button only takes a pixel width (max 400), so match it to the form column
  useEffect(() => {
    if (box.current) setWidth(Math.min(400, Math.floor(box.current.offsetWidth)));
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <div ref={box} className="mt-8 flex justify-center">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLogin
            onSuccess={(res) =>
              res.credential
                ? onCredential(res.credential)
                : onError("Google did not return a credential. Please try again.")
            }
            onError={() => onError("Google sign-in was cancelled or failed. Please try again.")}
            text="continue_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width={width}
          />
        </GoogleOAuthProvider>
      </div>

      <div className="my-6 flex items-center gap-4 text-sm text-bark/70" aria-hidden>
        <span className="h-px flex-1 bg-moss" />
        or
        <span className="h-px flex-1 bg-moss" />
      </div>
    </>
  );
}
