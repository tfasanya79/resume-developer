const FALLBACK_BASE_PATH = "/cv-builder";

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function getAppBasePath(pathname?: string): string {
  const currentPath = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (
    currentPath === FALLBACK_BASE_PATH ||
    currentPath.startsWith(`${FALLBACK_BASE_PATH}/`)
  ) {
    return FALLBACK_BASE_PATH;
  }

  return process.env.NEXT_PUBLIC_BASE_PATH ?? FALLBACK_BASE_PATH;
}

export function withAppBasePath(path: string, pathname?: string): string {
  const normalizedPath = normalizePath(path);
  if (
    normalizedPath === FALLBACK_BASE_PATH ||
    normalizedPath.startsWith(`${FALLBACK_BASE_PATH}/`)
  ) {
    return normalizedPath;
  }

  const basePath = getAppBasePath(pathname);
  if (!basePath) return normalizedPath;
  return normalizedPath === "/" ? basePath : `${basePath}${normalizedPath}`;
}