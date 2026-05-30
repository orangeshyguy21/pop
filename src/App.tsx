import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { DonatePage } from "./components/DonatePage";
import { GuestbookListPage } from "./components/GuestbookListPage";
import { Header } from "./components/Header";
import { LoginModal } from "./components/LoginModal";
import { useAuthStore } from "./store/auth";

function App() {
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    // Rebuild a persisted Nostr session, if any.
    void useAuthStore.getState().restore();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header onLoginClick={() => setLoginOpen(true)} />

      <Routes>
        <Route path="/" element={<GuestbookListPage />} />
        <Route path="/p/:id" element={<DonatePage />} />
      </Routes>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default App;
