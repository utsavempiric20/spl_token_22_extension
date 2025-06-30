import { type FC, useState } from "react";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { Navigation } from "./Navigation";
import idl from "../idl/spl.json";
import type { Spl } from "../idl/spl.ts";

function associatedAddress({
  mint,
  owner,
}: {
  mint: PublicKey;
  owner: PublicKey;
}): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_PROGRAM_ID
  )[0];
}

export const TokenOperations: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<
    "create" | "mintBurn" | "accountManagement"
  >("create");
  const [status, setStatus] = useState("");

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenUri, setTokenUri] = useState("");
  const [decimals, setDecimals] = useState("9");

  const [mintAddress, setMintAddress] = useState("");
  const [amount, setAmount] = useState("");

  const [targetAddress, setTargetAddress] = useState("");

  const getProvider = () => {
    if (!wallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = wallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    const provider = new AnchorProvider(connection, anchorWallet, opts);
    return provider;
  };

  const getProgram = (provider: AnchorProvider) => {
    const program = new Program(idl as Idl, provider);
    return program as unknown as Program<Spl>;
  };

  const showStatus = (message: string, isError = false) => {
    setStatus(`${isError ? "❌ " : "✅ "}${message}`);
    setTimeout(() => setStatus(""), 5000);
  };

  const createToken = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Wallet not connected!");
      const provider = getProvider();
      const program = getProgram(provider);

      const tokenDecimals = parseInt(decimals) || 9;

      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const [extraMetasPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), mintPda.toBuffer()],
        program.programId
      );

      const ata = associatedAddress({
        mint: mintPda,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .createMintAccount(tokenDecimals, tokenName, tokenSymbol, tokenUri)
        .accountsStrict({
          payer: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          receiver: provider.wallet.publicKey,
          mint: mintPda,
          mintTokenAccount: ata,
          extraMetasAccount: extraMetasPda,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      setMintAddress(mintPda.toString());
      showStatus(
        `✅ Token created!\nMint PDA: ${mintPda.toString()}\nTx: ${tx}`
      );
    } catch (error: unknown) {
      console.error("Program execution error:", error);
      if (error instanceof Error && "logs" in error) {
        console.error("Transaction logs:", error.logs);
      }
      const errMsg =
        error instanceof Error ? error.message : JSON.stringify(error);
      showStatus(`Error creating token: ${errMsg}`, true);
    }
  };

  const mintTokens = async () => {
    try {
      if (!mintAddress) throw new Error("Please enter a mint address");

      const provider = getProvider();
      const program = getProgram(provider);
      const mintPubkey = new PublicKey(mintAddress);

      const ata = associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .mintTokens(new BN(amount))
        .accountsStrict({
          mint: mintPubkey,
          to: ata,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens minted successfully!\nTx: ${tx}`);
    } catch (error: unknown) {
      console.error("Error minting tokens:", error);
      showStatus(
        `Error minting tokens: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const burnTokens = async () => {
    try {
      if (!mintAddress) throw new Error("Please enter a mint address");

      const provider = getProvider();
      const program = getProgram(provider);
      const mintPubkey = new PublicKey(mintAddress);

      const ata = associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .burnTokens(new BN(amount))
        .accountsStrict({
          mint: mintPubkey,
          from: ata,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens burned successfully!\nTx: ${tx}`);
    } catch (error: unknown) {
      console.error("Error burning tokens:", error);
      showStatus(
        `Error burning tokens: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const freezeAccount = async () => {
    try {
      if (!mintAddress || !targetAddress)
        throw new Error("Please enter both mint and target addresses");

      const provider = getProvider();
      const program = getProgram(provider);

      const tx = await program.methods
        .freezeTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account frozen successfully!\nTx: ${tx}`);
    } catch (error: unknown) {
      console.error("Error freezing account:", error);
      showStatus(
        `Error freezing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const thawAccount = async () => {
    try {
      if (!mintAddress || !targetAddress)
        throw new Error("Please enter both mint and target addresses");

      const provider = getProvider();
      const program = getProgram(provider);

      const tx = await program.methods
        .thawTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account thawed successfully!\nTx: ${tx}`);
    } catch (error: unknown) {
      console.error("Error thawing account:", error);
      showStatus(
        `Error thawing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const closeAccount = async () => {
    try {
      if (!targetAddress) throw new Error("Please enter a target address");

      const provider = getProvider();
      const program = getProgram(provider);

      const tx = await program.methods
        .closeTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          destination: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account closed successfully!\nTx: ${tx}`);
    } catch (error: unknown) {
      console.error("Error closing account:", error);
      showStatus(
        `Error closing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const renderCreateTab = () => (
    <div className="token-tab-content">
      <div className="token-card">
        <h3>Create New Token</h3>
        <div className="token-container">
          <div className="token-input-group">
            <label>Token Name</label>
            <input
              type="text"
              placeholder="e.g., My Token"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
          </div>

          <div className="token-input-group">
            <label>Token Symbol</label>
            <input
              type="text"
              placeholder="e.g., MTK"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
            />
          </div>

          <div className="token-input-group">
            <label>Token URI</label>
            <input
              type="text"
              placeholder="https://example.com/metadata.json"
              value={tokenUri}
              onChange={(e) => setTokenUri(e.target.value)}
            />
          </div>

          <div className="token-input-group">
            <label>Decimals</label>
            <input
              type="number"
              placeholder="9"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              min="0"
              max="9"
            />
          </div>

          <button className="token-button primary" onClick={createToken}>
            Create Token
          </button>
        </div>
      </div>
    </div>
  );

  const renderMintBurnTab = () => (
    <div className="token-tab-content">
      <div className="token-card">
        <h3>Mint & Burn Tokens</h3>
        <div className="token-container">
          <div className="token-input-group">
            <label>Mint Address</label>
            <input
              type="text"
              placeholder="Enter mint address"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
            />
          </div>

          <div className="token-input-group">
            <label>Amount</label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="1"
            />
          </div>

          <div className="button-group">
            <button className="token-button success" onClick={mintTokens}>
              Mint Tokens
            </button>
            <button className="token-button danger" onClick={burnTokens}>
              Burn Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountManagementTab = () => (
    <div className="token-tab-content">
      <div className="token-card">
        <h3>Account Management</h3>
        <div className="token-container">
          <div className="token-input-group">
            <label>Mint Address</label>
            <input
              type="text"
              placeholder="Enter mint address"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
            />
          </div>

          <div className="token-input-group">
            <label>Target Token Account Address</label>
            <input
              type="text"
              placeholder="Enter target account address"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
            />
          </div>

          <div className="button-group">
            <button className="token-button warning" onClick={freezeAccount}>
              Freeze Account
            </button>
            <button className="token-button info" onClick={thawAccount}>
              Thaw Account
            </button>
            <button className="token-button danger" onClick={closeAccount}>
              Close Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="token-operations">
      <Navigation />
      <div className="token-header">
        <h2>SPL Token Management</h2>
        <p>Create, mint, burn, and manage your SPL tokens</p>
      </div>

      <div className="token-content">
        <WalletMultiButton />

        {status && (
          <div
            className={`status-message ${
              status.includes("❌") ? "error" : "success"
            }`}
          >
            <p>{status}</p>
          </div>
        )}

        {wallet.publicKey ? (
          <>
            <div className="token-tabs">
              <button
                className={`token-tab ${
                  activeTab === "create" ? "active" : ""
                }`}
                onClick={() => setActiveTab("create")}
              >
                🏗️ Create Token
              </button>
              <button
                className={`token-tab ${
                  activeTab === "mintBurn" ? "active" : ""
                }`}
                onClick={() => setActiveTab("mintBurn")}
              >
                🪙 Mint & Burn
              </button>
              <button
                className={`token-tab ${
                  activeTab === "accountManagement" ? "active" : ""
                }`}
                onClick={() => setActiveTab("accountManagement")}
              >
                ⚙️ Account Management
              </button>
            </div>

            {activeTab === "create" && renderCreateTab()}
            {activeTab === "mintBurn" && renderMintBurnTab()}
            {activeTab === "accountManagement" && renderAccountManagementTab()}
          </>
        ) : (
          <div className="connect-wallet">
            <p>Please connect your wallet to continue</p>
          </div>
        )}
      </div>
    </div>
  );
};
