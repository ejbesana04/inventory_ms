import { Modal, Icon } from '../../../components/ui';
import type { User } from '../../../interfaces/user';
import { useDateFormatter } from '../../../hooks';

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const ViewUserModal = ({ isOpen, onClose, user }: ViewUserModalProps) => {
  const dateFormat = useDateFormatter();

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="md"
      primaryAction={{
        label: 'Close',
        variant: 'primary',
        onClick: onClose,
      }}
    >
      <div className="space-y-4">
        {/* Avatar / Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon iconName="FaUser" className="text-3xl text-primary" />
          </div>
        </div>

        {/* User Info Grid */}
        <div className="border border-border-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between border-b border-border-muted pb-2">
            <span className="font-semibold text-text">Name:</span>
            <span className="text-text-muted">{user.name}</span>
          </div>
          <div className="flex justify-between border-b border-border-muted pb-2">
            <span className="font-semibold text-text">Email:</span>
            <span className="text-text-muted">{user.email}</span>
          </div>
          <div className="flex justify-between border-b border-border-muted pb-2">
            <span className="font-semibold text-text">Phone:</span>
            <span className="text-text-muted">{user.phone || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-border-muted pb-2">
            <span className="font-semibold text-text">Role:</span>
            <span className="text-xs capitalize px-2 py-1 rounded-md bg-primary/15 text-primary">
              {user.role}
            </span>
          </div>
          <div className="flex justify-between border-b border-border-muted pb-2">
            <span className="font-semibold text-text">Status:</span>
            <span className={`text-xs px-2 py-1 rounded-md ${
              user.is_active ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-text">Created At:</span>
            <span className="text-text-muted">{dateFormat.dateTime(user.created_at)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewUserModal;