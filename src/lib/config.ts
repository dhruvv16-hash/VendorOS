// Reusable configuration values
export const APP_BASE_PATH = '/projects/vendoros/app';

/**
 * Ensures a path is properly prefixed with the application's base path.
 * Important for client-side absolute URLs (like fetch) and static assets which Next.js doesn't rewrite automatically.
 */
export const withBasePath = (path: string): string => {
  if (path.startsWith(APP_BASE_PATH)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalizedPath}`;
};
