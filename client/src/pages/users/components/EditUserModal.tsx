import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { Modal } from '../../../components/ui';
import { InputField, PasswordInputField, Select } from '../../../components/ui/forms';
import UserService from '../../../services/UserSerivce';
import { notify } from '../../../util/notify';
import type { User, Role } from '../../../interfaces/user';
import { useAuth } from '../../../contexts/AuthContext';
import { assignableRoles, roleLabel } from '../../../util/userRoles';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: User;
}

type FormErrors = Record<string, string>;

const EditUserModal = ({ isOpen, onClose, onSuccess, user }: EditUserModalProps) => {
  const { user: currentUser } = useAuth();
  const roles = assignableRoles(currentUser?.role);
  const isAdminTarget = user.role === 'admin';
  const managerCannotEditAdmin = currentUser?.role === 'manager' && isAdminTarget;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'staff' as Role,
    is_active: true,
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const role: Role = ['admin', 'manager', 'staff'].includes(user.role) ? user.role : 'staff';
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        role,
        is_active: user.is_active ?? true,
        password: '',
        password_confirmation: '',
      });
      setErrors({});
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      notify.warning('Name and email are required.');
      return;
    }

    if (formData.password || formData.password_confirmation) {
      if (formData.password.length < 8) {
        notify.warning('Password must be at least 8 characters.');
        return;
      }
      if (formData.password !== formData.password_confirmation) {
        notify.warning('Password confirmation does not match.');
        return;
      }
    }

    setIsSaving(true);
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        role: formData.role,
        is_active: formData.is_active,
      };
      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      await UserService.update(user.id, payload);
      notify.success(`User "${formData.name.trim()}" updated successfully.`);
      onSuccess?.();
      onClose();
    } catch (error) {
      const err = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const status = err.response?.status;
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        const formatted: FormErrors = {};
        for (const [field, messages] of Object.entries(validationErrors)) {
          if (Array.isArray(messages) && messages.length > 0) {
            formatted[field] = messages[0] as string;
          }
        }
        setErrors(formatted);
        notify.error(err.response?.data?.message || 'Please fix the highlighted fields.');
      } else if (status !== 403) {
        notify.error(err.response?.data?.message || 'Failed to update user.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      size="md"
      primaryAction={{
        label: 'Save Changes',
        iconName: 'FaFloppyDisk',
        onClick: () => void handleSubmit(),
        isLoading: isSaving,
        loadingText: 'Saving...',
      }}
      secondaryAction={{
        label: 'Cancel',
        variant: 'secondary',
        onClick: onClose,
      }}
    >
      <div className="space-y-4">
        <InputField
          fullWidth
          required
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
        />
        <InputField
          fullWidth
          required
          type="email"
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />
        <InputField
          fullWidth
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+63 XXX XXX XXXX"
          error={errors.phone}
        />
        <InputField
          fullWidth
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Address"
          error={errors.address}
        />
        <Select
          fullWidth
          label="Role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={managerCannotEditAdmin}
          options={roles.map((role) => ({ value: role, label: roleLabel(role) }))}
          error={errors.role}
        />
        {managerCannotEditAdmin ? (
          <p className="text-xs text-text-muted">
            Manager accounts cannot change administrator roles.
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 rounded border-border focus:ring-primary"
          />
          <label htmlFor="is_active" className="text-sm text-text">
            Active (user can log in and access system)
          </label>
        </div>
        <p className="text-xs text-text-muted font-semibold uppercase tracking-wide">Change password (optional)</p>
        <PasswordInputField
          fullWidth
          name="password"
          label="New password"
          placeholder="Leave blank to keep current password"
          value={formData.password}
          onChange={(e) => {
            setFormData((p) => ({ ...p, password: e.target.value }));
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
        />
        <PasswordInputField
          fullWidth
          name="password_confirmation"
          label="Confirm new password"
          placeholder="Confirm new password"
          value={formData.password_confirmation}
          onChange={(e) => {
            setFormData((p) => ({ ...p, password_confirmation: e.target.value }));
            if (errors.password_confirmation) setErrors((prev) => ({ ...prev, password_confirmation: '' }));
          }}
          error={errors.password_confirmation}
        />
      </div>
    </Modal>
  );
};

export default EditUserModal;
