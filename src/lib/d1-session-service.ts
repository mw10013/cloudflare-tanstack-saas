export type D1SessionService = ReturnType<typeof createD1SessionService>;

export interface CreateD1SessionServiceConfig {
  d1: D1Database;
  request: Request;
  sessionConstraint?: D1SessionConstraint;
}

export function createD1SessionService({
  d1,
  request,
  sessionConstraint,
}: CreateD1SessionServiceConfig) {
  let session: D1DatabaseSession | null = null;
  const bookmarkCookieName = "X-D1-Bookmark";

  const getCookieValue = (name: string) => {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return undefined;
    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return cookie ? cookie.slice(name.length + 1) : undefined;
  };

  const getSession = () => {
    if (!session) {
      const bookmark = getCookieValue(bookmarkCookieName);
      session = d1.withSession(bookmark ?? sessionConstraint);
    }
    return session;
  };

  const setSessionBookmarkCookie = (response: Response) => {
    if (!session) return;
    const bookmark = session.getBookmark();
    if (!bookmark) return;
    response.headers.append(
      "Set-Cookie",
      `${bookmarkCookieName}=${bookmark}; Path=/; HttpOnly; SameSite=Strict; Secure`,
    );
  };

  return {
    getSession,
    setSessionBookmarkCookie,
  };
}
