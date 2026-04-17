import type { SVGProps, ReactNode } from 'react';

type RetroIconProps = Omit<SVGProps<SVGSVGElement>, 'role'> & {
  size?: number;
  alt?: string;
};

function RetroIcon({
  size = 16,
  alt = '',
  children,
  ...props
}: RetroIconProps & { children: ReactNode }) {
  const hasLabel = alt.length > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden={hasLabel ? undefined : true}
      aria-label={hasLabel ? alt : undefined}
      role={hasLabel ? 'img' : undefined}
      focusable="false"
      shapeRendering="crispEdges"
      {...props}
    >
      {children}
    </svg>
  );
}

const colors = {
  ink: 'var(--text-body)',
  muted: 'var(--text-muted)',
  card: 'var(--card-bg)',
  primary: 'var(--accent-primary)',
  secondary: 'var(--accent-secondary)',
  bg: 'var(--bg-primary)',
  yellow: '#ffd866',
  green: '#80d878',
};

export function Windows95MyComputer(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="5" y="6" width="22" height="15" fill={colors.ink} />
      <rect x="7" y="8" width="18" height="11" fill={colors.primary} />
      <rect x="10" y="22" width="12" height="3" fill={colors.ink} />
      <rect x="8" y="26" width="16" height="2" fill={colors.muted} />
      <rect x="10" y="10" width="12" height="2" fill={colors.card} />
      <rect x="10" y="14" width="8" height="2" fill={colors.card} />
    </RetroIcon>
  );
}

export function Windows95Notepad(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="7" y="4" width="18" height="24" fill={colors.ink} />
      <rect x="9" y="6" width="14" height="20" fill={colors.card} />
      <rect x="9" y="6" width="14" height="4" fill={colors.primary} />
      <rect x="11" y="13" width="10" height="2" fill={colors.muted} />
      <rect x="11" y="17" width="9" height="2" fill={colors.muted} />
      <rect x="11" y="21" width="7" height="2" fill={colors.muted} />
    </RetroIcon>
  );
}

export function Windows95Password(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="12" y="14" width="14" height="10" fill={colors.ink} />
      <rect x="14" y="16" width="10" height="6" fill={colors.secondary} />
      <path d="M11 14V10c0-4 3-7 7-7s7 3 7 7v4h-4v-4c0-2-1-3-3-3s-3 1-3 3v4z" fill={colors.ink} />
      <rect x="17" y="18" width="2" height="3" fill={colors.yellow} />
      <rect x="6" y="20" width="7" height="3" fill={colors.yellow} />
      <rect x="4" y="17" width="5" height="5" fill={colors.ink} />
      <rect x="5" y="18" width="3" height="3" fill={colors.yellow} />
    </RetroIcon>
  );
}

export function Windows95Mspaint(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <path d="M7 8h13c5 0 8 4 7 9-1 6-7 10-14 9-6-1-10-5-10-10 0-5 3-8 4-8z" fill={colors.ink} />
      <path d="M8 10h12c3 0 5 3 5 6-1 4-5 7-11 6-5-1-8-3-8-7 0-3 1-5 2-5z" fill={colors.card} />
      <rect x="10" y="13" width="4" height="4" fill={colors.primary} />
      <rect x="16" y="12" width="4" height="4" fill={colors.secondary} />
      <rect x="13" y="18" width="4" height="4" fill={colors.green} />
      <rect x="21" y="20" width="8" height="3" transform="rotate(-45 21 20)" fill={colors.yellow} />
      <rect x="19" y="22" width="4" height="3" transform="rotate(-45 19 22)" fill={colors.ink} />
    </RetroIcon>
  );
}

export function Windows95WordPad(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="6" y="4" width="18" height="24" fill={colors.ink} />
      <rect x="8" y="6" width="14" height="20" fill={colors.card} />
      <rect x="11" y="11" width="8" height="2" fill={colors.muted} />
      <rect x="11" y="15" width="8" height="2" fill={colors.muted} />
      <rect
        x="19"
        y="18"
        width="10"
        height="3"
        transform="rotate(-45 19 18)"
        fill={colors.yellow}
      />
      <rect x="17" y="21" width="4" height="3" transform="rotate(-45 17 21)" fill={colors.ink} />
    </RetroIcon>
  );
}

export function Windows95Configuration(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="14" y="3" width="4" height="6" fill={colors.ink} />
      <rect x="14" y="23" width="4" height="6" fill={colors.ink} />
      <rect x="3" y="14" width="6" height="4" fill={colors.ink} />
      <rect x="23" y="14" width="6" height="4" fill={colors.ink} />
      <rect x="7" y="7" width="5" height="5" fill={colors.ink} />
      <rect x="20" y="20" width="5" height="5" fill={colors.ink} />
      <circle cx="16" cy="16" r="9" fill={colors.ink} />
      <circle cx="16" cy="16" r="5" fill={colors.primary} />
      <circle cx="16" cy="16" r="2" fill={colors.card} />
    </RetroIcon>
  );
}

export function Windows98DateTime(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="5" y="6" width="22" height="20" fill={colors.ink} />
      <rect x="7" y="10" width="18" height="14" fill={colors.card} />
      <rect x="7" y="8" width="18" height="4" fill={colors.secondary} />
      <rect x="10" y="14" width="3" height="3" fill={colors.primary} />
      <rect x="15" y="14" width="3" height="3" fill={colors.muted} />
      <circle cx="21" cy="20" r="5" fill={colors.ink} />
      <circle cx="21" cy="20" r="3" fill={colors.card} />
      <rect x="21" y="17" width="1" height="4" fill={colors.ink} />
      <rect x="21" y="20" width="3" height="1" fill={colors.ink} />
    </RetroIcon>
  );
}

export function Windows95RecycleBin(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="10" y="9" width="12" height="3" fill={colors.ink} />
      <rect x="9" y="13" width="14" height="15" fill={colors.ink} />
      <rect x="11" y="15" width="10" height="11" fill={colors.card} />
      <rect x="13" y="16" width="2" height="9" fill={colors.muted} />
      <rect x="17" y="16" width="2" height="9" fill={colors.muted} />
      <rect x="13" y="5" width="6" height="3" fill={colors.ink} />
    </RetroIcon>
  );
}

export function FloppyDisk(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="5" y="4" width="22" height="24" fill={colors.ink} />
      <rect x="7" y="6" width="18" height="20" fill={colors.primary} />
      <rect x="10" y="6" width="12" height="7" fill={colors.card} />
      <rect x="19" y="7" width="3" height="5" fill={colors.ink} />
      <rect x="10" y="18" width="12" height="8" fill={colors.card} />
      <rect x="12" y="20" width="8" height="2" fill={colors.muted} />
    </RetroIcon>
  );
}

export function Winamp(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="4" y="6" width="24" height="20" fill={colors.ink} />
      <rect x="6" y="8" width="20" height="16" fill={colors.bg} />
      <rect x="8" y="10" width="16" height="4" fill={colors.primary} />
      <path d="M17 10 9 18h6l-2 6 9-10h-6z" fill={colors.yellow} />
      <rect x="8" y="21" width="3" height="2" fill={colors.secondary} />
      <rect x="13" y="21" width="3" height="2" fill={colors.secondary} />
      <rect x="18" y="21" width="3" height="2" fill={colors.secondary} />
    </RetroIcon>
  );
}

export function VisualStudioFace(props: RetroIconProps) {
  return (
    <RetroIcon {...props}>
      <rect x="5" y="5" width="22" height="22" fill={colors.ink} />
      <rect x="7" y="7" width="18" height="18" fill={colors.yellow} />
      <rect x="11" y="13" width="3" height="3" fill={colors.ink} />
      <rect x="18" y="13" width="3" height="3" fill={colors.ink} />
      <rect x="12" y="20" width="8" height="2" fill={colors.ink} />
      <rect x="10" y="18" width="2" height="2" fill={colors.ink} />
      <rect x="20" y="18" width="2" height="2" fill={colors.ink} />
    </RetroIcon>
  );
}
