export function buildPublicProfilePath(username: string): string {
  return `/#/u/${encodeURIComponent(username)}`;
}

export function buildPublicProfileUrl(username: string, origin = window.location.origin): string {
  return `${origin}${buildPublicProfilePath(username)}`;
}
