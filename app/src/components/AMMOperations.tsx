import React, { useState } from "react";
import { Navigation } from "./Navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import idl from "../idl/spl.json";
import type { Spl } from "../idl/spl";
import "../styles/AMMOperations.css";


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

const LIQUIDITY_POOL = Buffer.from("liquidity_pool");
const PRECISION = new BN(10).pow(new BN(9));

export const AMMOperations: React.FC = () => {
  const { connection } = useConnection();
  const solanaWallet = useWallet();
  const [activeTab, setActiveTab] = useState<
    "initialize" | "swap" | "addLiquidity" | "removeLiquidity"
  >("initialize");
  const [status, setStatus] = useState("");

  const [poolName, setPoolName] = useState("");
  const [feePercentage, setFeePercentage] = useState("30");
  const [tokenAMint, setTokenAMint] = useState("");
  const [tokenBMint, setTokenBMint] = useState("");

  const [swapTokenIn, setSwapTokenIn] = useState("");
  const [swapTokenOut, setSwapTokenOut] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapSlippage, setSwapSlippage] = useState("0.5");
  const [poolAddress, setPoolAddress] = useState("");

  const [addTokenA, setAddTokenA] = useState("");
  const [addTokenB, setAddTokenB] = useState("");
  const [addAmountA, setAddAmountA] = useState("");
  const [addAmountB, setAddAmountB] = useState("");
  const [addPoolAddress, setAddPoolAddress] = useState("");

  const [removePoolAddress, setRemovePoolAddress] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [removePercentage, setRemovePercentage] = useState("25");

  const getProvider = () => {
    if (!solanaWallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = solanaWallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    return new AnchorProvider(connection, anchorWallet, opts);
  };

  const getProgram = (provider: AnchorProvider) => {
    return new Program(idl as Idl, provider) as unknown as Program<Spl>;
  };

  const showStatus = (message: string, isError = false) => {
    setStatus(`${isError ? "❌ " : "✅ "}${message}`);
    setTimeout(() => setStatus(""), 8000);
  };

  const initializeLiquidityPool = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!poolName) throw new Error("Please enter pool name");
      if (!tokenAMint || !tokenBMint)
        throw new Error("Please enter both token mint addresses");
      if (!feePercentage) throw new Error("Please enter fee percentage");

      const provider = getProvider();
      const program = getProgram(provider);
      const tokenAMintPk = new PublicKey(tokenAMint);
      const tokenBMintPk = new PublicKey(tokenBMint);


      const [poolPda] = PublicKey.findProgramAddressSync(
        [LIQUIDITY_POOL, tokenAMintPk.toBuffer(), tokenBMintPk.toBuffer()],
        program.programId
      );


      const vaultA = associatedAddress({
        mint: tokenAMintPk,
        owner: poolPda,
      });

      const vaultB = associatedAddress({
        mint: tokenBMintPk,
        owner: poolPda,
      });


      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPda.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeLiquidityPoolAmm(poolName, parseInt(feePercentage))
        .accountsStrict({
          admin: solanaWallet.publicKey,
          tokenAMint: tokenAMintPk,
          tokenBMint: tokenBMintPk,
          vaultTokenA: vaultA,
          vaultTokenB: vaultB,
          pool: poolPda,
          lpMint: lpMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(
        `Liquidity pool initialized successfully!\nPool Address: ${poolPda.toString()}\nTransaction: ${tx}`
      );
      setPoolAddress(poolPda.toString());
    } catch (error: unknown) {
      console.error("Initialize pool error:", error);
      showStatus(
        `Error initializing pool: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleSwap = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!poolAddress) throw new Error("Please enter pool address");
      if (!swapTokenIn || !swapTokenOut)
        throw new Error("Please enter both token addresses");
      if (!swapAmount) throw new Error("Please enter swap amount");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(poolAddress);
      const tokenInPk = new PublicKey(swapTokenIn);
      const tokenOutPk = new PublicKey(swapTokenOut);
      const amountIn = new BN(parseFloat(swapAmount) * 10 ** 9);


      const amountOut = await program.methods
        .quoteAmm(amountIn)
        .accountsStrict({
          pool: poolPk,
        })
        .view();

  
      const vaultIn = associatedAddress({
        mint: tokenInPk,
        owner: poolPk,
      });

      const vaultOut = associatedAddress({
        mint: tokenOutPk,
        owner: poolPk,
      });

    
      const userIn = associatedAddress({
        mint: tokenInPk,
        owner: solanaWallet.publicKey,
      });

      const userOut = associatedAddress({
        mint: tokenOutPk,
        owner: solanaWallet.publicKey,
      });

      const tx = await program.methods
        .swapAmm(amountIn, amountOut)
        .accountsStrict({
          swapper: solanaWallet.publicKey,
          pool: poolPk,
          vaultIn: vaultIn,
          vaultOut: vaultOut,
          userIn: userIn,
          userOut: userOut,
          tokenAMint: tokenInPk,
          tokenBMint: tokenOutPk,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(
        `Swap completed successfully!\nAmount Out: ${
          amountOut.toNumber() / 10 ** 9
        }\nTransaction: ${tx}`
      );
    } catch (error: unknown) {
      console.error("Swap error:", error);
      showStatus(
        `Error swapping tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleAddLiquidity = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!addPoolAddress) throw new Error("Please enter pool address");
      if (!addTokenA || !addTokenB)
        throw new Error("Please enter both token addresses");
      if (!addAmountA || !addAmountB)
        throw new Error("Please enter both amounts");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(addPoolAddress);
      const tokenAPk = new PublicKey(addTokenA);
      const tokenBPk = new PublicKey(addTokenB);
      const amountA = new BN(parseFloat(addAmountA) * 10 ** 9);
      const amountB = new BN(parseFloat(addAmountB) * 10 ** 9);

   
      const vaultA = associatedAddress({
        mint: tokenAPk,
        owner: poolPk,
      });

      const vaultB = associatedAddress({
        mint: tokenBPk,
        owner: poolPk,
      });


      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPk.toBuffer()],
        program.programId
      );

      
      const userTokenA = associatedAddress({
        mint: tokenAPk,
        owner: solanaWallet.publicKey,
      });

      const userTokenB = associatedAddress({
        mint: tokenBPk,
        owner: solanaWallet.publicKey,
      });

      const userLp = associatedAddress({
        mint: lpMint,
        owner: solanaWallet.publicKey,
      });

      const tx = await program.methods
        .addLiquidityAmm(amountA, amountB)
        .accountsStrict({
          depositor: solanaWallet.publicKey,
          tokenAMint: tokenAPk,
          tokenBMint: tokenBPk,
          vaultA: vaultA,
          vaultB: vaultB,
          pool: poolPk,
          lpMint: lpMint,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpMintAccount: userLp,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showStatus(`Liquidity added successfully!\nTransaction: ${tx}`);
    } catch (error: unknown) {
      console.error("Add liquidity error:", error);
      showStatus(
        `Error adding liquidity: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleRemoveLiquidity = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!removePoolAddress) throw new Error("Please enter pool address");
      if (!removeAmount) throw new Error("Please enter remove amount");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(removePoolAddress);
      const removeAmountBN = new BN(parseFloat(removeAmount) * 10 ** 9);


      const pool = await program.account.liquidityPoolAmm.fetch(poolPk);
      const tokenAPk = pool.tokenAMint;
      const tokenBPk = pool.tokenBMint;

  
      const vaultA = associatedAddress({
        mint: tokenAPk,
        owner: poolPk,
      });

      const vaultB = associatedAddress({
        mint: tokenBPk,
        owner: poolPk,
      });


      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPk.toBuffer()],
        program.programId
      );

     
      const userTokenA = associatedAddress({
        mint: tokenAPk,
        owner: solanaWallet.publicKey,
      });

      const userTokenB = associatedAddress({
        mint: tokenBPk,
        owner: solanaWallet.publicKey,
      });

      const userLp = associatedAddress({
        mint: lpMint,
        owner: solanaWallet.publicKey,
      });

      const tx = await program.methods
        .removeLiquidityAmm(removeAmountBN)
        .accountsStrict({
          owner: solanaWallet.publicKey,
          vaultA: vaultA,
          vaultB: vaultB,
          tokenAMint: tokenAPk,
          tokenBMint: tokenBPk,
          pool: poolPk,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          lpMint: lpMint,
          userLpMintAccount: userLp,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Liquidity removed successfully!\nTransaction: ${tx}`);
    } catch (error: unknown) {
      console.error("Remove liquidity error:", error);
      showStatus(
        `Error removing liquidity: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const renderInitializeTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Initialize Liquidity Pool</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Name</label>
            <input
              type="text"
              placeholder="e.g., SOL/USDC"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Mint Address</label>
            <input
              type="text"
              placeholder="Enter Token A mint address"
              value={tokenAMint}
              onChange={(e) => setTokenAMint(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Mint Address</label>
            <input
              type="text"
              placeholder="Enter Token B mint address"
              value={tokenBMint}
              onChange={(e) => setTokenBMint(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Fee Percentage (basis points)</label>
            <input
              type="number"
              placeholder="30"
              value={feePercentage}
              onChange={(e) => setFeePercentage(e.target.value)}
              min="1"
              max="1000"
            />
          </div>

          <button
            className="amm-button primary"
            onClick={initializeLiquidityPool}
          >
            Initialize Pool
          </button>
        </div>
      </div>
    </div>
  );

  const renderSwapTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Swap Tokens</h3>
        <div className="swap-container">
          <div className="swap-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={poolAddress}
              onChange={(e) => setPoolAddress(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Token In Address</label>
            <input
              type="text"
              placeholder="Enter token in mint address"
              value={swapTokenIn}
              onChange={(e) => setSwapTokenIn(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Token Out Address</label>
            <input
              type="text"
              placeholder="Enter token out mint address"
              value={swapTokenOut}
              onChange={(e) => setSwapTokenOut(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Amount to Swap</label>
            <input
              type="number"
              placeholder="0.0"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              step="0.000000001"
            />
          </div>

          <div className="swap-settings">
            <label>Slippage Tolerance</label>
            <div className="slippage-input">
              <input
                type="number"
                value={swapSlippage}
                onChange={(e) => setSwapSlippage(e.target.value)}
                step="0.1"
                min="0.1"
                max="50"
              />
              <span>%</span>
            </div>
          </div>

          <button className="amm-button primary" onClick={handleSwap}>
            Swap Tokens
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddLiquidityTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Add Liquidity</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={addPoolAddress}
              onChange={(e) => setAddPoolAddress(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Address</label>
            <input
              type="text"
              placeholder="Enter Token A mint address"
              value={addTokenA}
              onChange={(e) => setAddTokenA(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Address</label>
            <input
              type="text"
              placeholder="Enter Token B mint address"
              value={addTokenB}
              onChange={(e) => setAddTokenB(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={addAmountA}
              onChange={(e) => setAddAmountA(e.target.value)}
              step="0.000000001"
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={addAmountB}
              onChange={(e) => setAddAmountB(e.target.value)}
              step="0.000000001"
            />
          </div>

          <button className="amm-button primary" onClick={handleAddLiquidity}>
            Add Liquidity
          </button>
        </div>
      </div>
    </div>
  );

  const renderRemoveLiquidityTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Remove Liquidity</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={removePoolAddress}
              onChange={(e) => setRemovePoolAddress(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>LP Token Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={removeAmount}
              onChange={(e) => setRemoveAmount(e.target.value)}
              step="0.000000001"
            />
          </div>

          <button
            className="amm-button secondary"
            onClick={handleRemoveLiquidity}
          >
            Remove Liquidity
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="amm-operations">
      <Navigation />
      <div className="amm-header">
        <h2>Automated Market Maker (AMM)</h2>
        <p>Trade tokens, provide liquidity, and earn fees</p>
      </div>

      <div className="amm-content">
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

        <div className="amm-tabs">
          <button
            className={`amm-tab ${activeTab === "initialize" ? "active" : ""}`}
            onClick={() => setActiveTab("initialize")}
          >
            🏗️ Initialize Pool
          </button>
          <button
            className={`amm-tab ${activeTab === "swap" ? "active" : ""}`}
            onClick={() => setActiveTab("swap")}
          >
            💱 Swap
          </button>
          <button
            className={`amm-tab ${
              activeTab === "addLiquidity" ? "active" : ""
            }`}
            onClick={() => setActiveTab("addLiquidity")}
          >
            ➕ Add Liquidity
          </button>
          <button
            className={`amm-tab ${
              activeTab === "removeLiquidity" ? "active" : ""
            }`}
            onClick={() => setActiveTab("removeLiquidity")}
          >
            ➖ Remove Liquidity
          </button>
        </div>

        {activeTab === "initialize" && renderInitializeTab()}
        {activeTab === "swap" && renderSwapTab()}
        {activeTab === "addLiquidity" && renderAddLiquidityTab()}
        {activeTab === "removeLiquidity" && renderRemoveLiquidityTab()}
      </div>
    </div>
  );
};
