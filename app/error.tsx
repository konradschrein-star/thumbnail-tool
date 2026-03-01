"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log typical react runtime errors
        console.error("App Error Boundary Caught:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Application Error
                </h2>
                <p className="text-gray-400 max-w-[500px]">
                    We encountered an unexpected issue while rendering this page.
                    {error.message && (
                        <span className="block mt-2 text-sm text-red-400 font-mono bg-red-950/30 p-2 rounded border border-red-500/20">
                            {error.message}
                        </span>
                    )}
                </p>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={() => reset()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Try Again
                </Button>
            </div>
        </div>
    );
}
