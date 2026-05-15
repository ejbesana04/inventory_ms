import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { MainLayout } from '../../components/layouts';
import {
  Table,
  TableHeader,
  TableCell,
  TableBody,
  TableRow,
  TablePagination,
} from '../../components/ui/table/Table';
import { Button, ToastProvider, LoadingSpinner, Icon } from '../../components/ui';
import { InputField } from '../../components/ui/forms';
import CreateUserModal from './components/CreateUserModal';
import EditUserModal from './components/EditUserModal';
import ViewUserModal from './components/ViewUserModal';
import UserService from '../../services/UserSerivce';
import type { User } from '../../interfaces/user';
import { notify } from '../../util/notify';
import { useDebounce, useDateFormatter } from '../../hooks/index';
import { useAuth } from '../../contexts/AuthContext';
import { canManageUsers } from '../../util/userRoles';

/* =========================
   TYPES
========================= */
type SortState = {
  key: keyof User;
  direction: "asc" | "desc";
};

type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const Users = () => {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const userCanManage = canManageUsers(currentUser?.role);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  
  const [sort, setSort] = useState<SortState>({
    key: "name",
    direction: "asc",
  });

  const [filter, setFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const filters = {
    active: {
      icon: 'FaCheck',
      label: 'Active Users',
    },
    deleted: {
      icon: 'FaTrash',
      label: 'Deleted Users',
    },
    all: {
      icon: 'FaList',
      label: 'All Users',
    },
  } as const;
  
  const [searchTerm, setSearchTerm] = useState("");
  const isSearching = searchTerm?.trim() !== "";
  const debouncedSearchTerm = useDebounce(searchTerm);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =========================
     FETCH USERS
  ========================= */
  const fetchUsers = async (currentPage = 1, pageLimit = 10) => {
    setIsLoading(true);
    try {
      const response = await UserService.getAll({
        page: currentPage,
        limit: pageLimit,
        search: debouncedSearchTerm,
        sort_by: sort.key,
        sort_order: sort.direction,
        filter: filter,
      });

      // API shape: { status, message, data: paginator }
      const payload = (response as any)?.data ?? {};
      setUsers(payload.data ?? []);
      setPagination({
        current_page: payload.current_page ?? currentPage,
        last_page: payload.last_page ?? 1,
        per_page: payload.per_page ?? pageLimit,
        total: payload.total ?? 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userCanManage) {
      setIsLoading(false);
      return;
    }
    void fetchUsers(page, pageSize);
  }, [page, pageSize, sort, debouncedSearchTerm, filter, userCanManage]);

  /* =========================
     SORT HANDLER
  ========================= */
  const handleSort = (key: keyof User) => {
    setPage(1); // Reset to first page when sorting
    setSort((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  /* =========================
     PAGINATION
  ========================= */
  const totalPages = pagination.last_page;

  /* =========================
    Date Formmater 
  ========================= */

  const dateFormat = useDateFormatter();

  /* =========================
     MODAL STATE
  ========================= */
  const [isCreateUserModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const refreshList = () => {
    void fetchUsers(page, pageSize);
  };

  const handleCreateUserClose = () => {
    setIsCreateModalOpen(false);
    setPage(1);
    void fetchUsers(1, pageSize);
  };

  const handleDeleteUser = async (target: User) => {
    if (currentUser?.id === target.id) {
      notify.warning('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Soft-delete user "${target.name}"? They will appear under Deleted Users and can be restored.`)) {
      return;
    }
    try {
      await UserService.delete(target.id);
      notify.success('User moved to deleted.');
      refreshList();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      if (err.response?.status !== 403) {
        notify.error(err.response?.data?.message || 'Failed to delete user.');
      }
    }
  };

  const handleRestoreUser = async (target: User) => {
    if (!window.confirm(`Restore user "${target.name}"? They will be able to sign in again if active.`)) {
      return;
    }
    try {
      await UserService.restore(target.id);
      notify.success('User restored.');
      refreshList();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      if (err.response?.status !== 403) {
        notify.error(err.response?.data?.message || 'Failed to restore user.');
      }
    }
  };

  if (authLoading) {
    return (
      <MainLayout
        content={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="md" text="Loading…" />
          </div>
        }
      />
    );
  }

  if (!userCanManage) {
    return (
      <MainLayout
        content={
          <div className="rounded-2xl border border-border-muted bg-bg-light p-10 text-center space-y-3 max-w-lg mx-auto">
            <h1 className="text-xl font-bold text-text">Users</h1>
            <p className="text-sm text-text-muted">
              Your role does not include team account management. Ask an administrator if you need access.
            </p>
          </div>
        }
      />
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Search and Controls Bar */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <InputField
            label='Search'
            name='search'
            placeholder='Searching user by name, email.'
            fullWidth
            iconName='FaMagnifyingGlass'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant='primary' iconName='FaPlus' onClick={() => setIsCreateModalOpen(true)}>
          Create User
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="gap-2 bg-bg-light rounded-xl p-1 flex flex-wrap w-fit">
        {(Object.keys(filters) as Array<keyof typeof filters>).map((f) => {
          const { icon, label } = filters[f];
          return (
            <Button
              key={f}
              variant='primary'
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              iconName={icon}
              className={`relative px-4 py-2.5 rounded-lg font-semibold uppercase text-xs transition-all duration-300 flex items-center gap-2 group ${
                filter === f
                  ? 'bg-primary text-bg-dark shadow-lg shadow-primary/30'
                  : 'bg-transparent text-text hover:bg-bg-light/50'
              }`}
            >
              <span>{label}</span>

              {filter === f && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary/0 via-primary to-primary/0 rounded-full tab-indicator" />
              )}
            </Button>
          );
        })}
      </div>  

      <Table>
        <TableHeader>
          <tr>
            <TableCell
              isHeader
              sortKey="name"
              currentSort={sort}
              onSort={handleSort}
            >
              Name
            </TableCell>

            <TableCell
              isHeader
            >
              Email
            </TableCell>

            <TableCell isHeader>Phone</TableCell>

            <TableCell
              isHeader
              sortKey="role"
              currentSort={sort}
              onSort={handleSort}
            >
              Role
            </TableCell>
            <TableCell
              isHeader
            >
              Status
            </TableCell>
            <TableCell 
              isHeader
              sortKey="created_at"
              currentSort={sort}
              onSort={handleSort}
            >
              Created At
            </TableCell>
            <TableCell
              isHeader
            >
              Action
            </TableCell>
          </tr>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex items-center justify-center w-full">
                  <LoadingSpinner size="md" text={isSearching ? "Searching for users..." : "Loading Users...."}/>
                </div>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
                  
                  {/* Icon */}
                  <div className="w-16 h-16 flex items-center justify-center rounded-full">
                    <Icon iconName="FaBoxesStacked" className="text-3xl" />
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-text">
                    No Team Members Yet
                  </h2>

                  <p className="text-sm text-center text-text-muted">
                    Your inventory management team is empty. Start by adding users to manage your stock and operations.
                  </p>

                  <Button variant='primary' iconName='FaPlus' onClick={() => setIsCreateModalOpen(true)}>
                    Create User
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "-"}</TableCell>
                <TableCell>
                  <span className="text-xs capitalize px-2 py-1 rounded-md bg-primary/15 text-primary">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-md ${
                    user.is_active 
                      ? 'bg-success/15 text-success' 
                      : 'bg-warning/15 text-warning'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>{dateFormat.dateTime(user.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 items-center justify-start">
                    <Button
                      size="sm"
                      variant="outline"
                      iconName="FaEye"
                      tooltip="View user details"
                      tooltipPosition="top"
                      className="text-primary border-primary hover:bg-primary hover:text-bg-dark"
                      onClick={() => setViewUser(user)}
                    />
                    {filter !== 'deleted' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaPencil"
                          tooltip={
                            currentUser?.role === 'manager' && user.role === 'admin'
                              ? 'Managers cannot edit administrator accounts'
                              : 'Edit user'
                          }
                          tooltipPosition="top"
                          className="text-info border-info hover:bg-info hover:text-bg-dark"
                          disabled={currentUser?.role === 'manager' && user.role === 'admin'}
                          onClick={() => setEditUser(user)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaTrash"
                          tooltip={currentUser?.id === user.id ? 'You cannot delete yourself' : 'Delete user'}
                          tooltipPosition="top"
                          className="text-danger border-danger hover:bg-danger hover:text-bg-dark"
                          disabled={currentUser?.id === user.id}
                          onClick={() => void handleDeleteUser(user)}
                        />
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        iconName="FaRotateLeft"
                        tooltip="Restore user"
                        tooltipPosition="top"
                        className="text-success border-success hover:bg-success hover:text-bg-dark"
                        onClick={() => void handleRestoreUser(user)}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && users.length > 0 && (
        <TablePagination
          currentPage={pagination.current_page}
          totalPages={totalPages}
          totalResults={pagination.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
      
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={handleCreateUserClose}
      />
      {viewUser && (
        <ViewUserModal
          isOpen={Boolean(viewUser)}
          onClose={() => setViewUser(null)}
          user={viewUser}
        />
      )}
      {editUser && (
        <EditUserModal
          isOpen={Boolean(editUser)}
          onClose={() => setEditUser(null)}
          onSuccess={refreshList}
          user={editUser}
        />
      )}
      <ToastProvider />
    </div>
  );

  return <MainLayout content={content} />;
};

export default Users;