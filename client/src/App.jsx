import { NavLink, Route, Routes } from "react-router-dom";
import EventList from "./pages/EventList.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import RegisterSuccess from "./pages/RegisterSuccess.jsx";
import OrganizerLogin from "./pages/OrganizerLogin.jsx";
import OrganizerScan from "./pages/OrganizerScan.jsx";

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Campus Gate
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Events
          </NavLink>
          <NavLink to="/organizer">Organizer</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/register/success" element={<RegisterSuccess />} />
          <Route path="/organizer" element={<OrganizerLogin />} />
          <Route path="/organizer/scan" element={<OrganizerScan />} />
        </Routes>
      </main>
    </div>
  );
}
