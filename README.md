# SPL Token Platform

A comprehensive Solana program featuring **AMM (Automated Market Maker)**, **Staking**, and **Token Management** capabilities built with Anchor framework.

## 🚀 Features

### 🔄 AMM (Automated Market Maker)

- **Liquidity Pools**: Create and manage token pairs for trading
- **Add/Remove Liquidity**: Provide liquidity and earn LP tokens
- **Token Swaps**: Execute trades with slippage protection
- **Fee Collection**: Configurable swap fees (basis points)
- **Price Quotes**: Get real-time swap quotes

### 🏦 Staking System

- **Token Staking**: Stake tokens to earn rewards
- **Reward Distribution**: Automatic reward calculation and distribution
- **Lockup Period**: Configurable staking lockup (5 seconds)
- **Emergency Withdraw**: 10% penalty for early withdrawal
- **Pool Management**: Pause/unpause functionality

### 🪙 Token Management

- **Token Creation**: Create new SPL Token-2022 tokens with metadata
- **Minting/Burning**: Control token supply
- **Account Management**: Freeze/thaw and close token accounts
- **Metadata Support**: Token name, symbol, and URI

## 🛠️ Setup

### Prerequisites

- Node.js (v16+)
- Rust (latest stable)
- Solana CLI (latest)
- Anchor CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd spl

# Install dependencies
npm install

# Build the program
anchor build

# Deploy to localnet
anchor deploy
```

### Configuration

```bash
# Set your Solana cluster
solana config set --url localhost

# Airdrop SOL for testing
solana airdrop 2
```

## 📖 Usage Examples

### Create and Mint Tokens

```typescript
// Create new token
await program.methods
  .createMintAccount(9, "MyToken", "MTK", "https://metadata.uri")
  .accounts({...})
  .rpc();

// Mint tokens
await program.methods
  .mintTokens(new BN(1000 * 10**9))
  .accounts({...})
  .rpc();
```

### AMM Operations

```typescript
// Initialize liquidity pool
await program.methods
  .initializeLiquidityPoolAmm("SOL/USDC", 30)
  .accounts({...})
  .rpc();

// Add liquidity
await program.methods
  .addLiquidityAmm(tokenAAmount, tokenBAmount)
  .accounts({...})
  .rpc();

// Swap tokens
await program.methods
  .swapAmm(amountIn, minAmountOut)
  .accounts({...})
  .rpc();
```

### Staking Operations

```typescript
// Initialize staking pool
await program.methods
  .initializePoolStake(rewardRatePerDay)
  .accounts({...})
  .rpc();

// Stake tokens
await program.methods
  .stake(amount)
  .accounts({...})
  .rpc();

// Claim rewards
await program.methods
  .claimRewardsStake()
  .accounts({...})
  .rpc();
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/amm.ts
anchor test tests/stake.ts
anchor test tests/spl.ts
```

## 📁 Project Structure

```
├── programs/spl/src/
│   ├── instructions/
│   │   ├── amm.rs      # AMM functionality
│   │   ├── staking.rs  # Staking system
│   │   └── token.rs    # Token management
│   ├── state/
│   │   └── state.rs    # Account structures
│   └── lib.rs          # Program entry point
├── tests/
│   ├── amm.ts          # AMM tests
│   ├── stake.ts        # Staking tests
│   └── spl.ts          # Token tests
└── Anchor.toml         # Anchor configuration
```

## 🔧 Key Components

### AMM State

- `LiquidityPoolAMM`: Pool configuration and reserves
- Constant product formula (x \* y = k)
- Configurable fees and LP token minting

### Staking State

- `StakingPool`: Global pool configuration
- `UserStake`: Individual user staking data
- Reward calculation with precision scaling

### Token Features

- SPL Token-2022 compatibility
- Metadata support
- Freeze authority controls

## ⚠️ Important Notes

- **Lockup Period**: 5-second minimum staking period
- **Emergency Penalty**: 10% fee for early withdrawal
- **Fee Structure**: AMM fees in basis points (e.g., 30 = 0.3%)
- **Precision**: 9 decimal places for calculations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
