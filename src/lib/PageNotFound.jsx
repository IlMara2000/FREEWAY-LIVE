import { useLocation, Link } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-7xl font-grotesk font-bold text-primary/20">404</h1>
        <p className="text-muted-foreground">
          Pagina <span className="text-foreground font-mono">"{location.pathname}"</span> non trovata.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          Torna al Focus Hub
        </Link>
      </div>
    </div>
  );
}