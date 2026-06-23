import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ErpRauppAuth from './components/ErpRauppAuth';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica a sessão atual ao carregar o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças (login, logout) em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Rota de Login */}
        <Route 
          path="/" 
          element={!session ? <ErpRauppAuth /> : <Navigate to="/dashboard" replace />} 
        />
        
        {/* Rota Protegida do Dashboard */}
        <Route 
          path="/dashboard" 
          element={session ? <Dashboard /> : <Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
};

export default App;