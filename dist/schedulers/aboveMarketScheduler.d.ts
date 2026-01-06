#!/usr/bin/env node
export function executeAboveMarketForecast(): Promise<{
    success: boolean;
    duration: string;
    message: string;
    steps: {
        priceTierMapping: string;
        bgsForecast: string;
        adhocForecast: string;
        combineResults: string;
        totalDuration: string;
    };
    error?: undefined;
} | {
    success: boolean;
    error: any;
    duration?: undefined;
    message?: undefined;
    steps?: undefined;
}>;
//# sourceMappingURL=aboveMarketScheduler.d.ts.map