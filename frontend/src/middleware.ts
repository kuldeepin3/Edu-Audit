import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to decode JWT payload (without signature verification, which is done by the backend)
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // decode using atob (Edge-safe)
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Cookies
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const payload = accessToken ? parseJwt(accessToken) : null;
  const userRole = payload?.role || null;
  const isAuthenticated = !!(accessToken || refreshToken);

  // Redirection parameters
  const redirectUrl = request.nextUrl.clone();

  // 1. ADMIN PROTECTION
  if (pathname.startsWith("/admin")) {
    const isAdminLogin = pathname === "/admin/login";
    
    if (!isAuthenticated && !isAdminLogin) {
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthenticated && isAdminLogin && userRole === "admin") {
      redirectUrl.pathname = "/admin/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthenticated && !isAdminLogin && userRole !== "admin") {
      redirectUrl.pathname = "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. AUDITOR (PORTAL) PROTECTION
  if (pathname.startsWith("/portal")) {
    const isPortalLogin = pathname === "/portal/login";
    
    if (!isAuthenticated && !isPortalLogin) {
      redirectUrl.pathname = "/portal/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthenticated && isPortalLogin && userRole === "auditor") {
      redirectUrl.pathname = "/portal/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthenticated && !isPortalLogin && userRole !== "auditor") {
      redirectUrl.pathname = "/portal/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. CITIZEN PROTECTION
  const citizenPaths = ["/dashboard", "/profile", "/my-complaints"];
  const isCitizenPath = citizenPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isGeneralLogin = pathname === "/login" || pathname === "/register";

  if (isCitizenPath) {
    if (!isAuthenticated) {
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (isAuthenticated && userRole !== "citizen") {
      // Non-citizen accessing citizen routes
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isGeneralLogin) {
    if (isAuthenticated && userRole === "citizen") {
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

// Route matching rules
export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/my-complaints/:path*",
    "/login",
    "/register",
  ],
};
