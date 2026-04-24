<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\GatewayTransactionResource;
use App\Services\Gateways\MockPaymentGateway;
use App\Services\OnlinePaymentService;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly OnlinePaymentService $onlinePaymentService,
    ) {}

    /**
     * Webhook receiver — no auth middleware (provider signs requests).
     * Route: POST /api/v1/webhooks/payments/{provider}
     */
    public function handle(Request $request, string $provider): GatewayTransactionResource
    {
        $gateway = match ($provider) {
            'mock'  => new MockPaymentGateway,
            default => abort(404, "Unknown payment provider: {$provider}"),
        };

        $tx = $this->onlinePaymentService->handleWebhook($request, $gateway);

        return GatewayTransactionResource::make($tx);
    }
}
