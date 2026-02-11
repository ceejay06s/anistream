import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            AniStream
          </Link>
          <nav className="nav">
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </Link>
            <Link 
              to="/search" 
              className={location.pathname === '/search' ? 'active' : ''}
            >
              Search
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
