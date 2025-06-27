import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Navigation.css";

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/tokens") return "tokens";
    if (path === "/staking") return "staking";
    if (path === "/amm") return "amm";
    return "";
  };

  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
  };

  const activeTab = getActiveTab();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => navigate("/")}>
          <div className="logo-icon">🚀</div>
          <span className="logo-text">Solana DeFi Hub</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "tokens" ? "active" : ""}`}
            onClick={() => handleTabChange("tokens")}
          >
            <span className="tab-icon">🪙</span>
            <span className="tab-text">SPL Tokens</span>
          </button>

          <button
            className={`nav-tab ${activeTab === "staking" ? "active" : ""}`}
            onClick={() => handleTabChange("staking")}
          >
            <span className="tab-icon">🔒</span>
            <span className="tab-text">Staking</span>
          </button>

          <button
            className={`nav-tab ${activeTab === "amm" ? "active" : ""}`}
            onClick={() => handleTabChange("amm")}
          >
            <span className="tab-icon">💱</span>
            <span className="tab-text">AMM</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
