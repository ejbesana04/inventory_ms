<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use App\Support\UserRolePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->hasPermission('users.manage');
    }

    protected function prepareForValidation(): void
    {
        $password = $this->input('password');
        if ($password === null || $password === '') {
            $this->request->remove('password');
            $this->request->remove('password_confirmation');
        }
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        $routeUser = $this->route('user');
        $userId = $routeUser instanceof User ? $routeUser->getKey() : $routeUser;

        $passwordRules = $this->isMethod('post')
            ? ['required', 'string', 'min:8', 'confirmed']
            : ['sometimes', 'string', 'min:8', 'confirmed'];

        $actor = $this->user();
        $allowedRoles = $actor ? UserRolePolicy::assignableRoles($actor) : [];

        return [
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'slug')->ignore($userId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => $passwordRules,
            'role' => ['required', Rule::in($allowedRoles)],
            'phone' => ['nullable', 'string', 'max:25'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $actor = $this->user();
            if (! $actor) {
                return;
            }

            $routeUser = $this->route('user');
            if ($routeUser instanceof User && ! UserRolePolicy::canManageUser($actor, $routeUser)) {
                $validator->errors()->add('role', 'You are not allowed to modify this account.');
            }
        });
    }
}
