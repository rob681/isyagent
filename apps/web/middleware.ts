export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/decisions/:path*",
    "/chat/:path*",
    "/memory/:path*",
    "/settings/:path*",
    "/usage/:path*",
    "/team/:path*",
  ],
};
