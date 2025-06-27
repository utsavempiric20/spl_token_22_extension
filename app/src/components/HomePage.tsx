import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    navigate(`/${tab}`);
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">Solana DeFi Hub</span>
          </h1>
          <p className="hero-subtitle">
            Your all-in-one platform for SPL tokens, staking, and automated
            market making
          </p>

          <div className="hero-actions">
            <button
              className="hero-button primary"
              onClick={() => handleNavigate("tokens")}
            >
              <span className="button-icon">🪙</span>
              <span className="button-text">
                <span className="button-title">SPL Tokens</span>
                <span className="button-subtitle">Create & Manage</span>
              </span>
            </button>
            <button
              className="hero-button secondary"
              onClick={() => handleNavigate("staking")}
            >
              <span className="button-icon">🔒</span>
              <span className="button-text">
                <span className="button-title">Staking</span>
                <span className="button-subtitle">Earn Rewards</span>
              </span>
            </button>
            <button
              className="hero-button accent"
              onClick={() => handleNavigate("amm")}
            >
              <span className="button-icon">💱</span>
              <span className="button-text">
                <span className="button-title">AMM Trading</span>
                <span className="button-subtitle">Swap & Liquidity</span>
              </span>
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card card-1">🚀</div>
          <div className="floating-card card-2">💎</div>
          <div className="floating-card card-3">⚡</div>
          <div className="floating-card card-4">🔮</div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">Explore Our Features</h2>
        <div className="features-grid">
          <div
            className="feature-card"
            onClick={() => handleNavigate("tokens")}
          >
            <div className="feature-icon">🪙</div>
            <h3>SPL Token Management</h3>
            <p>
              Create, mint, burn, and transfer SPL tokens with ease. Full
              control over your token ecosystem.
            </p>
            <div className="feature-highlights">
              <span className="highlight">Create Tokens</span>
              <span className="highlight">Mint & Burn</span>
              <span className="highlight">Transfer</span>
            </div>
            <button className="feature-button">Get Started →</button>
          </div>

          <div
            className="feature-card"
            onClick={() => handleNavigate("staking")}
          >
            <div className="feature-icon">🔒</div>
            <h3>Staking & Rewards</h3>
            <p>
              Stake your tokens and earn rewards. Participate in governance and
              secure the network.
            </p>
            <div className="feature-highlights">
              <span className="highlight">Stake Tokens</span>
              <span className="highlight">Earn Rewards</span>
              <span className="highlight">Governance</span>
            </div>
            <button className="feature-button">Start Staking →</button>
          </div>

          <div className="feature-card" onClick={() => handleNavigate("amm")}>
            <div className="feature-icon">💱</div>
            <h3>Automated Market Maker</h3>
            <p>
              Trade tokens instantly, provide liquidity, and earn fees from
              trading volume.
            </p>
            <div className="feature-highlights">
              <span className="highlight">Swap Tokens</span>
              <span className="highlight">Add Liquidity</span>
              <span className="highlight">Earn Fees</span>
            </div>
            <button className="feature-button">Start Trading →</button>
          </div>
        </div>
      </div>

      <div className="benefits-section">
        <h2 className="section-title">Why Choose Solana DeFi Hub?</h2>
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">⚡</div>
            <h4>Lightning Fast</h4>
            <p>
              Solana's high-performance blockchain ensures instant transactions
              and minimal fees.
            </p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🔒</div>
            <h4>Secure & Reliable</h4>
            <p>
              Built on Solana's battle-tested infrastructure with advanced
              security measures.
            </p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <h4>Low Fees</h4>
            <p>
              Enjoy minimal transaction costs compared to other blockchain
              networks.
            </p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🌐</div>
            <h4>Interoperable</h4>
            <p>
              Seamlessly interact with the broader Solana ecosystem and DeFi
              protocols.
            </p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>
            Connect your wallet and start exploring the future of decentralized
            finance
          </p>
          <div className="cta-buttons">
            <button
              className="cta-button primary"
              onClick={() => handleNavigate("tokens")}
            >
              Create Your First Token
            </button>
            <button
              className="cta-button secondary"
              onClick={() => handleNavigate("amm")}
            >
              Start Trading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
