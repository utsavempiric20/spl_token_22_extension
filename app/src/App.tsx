import { WalletContextProvider } from "./components/WalletContextProvider";
import { TokenOperations } from "./components/TokenOperations";
import "./styles/TokenOperations.css";

function App() {
  return (
    <WalletContextProvider>
      <div className="App">
        <h1>Solana SPL Token Manager</h1>
        <TokenOperations />
      </div>
    </WalletContextProvider>
  );
}

export default App;
