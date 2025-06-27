import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { WalletContextProvider } from "./components/WalletContextProvider";
import { HomePage } from "./components/HomePage";
import { TokenOperations } from "./components/TokenOperations";
import { StakingOperations } from "./components/StakingOperations";
import { AMMOperations } from "./components/AMMOperations";
import "./index.css";
import "./styles/TokenOperations.css";
import "./styles/Navigation.css";
import "./styles/AMMOperations.css";
import "./styles/HomePage.css";
import "./styles/StakingOperations.css";

function App() {
  return (
    <WalletContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tokens" element={<TokenOperations />} />
          <Route path="/staking" element={<StakingOperations />} />
          <Route path="/amm" element={<AMMOperations />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </WalletContextProvider>
  );
}

export default App;
