import React, { useState } from "react";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

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
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

const POOL_SEED = "staking_pool";
const USER_STAKE_SEED = "user_stake";

export const StakingOperations: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<
    "initialize" | "stake" | "admin" | "rewards"
  >("initialize");
  const [status, setStatus] = useState<string>("");

  const [stakeMint, setStakeMint] = useState("");
  const [rewardRatePerDay, setRewardRatePerDay] = useState<string>("0");

  const [stakeAmount, setStakeAmount] = useState("0");
  const [unstakeAmount, setUnstakeAmount] = useState("0");

  const [depositAmt, setDepositAmt] = useState("0");
  const [newRewardRate, setNewRewardRate] = useState("0");
  const [isPaused, setIsPaused] = useState(false);
  const PRECISION = new BN(10).pow(new BN(9));
  const getProvider = () => {
    if (!wallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = wallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    return new AnchorProvider(connection, anchorWallet, opts);
  };

  const getProgram = (provider: AnchorProvider) => {
    return new Program(idl as Idl, provider) as unknown as Program<Spl>;
  };

  const showStatus = (msg: string, isErr = false) => {
    setStatus(`${isErr ? "❌" : "✅"} ${msg}`);
    setTimeout(() => setStatus(""), 8_000);
  };
  const PROGRAM_ID = (idl as Idl).address;

  const derivePoolPda = (mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_SEED), mint.toBuffer()],
      new PublicKey(PROGRAM_ID)
    )[0];

  const deriveUserStakePda = (pool: PublicKey, staker: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from(USER_STAKE_SEED), pool.toBuffer(), staker.toBuffer()],
      new PublicKey(PROGRAM_ID)
    )[0];

  const initializePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const rewardVault = stakeVault;

      const tx = await program.methods
        .initializePoolStake(new BN(rewardRatePerDay))
        .accountsStrict({
          admin: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          rewardVault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(`Pool initialised! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const stakeTokens = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(stakeAmount);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const stakeLamports = new BN(Number(stakeAmount)).mul(PRECISION);
      const tx = await program.methods
        .stake(stakeLamports)
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userAta,
          userStake: userStakePda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(`Staked ${amount}! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const unstakeTokens = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(unstakeAmount);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userStakeAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });
      const rewardVault = stakeVault;
      const userRewardAta = userStakeAta;

      const unstakeLamports = new BN(Number(unstakeAmount)).mul(PRECISION);
      const tx = await program.methods
        .unstake(unstakeLamports)
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userStakeAta,
          userStake: userStakePda,
          rewardVault,
          userRewardAccount: userRewardAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      showStatus(`Unstaked! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const claimRewards = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const rewardVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userRewardAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const tx = await program.methods
        .claimRewardsStake()
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          userStake: userStakePda,
          rewardVault,
          userRewardAccount: userRewardAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      showStatus(`Rewards claimed! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const pausePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .pausePoolAdmin()
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
        })
        .rpc();

      setIsPaused(true);
      showStatus(`Pool paused! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const unpausePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .unpausePoolAdmin()
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
        })
        .rpc();

      setIsPaused(false);
      showStatus(`Pool unpaused! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const depositRewards = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(depositAmt);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const rewardVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const depositLamports = new BN(Number(depositAmt)).mul(PRECISION);
      const tx = await program.methods
        .depositRewardsAdmin(depositLamports)
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
          rewardVault,
          rewardMint: stakeMintPk,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Rewards deposited! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const emergencyWithdraw = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userStakeAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const tx = await program.methods
        .emergencyWithdrawStake()
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userStakeAta,
          userStake: userStakePda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Emergency withdrawal successful! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const setRewardRate = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");
      const rate = Number(newRewardRate);
      if (!rate || rate < 0) throw new Error("Invalid reward rate");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .setRewardRateStake(new BN(rate))
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
          stakeMint: stakeMintPk,
        })
        .rpc();

      showStatus(`Reward rate updated! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const renderInitializeTab = () => (
    <div className="staking-tab-content">
      <div className="staking-card">
        <h3>Initialize Staking Pool</h3>
        <div className="staking-container">
          <div className="staking-input-group">
            <label>Stake Mint Address</label>
            <input
              type="text"
              placeholder="Enter stake mint address"
              value={stakeMint}
              onChange={(e) => setStakeMint(e.target.value.trim())}
            />
          </div>

          <div className="staking-input-group">
            <label>Reward Rate Per Day</label>
            <input
              type="number"
              placeholder="0"
              value={rewardRatePerDay}
              onChange={(e) => setRewardRatePerDay(e.target.value)}
            />
          </div>

          <button className="staking-button primary" onClick={initializePool}>
            Initialize Pool
          </button>
        </div>
      </div>
    </div>
  );

  const renderStakeTab = () => (
    <div className="staking-tab-content">
      <div className="staking-card">
        <h3>Stake & Unstake Tokens</h3>
        <div className="staking-container">
          <div className="staking-input-group">
            <label>Stake Mint Address</label>
            <input
              type="text"
              placeholder="Enter stake mint address"
              value={stakeMint}
              onChange={(e) => setStakeMint(e.target.value.trim())}
            />
          </div>

          <div className="staking-input-group">
            <label>Stake Amount</label>
            <input
              type="number"
              placeholder="0"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
          </div>

          <button className="staking-button primary" onClick={stakeTokens}>
            Stake Tokens
          </button>

          <div className="staking-input-group">
            <label>Unstake Amount</label>
            <input
              type="number"
              placeholder="0"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
            />
          </div>

          <button className="staking-button warning" onClick={unstakeTokens}>
            Unstake Tokens
          </button>

          <button className="staking-button success" onClick={claimRewards}>
            Claim Rewards
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminTab = () => (
    <div className="staking-tab-content">
      <div className="staking-card">
        <h3>Pool Administration</h3>
        <div className="staking-container">
          <div className="staking-input-group">
            <label>Stake Mint Address</label>
            <input
              type="text"
              placeholder="Enter stake mint address"
              value={stakeMint}
              onChange={(e) => setStakeMint(e.target.value.trim())}
            />
          </div>

          <div className="button-group">
            <button
              className={`staking-button ${isPaused ? "disabled" : "danger"}`}
              onClick={pausePool}
              disabled={isPaused}
            >
              Pause Pool
            </button>
            <button
              className={`staking-button ${!isPaused ? "disabled" : "success"}`}
              onClick={unpausePool}
              disabled={!isPaused}
            >
              Unpause Pool
            </button>
          </div>

          <div className="staking-input-group">
            <label>Reward Rate Per Day</label>
            <input
              type="number"
              placeholder="0"
              value={newRewardRate}
              onChange={(e) => setNewRewardRate(e.target.value)}
            />
          </div>

          <button className="staking-button secondary" onClick={setRewardRate}>
            Update Reward Rate
          </button>

          <div className="staking-input-group">
            <label>Deposit Amount</label>
            <input
              type="number"
              placeholder="0"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
            />
          </div>

          <button className="staking-button info" onClick={depositRewards}>
            Deposit Rewards
          </button>
        </div>
      </div>
    </div>
  );

  const renderRewardsTab = () => (
    <div className="staking-tab-content">
      <div className="staking-card emergency">
        <h3>Emergency Operations</h3>
        <div className="staking-container">
          <p className="warning-text">
            Warning: Emergency withdrawal will withdraw all your staked tokens
            immediately without rewards.
          </p>

          <div className="staking-input-group">
            <label>Stake Mint Address</label>
            <input
              type="text"
              placeholder="Enter stake mint address"
              value={stakeMint}
              onChange={(e) => setStakeMint(e.target.value.trim())}
            />
          </div>

          <button className="staking-button danger" onClick={emergencyWithdraw}>
            Emergency Withdraw
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="staking-operations">
        <Navigation />
        <div className="staking-header">
          <h2>Staking & Rewards</h2>
          <p>
            Stake your tokens and earn rewards with our secure staking platform
          </p>
        </div>

        <div className="staking-content">
          <WalletMultiButton />

          {status && (
            <div
              className={`status-message ${
                status.includes("❌") ? "error" : "success"
              }`}
            >
              {status}
            </div>
          )}

          {wallet.publicKey ? (
            <>
              <div className="staking-tabs">
                <button
                  className={`staking-tab ${
                    activeTab === "initialize" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("initialize")}
                >
                  🏗️ Initialize Pool
                </button>
                <button
                  className={`staking-tab ${
                    activeTab === "stake" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("stake")}
                >
                  🔒 Stake & Unstake
                </button>
                <button
                  className={`staking-tab ${
                    activeTab === "admin" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("admin")}
                >
                  ⚙️ Admin Panel
                </button>
                <button
                  className={`staking-tab ${
                    activeTab === "rewards" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("rewards")}
                >
                  🚨 Emergency
                </button>
              </div>

              {activeTab === "initialize" && renderInitializeTab()}
              {activeTab === "stake" && renderStakeTab()}
              {activeTab === "admin" && renderAdminTab()}
              {activeTab === "rewards" && renderRewardsTab()}
            </>
          ) : (
            <div className="connect-wallet">
              <p>Please connect your wallet to continue.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
