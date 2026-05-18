import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { Button, Icon } from "../../components/ui";
import { InputField } from "../../components/ui/forms";
import { PATHS } from "../../routes/path";
import AuthService from "../../services/AuthService";
import { notify } from "../../util/notify";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const hasValidLink = useMemo(() => Boolean(token.trim()), [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !passwordConfirmation) {
      notify.warning("Complete all fields.");
      return;
    }

    if (!hasValidLink) {
      notify.warning("Reset link is invalid or expired. Request a new one.");
      return;
    }

    if (password !== passwordConfirmation) {
      notify.warning("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await AuthService.resetPassword({
        email: trimmedEmail,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      setCompleted(true);
      notify.success("Password updated. You can sign in now.");
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(
        axiosError.response?.data?.message ||
          (error instanceof Error ? error.message : "Unable to reset password.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="w-full border-b border-border-muted bg-bg-light/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link to={PATHS.LOGIN} className="inline-flex gap-3 items-center">
            <motionlessLogo />
          </Link>
        </div>
      </header>

      <main className="grow flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md rounded-2xl border border-border-muted bg-bg-light p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text">
              {completed ? "Password updated" : "Set new password"}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {completed
                ? "Your password has been reset successfully."
                : hasValidLink
                  ? "Choose a new password for your account."
                  : "This reset link is invalid. Request a new link from the sign-in page."}
            </p>
          </div>

          {completed ? (
            <Link to={PATHS.LOGIN}>
              <Button variant="primary" fullWidth iconName="FaRightToBracket">
                Go to sign in
              </Button>
            </Link>
          ) : hasValidLink ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                fullWidth
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                iconName="FaEnvelope"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={isSubmitting}
                required
              />
              <InputField
                fullWidth
                label="New password"
                type="password"
                name="password"
                autoComplete="new-password"
                iconName="FaLock"
                placeholder="At least 8 characters"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={isSubmitting}
                required
              />
              <InputField
                fullWidth
                label="Confirm password"
                type="password"
                name="password_confirmation"
                autoComplete="new-password"
                iconName="FaLock"
                value={passwordConfirmation}
                onChange={(ev) => setPasswordConfirmation(ev.target.value)}
                disabled={isSubmitting}
                required
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                iconName="FaFloppyDisk"
                isLoading={isSubmitting}
                loadingText="Saving"
              >
                Reset password
              </Button>
              <Link
                to={PATHS.LOGIN}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <Link to={PATHS.FORGOT_PASSWORD}>
                <Button variant="primary" fullWidth iconName="FaPaperPlane">
                  Request new reset link
                </Button>
              </Link>
              <Link
                to={PATHS.LOGIN}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function motionlessLogo() {
  return (
    <>
      <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
        <Icon iconName="FaBoxesStacked" />
      </div>
      <div>
        <p className="text-text font-black text-lg tracking-tight">Inventory MS</p>
        <p className="text-text-muted text-xs -mt-1">Stock and Sales Control</p>
      </div>
    </>
  );
}

export default ResetPassword;
