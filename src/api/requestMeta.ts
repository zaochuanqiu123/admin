export const LOGIN_AUTH_SCENE = 'login' as const;

export type AppAuthScene = typeof LOGIN_AUTH_SCENE;

export type AppRequestMeta = {
  authScene?: AppAuthScene;
  skipAuthRedirect?: boolean;
  skipGlobalBizError?: boolean;
};

export type AppRequestOptions = Record<string, any> & {
  meta?: AppRequestMeta;
  skipErrorHandler?: boolean;
};

export function getRequestMeta(
  options?: { meta?: AppRequestMeta } | null,
): AppRequestMeta | undefined {
  return options?.meta;
}

export function isLoginAuthScene(meta?: AppRequestMeta): boolean {
  return meta?.authScene === LOGIN_AUTH_SCENE;
}

export function shouldSkipAuthRedirect(meta?: AppRequestMeta): boolean {
  return Boolean(meta?.skipAuthRedirect || isLoginAuthScene(meta));
}

export function shouldSkipGlobalBizError(meta?: AppRequestMeta): boolean {
  return Boolean(meta?.skipGlobalBizError || isLoginAuthScene(meta));
}
