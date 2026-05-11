<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\InAppNotification;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InAppNotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $notifications = InAppNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->take(50)
            ->get();

        return $this->success($notifications, 'Notifications loaded.');
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = InAppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return $this->success(['count' => $count], 'Unread count.');
    }

    public function markRead(Request $request, InAppNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }
        $notification->read_at = now();
        $notification->save();

        return $this->success($notification->fresh(), 'Marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        InAppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'All notifications marked read.');
    }
}
