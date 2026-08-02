/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { useStore } from './store/useStore';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps> & Readonly<{ children?: React.ReactNode }>;
  declare setState: React.Component<ErrorBoundaryProps, ErrorBoundaryState>['setState'];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReload() {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8 gap-6">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold">Error inesperado en SewerWorks</h1>
          <p className="text-gray-400 text-center max-w-md">
            Ocurrió un error de renderizado. Su proyecto puede haberse guardado automáticamente en el navegador.
          </p>
          <pre className="bg-gray-800 text-red-400 text-xs p-4 rounded max-w-lg w-full overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const hasData = useStore(s => Object.keys(s.nodes).length > 0 || Object.keys(s.conduits).length > 0);
  const theme = useStore(s => s.theme);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  useEffect(() => {
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasData]);

  return <Layout />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
