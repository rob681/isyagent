export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/decisions/:path*",
    "/chat/:path*",
    "/memory/:path*",
    "/settings/:path*",
    "/usage/:path*",
    "/team/:path*",
    "/clients/:path*",
    "/planner/:path*",
    "/reports/:path*",
  ],
};
