export type RuntimeEnv = Cloudflare.Env & {
  ADMIN_EMAILS?: string;
  FRONTEND_ORIGIN?: string;
};

export type RouteHandler = (
  request: Request,
  runtime: RuntimeEnv,
) => Promise<Response>;
