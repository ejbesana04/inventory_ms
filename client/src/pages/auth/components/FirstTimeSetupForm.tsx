import { useState } from "react";
import type { AxiosError } from "axios";
import { Button } from "../../../components/ui";
import { InputField, PasswordInputField } from "../../../components/ui/forms";
import SetupService, { type FirstUserPayload } from "../../../services/SetupService";
import { notify } from "../../../util/notify";

type FormErrors = Record<string, string>;

type Props = {
  onSuccess: () => void;
  onBackToSignIn: () => void;
};

const FirstTimeSetupForm = ({ onSuccess, onBackToSignIn }: Props) => {
  const [form, setForm] = useState<FirstUserPayload>({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    password_confirmation: "",
    role: "admin",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: keyof FirstUserPayload, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await SetupService.createFirstUser({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        address: form.address?.trim() || null,
      });
      notify.success("First account created. Welcome!");
      onSuccess();
    } catch (error) {
      const err = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const formatted: FormErrors = {};
        for (const [field, messages] of Object.entries(validationErrors)) {
          if (Array.isArray(messages) && messages.length > 0) {
            formatted[field] = messages[0] as string;
          }
        }
        setErrors(formatted);
        notify.error("Please review the highlighted fields.");
      } else {
        notify.error(err.response?.data?.message || "Unable to create account. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="mb-2 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-text">
        No accounts exist yet. Create the first administrator or manager account to recover access
        after a database reset.
      </div>

      <InputField
        fullWidth
        label="Name"
        name="name"
        required
        iconName="FaUser"
        placeholder="Full name"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
        disabled={isSubmitting}
        error={errors.name}
      />
      <InputField
        fullWidth
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        iconName="FaEnvelope"
        placeholder="you@company.com"
        value={form.email}
        onChange={(e) => handleChange("email", e.target.value)}
        disabled={isSubmitting}
        error={errors.email}
      />
      <InputField
        fullWidth
        label="Phone"
        name="phone"
        type="tel"
        iconName="FaPhone"
        placeholder="Phone number"
        value={form.phone ?? ""}
        onChange={(e) => handleChange("phone", e.target.value)}
        disabled={isSubmitting}
        error={errors.phone}
      />
      <InputField
        fullWidth
        label="Address"
        name="address"
        iconName="FaLocationDot"
        placeholder="Address"
        value={form.address ?? ""}
        onChange={(e) => handleChange("address", e.target.value)}
        disabled={isSubmitting}
        error={errors.address}
      />
      <PasswordInputField
        fullWidth
        label="Password"
        name="password"
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={form.password}
        onChange={(e) => handleChange("password", e.target.value)}
        disabled={isSubmitting}
        error={errors.password}
      />
      <PasswordInputField
        fullWidth
        label="Confirm password"
        name="password_confirmation"
        required
        autoComplete="new-password"
        placeholder="Confirm password"
        value={form.password_confirmation}
        onChange={(e) => handleChange("password_confirmation", e.target.value)}
        disabled={isSubmitting}
        error={errors.password_confirmation}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm text-text-muted font-semibold uppercase tracking-wider ml-1">
          Role
        </label>
        <select
          name="role"
          value={form.role}
          onChange={(e) =>
            handleChange("role", e.target.value as FirstUserPayload["role"])
          }
          disabled={isSubmitting}
          className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
        </select>
        {errors.role ? <p className="text-xs text-danger">{errors.role}</p> : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        iconName="FaUserPlus"
        isLoading={isSubmitting}
        loadingText="Creating account"
      >
        Create first account
      </Button>

      <button
        type="button"
        onClick={onBackToSignIn}
        disabled={isSubmitting}
        className="w-full text-sm text-text-muted hover:text-text transition-colors"
      >
        Back to sign in
      </button>
    </form>
  );
};

export default FirstTimeSetupForm;
