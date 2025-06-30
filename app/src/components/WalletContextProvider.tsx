import {
  type FC,
  type ReactNode,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

// eslint-disable-next-line react-refresh/only-export-components
export const WalletContext = createContext<{
  wallet: unknown;
  connected: boolean;
}>({
  wallet: null,
  connected: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error(
      "useWalletContext must be used within a WalletContextProvider"
    );
  }
  return context;
};

export const WalletContextProvider: FC<Props> = ({ children }) => {
  const phantom = useMemo(() => new PhantomWalletAdapter(), []);

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={[phantom]} autoConnect>
        <WalletModalProvider>
          <WalletContextWrapper>{children}</WalletContextWrapper>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const WalletContextWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const wallet = useWallet();

  const contextValue = {
    wallet: wallet.wallet,
    connected: wallet.connected,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};
