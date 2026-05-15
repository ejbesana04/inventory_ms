import { useState, useEffect } from "react";
import Modal from "../../../components/ui/Modal";
import { notify } from "../../../util/notify";
import { InputField, PasswordInputField } from "../../../components/ui/forms";
import type { Role } from "../../../interfaces/user";
import UserService from "../../../services/UserSerivce";
import { useAuth } from "../../../contexts/AuthContext";
import { assignableRoles, roleLabel } from "../../../util/userRoles";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

interface UserFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    password: string;
    password_confirmation: string;
    role: Role;
    is_active: boolean;
}

interface FormErrors {
    [key: string]: string;
}

const CreateUserModal = ({ isOpen, onClose }: Props) => {
    const { user: currentUser } = useAuth();
    const roles = assignableRoles(currentUser?.role);
    const defaultRole: Role = roles.includes("staff") ? "staff" : roles[0] ?? "staff";

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const initialFormState: UserFormData = {
        name: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        password_confirmation: "",
        role: defaultRole,
        is_active: true,
    };

    const [form, setForm] = useState<UserFormData>(initialFormState);

    useEffect(() => {
        if (isOpen) {
            setForm({ ...initialFormState, role: defaultRole });
        }
    }, [isOpen, defaultRole]);

    const handleChange = (name: string, value: string | Role) => {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear field error when user starts typing
        if (errors[name]) {
            setErrors((prev) => {
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setErrors({});

        try {
            await UserService.create({
                name: form.name,
                email: form.email,
                phone: form.phone || null,
                address: form.address || null,
                password: form.password,
                password_confirmation: form.password_confirmation,
                role: form.role,
                is_active: form.is_active,
            });
            notify.success("User created successfully!");
            setForm({...initialFormState});
            setErrors({});
            onClose();

        } catch (error: any) {
            // Extract validation errors from Laravel response
            const validationErrors = error.response?.data?.errors;
            
            if (validationErrors && typeof validationErrors === 'object') {
                // Convert array errors to strings (take first error message for each field)
                const formattedErrors: FormErrors = {};
                for (const [field, messages] of Object.entries(validationErrors)) {
                    if (Array.isArray(messages) && messages.length > 0) {
                        formattedErrors[field] = messages[0] as string;
                    }
                }
                notify.error("Some fields are incomplete or contain invalid information. Please review them.");
                setErrors(formattedErrors);
            } else if (error.response?.status !== 403) {
                notify.error(error?.message || "Failed to create user");
            }
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create User"
            size="md"
            primaryAction={{
                label: "Create",
                onClick: handleSubmit,
                variant: "primary",
                iconName: "FaFloppyDisk",
                isLoading,
                loadingText: "Creating User..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: "secondary",
            }}
            >
            <form className="space-y-4">
                <InputField
                    name="name"
                    label="Name"
                    type="text"
                    placeholder="Enter full name"
                    required
                    fullWidth
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    iconName="FaUser"
                    error={errors.name}
                />

                <InputField
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="Enter email address"
                    required
                    fullWidth
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    iconName="FaEnvelope"
                    error={errors.email}
                />

                <InputField
                    name="phone"
                    label="Phone"
                    type="tel"
                    placeholder="Enter phone number"
                    fullWidth
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    iconName="FaPhone"
                    error={errors.phone}
                />

                <InputField
                    name="address"
                    label="Address"
                    type="text"
                    placeholder="Enter address"
                    fullWidth
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    iconName="FaLocationDot"
                    error={errors.address}
                />

                <PasswordInputField
                    name="password"
                    label="Password"
                    placeholder="Enter password"
                    required
                    fullWidth
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    error={errors.password}
                />

                <PasswordInputField
                    name="password_confirmation"
                    label="Confirm Password"
                    placeholder="Confirm password"
                    required
                    fullWidth
                    value={form.password_confirmation}
                    onChange={(e) => handleChange("password_confirmation", e.target.value)}
                    error={errors.password_confirmation}
                />
                
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-text-muted font-semibold uppercase tracking-wider ml-1 flex items-center gap-1">
                        Role
                    </label>
                    <select
                        name="role"
                        value={form.role}
                        onChange={(e) => handleChange("role", e.target.value as Role)}
                        className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 text-sm text-text"
                    >
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {roleLabel(role)}
                            </option>
                        ))}
                    </select>
                    {errors.role ? <p className="text-xs text-danger">{errors.role}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="create_is_active"
                        checked={form.is_active}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-border focus:ring-primary"
                    />
                    <label htmlFor="create_is_active" className="text-sm text-text">
                        Active (user can sign in)
                    </label>
                </div>

            </form>
        </Modal>
    );
};

export default CreateUserModal;