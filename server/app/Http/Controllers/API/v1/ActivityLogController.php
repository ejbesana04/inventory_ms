<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::query()->with('user:id,name')->latest();

        if ($search = $request->string('search')->toString()) {
            $query->where('description', 'like', "%{$search}%");
        }

        return $this->success($query->paginate(min($request->integer('per_page', 25), 100)), 'Activity logs loaded.');
    }
}
