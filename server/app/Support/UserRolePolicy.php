<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;

class UserRolePolicy
{
    public static function canManageUsers(User $user): bool
    {
        return in_array($user->role, [UserRole::ADMIN, UserRole::MANAGER], true);
    }

    /**
     * Roles the actor may assign when creating or updating users.
     *
     * @return list<string>
     */
    public static function assignableRoles(User $actor): array
    {
        return match ($actor->role) {
            UserRole::ADMIN => UserRole::values(),
            UserRole::MANAGER => [UserRole::STAFF->value, UserRole::MANAGER->value],
            default => [],
        };
    }

    public static function canManageUser(User $actor, User $target): bool
    {
        if ($actor->role === UserRole::ADMIN) {
            return true;
        }

        if ($actor->role === UserRole::MANAGER) {
            return $target->role !== UserRole::ADMIN;
        }

        return false;
    }

    public static function canAssignRole(User $actor, string $role): bool
    {
        return in_array($role, self::assignableRoles($actor), true);
    }
}
