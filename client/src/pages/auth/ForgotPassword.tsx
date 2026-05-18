import { useState } from "react";
import { Link } from "react-router-dom";
import type { AxiosError } from "axios";
import { Button, Icon } from "../../components/ui";
import { InputField } from "../../components/ui/forms";
import { PATHS } from "../../routes/path";
import AuthService from "../../services/AuthService";
import { notify } from "../../util/notify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      notify.warning("Enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await AuthService.requestPasswordReset(trimmedEmail);
      setSent(true);
      notify.success("Check your email for reset instructions.");
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(
        axiosError.response?.data?.message ||
          (error instanceof Error ? error.message : "Unable to send reset link.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="w-full border-b border-border-muted bg-bg-light/95 backdrop-blur">
        <motionlessHeader />
      </header>

      <main className="grow flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md rounded-2xl border border-border-muted bg-bg-light p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text">
              {sent ? "Check your email" : "Forgot password"}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {sent
                ? "If an account exists for that address, we sent a link to reset your password."
                : "Enter the email on your account and we will send reset instructions."}
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Did not receive it? Check spam or try again with the same email.
              </p>
              <Button variant="outline" fullWidth onClick={() => setSent(false)}>
                Try another email
              </Button>
              <Link
                to={PATHS.LOGIN}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                fullWidth
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                iconName="FaEnvelope"
                placeholder="you@company.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={isSubmitting}
                required
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                iconName="FaPaperPlane"
                isLoading={isSubmitting}
                loadingText="Sending"
              >
                Send reset link
              </Button>
              <Link
                to={PATHS.LOGIN}
                className="block text-center text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

function motionlessHeader() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Link to={PATHS.LOGIN} className="inline-flex gap-3 items-center">
        <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icon iconName="FaBoxesStacked" />
        </div>
        <div>
          <p className="text-text font-black text-lg tracking-tight">Inventory MS</p>
          <p className="text-text-muted text-xs -mt-1">Stock and Sales Control</p>
        </div>
      </Link>
    </div>
  );
}

export default ForgotPassword;
