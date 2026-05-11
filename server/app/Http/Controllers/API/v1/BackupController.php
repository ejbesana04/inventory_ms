<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class BackupController extends Controller
{
    use ApiResponse;

    public function status(): JsonResponse
    {
        return $this->success([
            'configured' => false,
            'message' => 'Backup & restore is not configured on this server. Use mysqldump or a managed backup service for production.',
        ], 'Backup status.');
    }
}
