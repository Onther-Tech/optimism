import { Contract, ContractFactory, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TxGasLimit, TxGasPrice } from '@eth-optimism/core-utils'
import chai, { expect } from 'chai'
import { GWEI, l1Provider, l2Provider } from './shared/utils'
import { OptimismEnv } from './shared/env'
import { solidity } from 'ethereum-waffle'
import { Direction } from './shared/watcher-utils'

import ERC20_L1_JSON from '../artifacts/contracts/ERC20.sol/ERC20.json'
import ERC20_L2_JSON from '../artifacts-ovm/contracts/ERC20.sol/ERC20.json'

chai.use(solidity)

const DEFAULT_TEST_GAS_L1 = 330_000
const DEFAULT_TEST_GAS_L2 = 1_300_000

describe('Basic ERC20 interactions', async () => {
  const initialAmount = 1000000
  const tokenName = 'OVM Test'
  const tokenDecimals = 8
  const TokenSymbol = 'OVM'

  let wallet_l2: Wallet
  let wallet_l1: Wallet
  let other: Wallet
  let Factory__ERC20_L1: ContractFactory
  let Factory__ERC20_L2: ContractFactory
  let ERC20_L2: Contract
  let ERC20_L1: Contract

  let startTime: number
  let startBlockl1: number
  let startBlockl2: number
  let users: Wallet[] = []

  const isL1 = false

  const prepareL1Env = async (env) => {
    Factory__ERC20_L1 = new ContractFactory(
      ERC20_L1_JSON.abi,
      ERC20_L1_JSON.bytecode,
      wallet_l1
    )
    ERC20_L1 = await Factory__ERC20_L1.deploy(
      initialAmount,
      tokenName,
      tokenDecimals,
      TokenSymbol
    )
    await ERC20_L1.deployTransaction.wait()
  }

  const prepareL2Env = async (env) => {
    Factory__ERC20_L2 = new ContractFactory(
      ERC20_L2_JSON.abi,
      ERC20_L2_JSON.bytecode,
      wallet_l2
    )
    
    ERC20_L2 = await Factory__ERC20_L2.deploy(
      initialAmount,
      tokenName,
      tokenDecimals,
      TokenSymbol
    )
    await ERC20_L2.deployTransaction.wait()
  }

  const prepareEnv = async (env) => {
    if (isL1) {
      await prepareL1Env(env)
    } else {
      await prepareL2Env(env)
    }

    for (let i = 0; i < 100; i++) {
      const provider = isL1 ? l1Provider : l2Provider
      let newWallet = Wallet.createRandom().connect(provider)
      users.push(newWallet)

      if (isL1) {
        await (await wallet_l1.sendTransaction({
          to: newWallet.address,
          value: ethers.utils.parseEther("1.0")
        })).wait()
        await (await ERC20_L1.transfer(newWallet.address, 1000)).wait()
      } else {
        await env.waitForXDomainTransaction(
          env.l1Bridge.depositETHTo(newWallet.address, DEFAULT_TEST_GAS_L2, '0xFFFF', {
            value: ethers.utils.parseEther("10"),
            gasLimit: DEFAULT_TEST_GAS_L1
          }),
          Direction.L1ToL2
        )

        await ERC20_L2.transfer(newWallet.address, 1000)
      }
    }
  }

  before(async () => {
    const env = await OptimismEnv.new()
    wallet_l2 = env.l2Wallet
    wallet_l1 = env.l1Wallet
    other = Wallet.createRandom().connect(ethers.provider)

    await prepareEnv(env)

    await l1Provider.send("evm_setAutomine", [false])
    await l1Provider.send("evm_setIntervalMining", [1000])
  })

  beforeEach(async () => {
    startTime = Date.now()
    const provider = isL1 ? l1Provider : l2Provider
    const startBlock = await provider.getBlockNumber()
    console.log(`startBlock: ${startBlock}`)
  })

  afterEach(async () => {
    const duration = Date.now() - startTime
    console.log(`duration: ${duration}`)

    const provider = isL1 ? l1Provider : l2Provider
    const endBlock = await provider.getBlockNumber()
    console.log(`endBlock: ${endBlock}`)
  })

  const transfer = async (ERC20: Contract, other: Wallet) => {
    const amount = 1

    let txs
    if (isL1) {
      txs = users.map(async (user: Wallet) => {
        (await ERC20.connect(user).transfer(other.address, amount)).wait()
      })
    } else {
      txs = users.map(async (user: Wallet) => {
        (await ERC20.connect(user).transfer(other.address, amount, {
          gasLimit: 6380000
        })).wait()
      })
    }

    await Promise.all(txs)
  }

  if (isL1) {
    it('Sequentially L1', async () => {
      await transfer(ERC20_L1, other)
    })
  } else {
    it('Sequentially L2', async () => {
      await transfer(ERC20_L2, other)
    })
  }
})
