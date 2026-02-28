export { auth as default } from "@/lib/auth"

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/:path*",
        "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"
    ]
}
