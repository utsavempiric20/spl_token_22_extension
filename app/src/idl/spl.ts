/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/spl.json`.
 */
export type Spl = {
  "address": "C1QrbSXfsm94jPzoucAa8ZX3EdxTUeDvJP9mV8NtZxx",
  "metadata": {
    "name": "spl",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burnTokens",
      "discriminator": [
        76,
        15,
        51,
        254,
        229,
        215,
        121,
        66
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "from",
          "docs": [
            "The token account to burn from (must have sufficient balance)"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Must match the mint's authority (or the account's delegate)"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "checkMintExtensionsConstraints",
      "discriminator": [
        116,
        106,
        124,
        163,
        185,
        116,
        224,
        224
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "claimRewardsStake",
      "discriminator": [
        98,
        55,
        228,
        16,
        71,
        157,
        66,
        97
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "userRewardAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "closeTokenAccount",
      "discriminator": [
        132,
        172,
        24,
        60,
        100,
        156,
        135,
        97
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to close (must be empty)"
          ],
          "writable": true
        },
        {
          "name": "destination",
          "docs": [
            "Destination of the reclaimed SOL"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "The close-authority of `account`"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "createMintAccount",
      "discriminator": [
        76,
        184,
        50,
        62,
        162,
        141,
        47,
        103
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver"
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "mintTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "extraMetasAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "depositRewardsAdmin",
      "discriminator": [
        91,
        3,
        65,
        103,
        90,
        165,
        21,
        199
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "rewardMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyWithdrawStake",
      "discriminator": [
        41,
        32,
        19,
        239,
        45,
        11,
        201,
        237
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "freezeTokenAccount",
      "discriminator": [
        138,
        168,
        178,
        109,
        205,
        224,
        209,
        93
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to freeze (must be initialized)"
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The mint under which this account exists"
          ]
        },
        {
          "name": "freezeAuthority",
          "docs": [
            "Must match the mint's freeze_authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "initializePoolStake",
      "discriminator": [
        32,
        30,
        163,
        44,
        201,
        173,
        205,
        208
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The associated token account owned by the pool PDA to hold stake tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "rewardVault",
          "docs": [
            "The associated token account owned by the pool PDA to hold reward tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "rewardMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rewardRatePerSecond",
          "type": "u128"
        }
      ]
    },
    {
      "name": "mintTokens",
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "to",
          "docs": [
            "The token account to receive newly minted tokens"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Must match the mint's authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pausePoolAdmin",
      "discriminator": [
        160,
        149,
        182,
        171,
        253,
        140,
        154,
        152
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "setRewardRateStake",
      "discriminator": [
        35,
        43,
        178,
        216,
        161,
        19,
        23,
        74
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "The admin of the pool"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeMint"
        }
      ],
      "args": [
        {
          "name": "newRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "staker",
          "docs": [
            "The user who wants to stake"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "pool",
          "docs": [
            "The global pool"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The vault holding all stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "docs": [
            "The user's token account holding stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we1000700000000030 track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "thawTokenAccount",
      "discriminator": [
        199,
        172,
        96,
        93,
        244,
        252,
        137,
        171
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to thaw"
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The same mint used when freezing"
          ]
        },
        {
          "name": "freezeAuthority",
          "docs": [
            "Must match the mint's freeze_authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "unpausePoolAdmin",
      "discriminator": [
        254,
        121,
        115,
        18,
        52,
        187,
        147,
        159
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The vault holding all stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "docs": [
            "The user's token account holding stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "userRewardAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "stakingPool",
      "discriminator": [
        203,
        19,
        214,
        220,
        220,
        154,
        24,
        102
      ]
    },
    {
      "name": "userStake",
      "discriminator": [
        102,
        53,
        163,
        107,
        9,
        138,
        87,
        153
      ]
    }
  ],
  "events": [
    {
      "name": "emergencyWithdrawEvent",
      "discriminator": [
        177,
        61,
        254,
        20,
        145,
        18,
        188,
        237
      ]
    },
    {
      "name": "poolPaused",
      "discriminator": [
        228,
        218,
        62,
        53,
        29,
        211,
        159,
        236
      ]
    },
    {
      "name": "poolUnpaused",
      "discriminator": [
        193,
        202,
        163,
        157,
        221,
        87,
        172,
        100
      ]
    },
    {
      "name": "rewardPaid",
      "discriminator": [
        132,
        160,
        190,
        117,
        215,
        177,
        19,
        95
      ]
    },
    {
      "name": "stakeEvent",
      "discriminator": [
        226,
        134,
        188,
        173,
        19,
        33,
        75,
        175
      ]
    },
    {
      "name": "unstakeEvent",
      "discriminator": [
        162,
        104,
        137,
        228,
        81,
        3,
        79,
        197
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientStaked",
      "msg": "Not enough staked balance."
    },
    {
      "code": 6001,
      "name": "rewardOverflow",
      "msg": "Pending rewards exceed maximum payout limit."
    },
    {
      "code": 6002,
      "name": "poolPaused",
      "msg": "Pool is currently paused."
    },
    {
      "code": 6003,
      "name": "lockupNotExpired",
      "msg": "Cannot unstake before lock-up expires."
    }
  ],
  "types": [
    {
      "name": "emergencyWithdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "slash",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolUnpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "rewardPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakingPool",
      "docs": [
        "The global state of a single staking pool."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakeMint",
            "docs": [
              "The mint of the token users stake."
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardMint",
            "docs": [
              "The mint of the token used for rewards."
            ],
            "type": "pubkey"
          },
          {
            "name": "stakeVault",
            "docs": [
              "Vault that holds all deposited stake tokens."
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardVault",
            "docs": [
              "Vault that holds all reward tokens (funded in advance by admin)."
            ],
            "type": "pubkey"
          },
          {
            "name": "admin",
            "docs": [
              "Admin/owner of this pool (can change reward rate and top up rewards)."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalStaked",
            "docs": [
              "Total amount of stake tokens currently staked."
            ],
            "type": "u128"
          },
          {
            "name": "rewardRatePerDay",
            "docs": [
              "Reward rate per second, scaled by 1e12 (to allow fractional).",
              "E.g. if you want to pay out 1 token per second, store 1_000_000_000_000."
            ],
            "type": "u128"
          },
          {
            "name": "rewardPerTokenStored",
            "docs": [
              "Accumulated reward per staked token, scaled by 1e12.",
              "Updated on each stake/unstake/claim."
            ],
            "type": "u128"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Last timestamp (in Unix seconds) when we updated `reward_per_token_stored`."
            ],
            "type": "i64"
          },
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "unstakeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userStake",
      "docs": [
        "Each user’s individual stake account"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "docs": [
              "Which staking pool this belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "staker",
            "docs": [
              "The user who staked."
            ],
            "type": "pubkey"
          },
          {
            "name": "amountStaked",
            "docs": [
              "How many stake tokens this user has deposited."
            ],
            "type": "u128"
          },
          {
            "name": "rewardDebt",
            "docs": [
              "The user’s “reward debt” = `amount_staked * reward_per_token_stored` at the last update.",
              "When we accrue new rewards, we compare current vs. this to figure out “owed” rewards."
            ],
            "type": "u128"
          },
          {
            "name": "pendingRewards",
            "docs": [
              "Accumulated but unclaimed rewards."
            ],
            "type": "u128"
          },
          {
            "name": "lastStakeTime",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
