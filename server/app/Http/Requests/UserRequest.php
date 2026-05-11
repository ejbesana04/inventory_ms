<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
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
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        $routeUser = $this->route('user');
        $userId = $routeUser instanceof User ? $routeUser->getKey() : $routeUser;

        $passwordRules = $this->isMethod('post')
            ? ['required', 'string', 'min:8', 'confirmed']
            : ['sometimes', 'string', 'min:8', 'confirmed'];

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
            'role' => ['required', Rule::in(UserRole::values())],
            'phone' => ['nullable', 'string', 'max:25'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
