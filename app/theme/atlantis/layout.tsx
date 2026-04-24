import './theme.css';

export default function AtlantisThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="atlantis-theme-scope">{children}</div>;
}
