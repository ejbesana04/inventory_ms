import { Link } from "react-router-dom";
import { Button, Icon } from "../../components/ui";
import { PATHS } from "../../routes/path";

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <header className="w-full border-b border-border-muted bg-bg-light/95 backdrop-blur">
        <MotionlessHeader />
      </header>

      <main className="grow flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md rounded-2xl border border-border-muted bg-bg-light p-6 md:p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center mb-4">
              <Icon iconName="FaUserLock" className="text-warning text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-text">Cannot reset password online</h1>
            <p className="text-sm text-text-muted mt-2">
              For security reasons, password resets are handled by your organisation.
            </p>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg bg-info/10 p-4 text-sm">
              <p className="font-semibold text-text mb-2">To reset your password:</p>
              <ul className="list-disc list-inside text-text-muted space-y-1">
                <li>Contact your system <strong>administrator</strong> or <strong>manager</strong></li>
                <li>They will reset your password and provide temporary credentials</li>
                <li>After logging in, you can change your password from your profile</li>
              </ul>
            </div>

            <Link to={PATHS.LOGIN}>
              <Button variant="primary" fullWidth iconName="FaArrowLeft">
                Back to sign in
              </Button>
            </Link>

            <p className="text-center text-xs text-text-muted">
              If you are an administrator and need to reset a user's password, please use the <strong>Users</strong> section inside the application.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const MotionlessHeader = () => {
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
};

export default ForgotPassword;