import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './routes/ProtectedRoute'
import Layout from './components/Layout'
import Feedback from './pages/Feedback'
import StudyRooms from './pages/StudyRooms'
import Events from './pages/Events'
import Admins from './pages/Admins'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/study-rooms" element={<StudyRooms />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/admins" element={<Admins />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App