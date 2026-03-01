import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Deltagare from './pages/Deltagare.jsx';
import Rekryterare from './pages/Rekryterare.jsx';
import Matchning from './pages/Matchning.jsx';
import Export from './pages/Export.jsx';
import Installningar from './pages/Installningar.jsx';

function ProtectedLayout({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
        />
        <Route
          path="/deltagare"
          element={<ProtectedLayout><Deltagare /></ProtectedLayout>}
        />
        <Route
          path="/rekryterare"
          element={<ProtectedLayout><Rekryterare /></ProtectedLayout>}
        />
        <Route
          path="/matchning"
          element={<ProtectedLayout><Matchning /></ProtectedLayout>}
        />
        <Route
          path="/export"
          element={<ProtectedLayout><Export /></ProtectedLayout>}
        />
        <Route
          path="/installningar"
          element={<ProtectedLayout><Installningar /></ProtectedLayout>}
        />
      </Routes>
    </BrowserRouter>
  );
}
