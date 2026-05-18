<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Support\UserRolePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'slug',
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'role' => UserRole::class,
    ];

    protected static function booted(): void
    {
        static::creating(function (self $user) {
            if (empty($user->slug)) {
                $user->slug = str()->slug($user->name . '-' . str()->random(6));
            }
        });
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function inAppNotifications()
    {
        return $this->hasMany(InAppNotification::class);
    }

    public function hasPermission(string $slug): bool
    {
        if ($this->role === UserRole::ADMIN) {
            return true;
        }

        if ($slug === 'users.manage' && UserRolePolicy::canManageUsers($this)) {
            return true;
        }

        return RolePermission::query()
            ->where('role', $this->role->value)
            ->whereHas('permission', fn (Builder $q) => $q->where('slug', $slug))
            ->exists();
    }
}