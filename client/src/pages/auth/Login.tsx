import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { Button, Icon } from "../../components/ui";
import { InputField } from "../../components/ui/forms";
import { PATHS } from "../../routes/path";
import { useAuth } from "../../contexts/AuthContext";
import { notify } from "../../util/notify";
import { FullPageLoading } from "../../routes/AuthGuards";

const Login = () => {
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (user) {
    return <Navigate to={PATHS.APP.DASHBOARD} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      notify.warning("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedEmail, password, remember);
      notify.success("Welcome back.");
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : "Unable to sign in.");
      notify.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="w-full border-b border-border-muted bg-bg-light/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link to={PATHS.LOGIN} className="flex gap-3 items-center">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Icon iconName="FaBoxesStacked" />
            </div>
            <div>
              <p className="text-text font-black text-lg tracking-tight">Inventory MS</p>
              <p className="text-text-muted text-xs -mt-1">Stock and Sales Control</p>
            </div>
          </Link>
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-info/15 text-info text-xs font-semibold">
            Secure sign-in
          </span>
        </div>
      </header>

      <main className="grow flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-border-muted bg-bg-light p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text">Sign in</h1>
              <p className="text-sm text-text-muted mt-1">
                Use your team credentials to access the operations dashboard.
              </p>
            </div>

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
              <InputField
                fullWidth
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                iconName="FaLock"
                placeholder="••••••••"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={isSubmitting}
                required
              />

              <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(ev) => setRemember(ev.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-border-muted text-primary focus:ring-primary/30"
                />
                <span className="text-text-muted">Keep me signed in on this device</span>
              </label>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                iconName="FaRightToBracket"
                isLoading={isSubmitting}
                loadingText="Signing in"
              >
                Sign in
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border-muted bg-bg-light/80 p-4 text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">
              Internal use only
            </p>
            <p className="text-sm text-text-muted mt-1">
              Need an account? Ask an administrator to create one from{" "}
              <span className="text-text font-medium">Users</span> after you sign in.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-muted py-4 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} Inventory MS · Warehouse desk access
      </footer>
    </div>
  );
};

export default Login;
