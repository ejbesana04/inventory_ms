<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\QueryException;


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias([
            'permission' => \App\Http\Middleware\EnsurePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            $isDatabaseConnectionError = false;

            if ($e instanceof QueryException) {
                $previous = $e->getPrevious();
                if ($previous instanceof PDOException) {
                    $isDatabaseConnectionError = str_contains((string) $previous->getCode(), '2002')
                        || str_contains($previous->getMessage(), 'Connection refused')
                        || str_contains($previous->getMessage(), 'actively refused');
                }
            }

            if ($isDatabaseConnectionError) {
                return response()->json([
                    'status' => 'Error',
                    'message' => 'Database connection failed. Please start MySQL in XAMPP and verify DB settings.',
                    'data' => null,
                ], 503);
            }

            return null;
        });
    })->create();
