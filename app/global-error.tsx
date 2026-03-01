"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <html lang="en" className="dark">
            <body className="antialiased min-h-screen bg-titan-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-titan-bg-light border border-white/10 rounded-xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong!</h1>
                    <p className="text-gray-400 mb-8">
                        A critical error occurred. Our team has been notified.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button
                            onClick={() => reset()}
                            className="bg-titan-primary hover:bg-titan-primary/90 text-white"
                        >
                            Try again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/'}
                            className="border-white/10 text-white hover:bg-white/5"
                        >
                            Go Home
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    );
}
