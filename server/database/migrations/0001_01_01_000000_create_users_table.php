<?php

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // USERS TABLE
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // Inventory System Roles
            $table->enum('role', UserRole::values())
                ->default(UserRole::STAFF->value);

            $table->string('phone')->nullable();
            $table->string('address')->nullable();

            $table->boolean('is_active')->default(true);

            // Security
            $table->rememberToken();

            // Timestamps
            $table->timestamps();

            // Soft Deletes
            $table->softDeletes();
        });

        // PASSWORD RESET TOKENS
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // SESSIONS
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->index();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->longText('payload');

            $table->integer('last_activity')->index();
        });

        // CATEGORIES TABLE
        Schema::create('categories', function (Blueprint $table) {
            $table->id();

            $table->string('name')->unique();
            $table->text('description')->nullable();

            $table->timestamps();
        });

        // SUPPLIERS TABLE
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();

            $table->timestamps();
        });

        // PRODUCTS TABLE
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            $table->foreignId('category_id')
                ->nullable()
                ->constrained('categories')
                ->nullOnDelete();

            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();

            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->unique();

            $table->string('name');
            $table->text('description')->nullable();

            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);

            $table->integer('stock_quantity')->default(0);
            $table->integer('reorder_level')->default(5);

            $table->date('expiry_date')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->softDeletes();
        });

        // SALES TABLE
        Schema::create('sales', function (Blueprint $table) {
            $table->id();

            $table->string('sale_no')->unique();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);

            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->decimal('change_amount', 10, 2)->default(0);

            $table->enum('payment_method', [
                'cash',
                'gcash',
                'card',
                'bank_transfer'
            ])->default('cash');

            $table->enum('status', [
                'completed',
                'pending',
                'cancelled'
            ])->default('completed');

            $table->timestamps();
        });

        // SALE ITEMS TABLE
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')
                ->constrained('sales')
                ->cascadeOnDelete();

            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete();

            $table->integer('quantity');

            $table->decimal('unit_price', 10, 2);

            $table->decimal('line_total', 10, 2);

            $table->timestamps();
        });

        // STOCK MOVEMENTS TABLE
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('movement_type', [
                'in',
                'out',
                'adjustment'
            ]);

            $table->integer('quantity');

            $table->integer('previous_stock')->default(0);

            $table->integer('new_stock')->default(0);

            $table->text('reason')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('products');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('categories');

        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};