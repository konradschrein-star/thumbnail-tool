'use client';

import { cn } from "@/lib/utils";

interface AuroraTextProps {
    children: React.ReactNode;
    className?: string;
}

export const AuroraText = ({ children, className }: AuroraTextProps) => {
    return (
        <span
            className={cn(
                "relative inline-block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-aurora",
                className,
            )}
        >
            {children}
            <style jsx>{`
        @keyframes aurora {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-aurora {
          background-size: 200% auto;
          animation: aurora 5s linear infinite;
        }
      `}</style>
        </span>
    );
};
