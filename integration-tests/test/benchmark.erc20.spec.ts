import { Contract, ContractFactory, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TxGasLimit, TxGasPrice } from '@eth-optimism/core-utils'
import chai, { expect } from 'chai'
import { GWEI, l1Provider } from './shared/utils'
import { OptimismEnv } from './shared/env'
import { solidity } from 'ethereum-waffle'

import ERC20_L1_JSON from '../artifacts/contracts/ERC20.sol/ERC20.json'
import ERC20_L2_JSON from '../artifacts-ovm/contracts/ERC20.sol/ERC20.json'

chai.use(solidity)

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

  before(async () => {
    const env = await OptimismEnv.new()
    wallet_l2 = env.l2Wallet
    wallet_l1 = env.l1Wallet
    other = Wallet.createRandom().connect(ethers.provider)
    Factory__ERC20_L1 = new ContractFactory(
      ERC20_L1_JSON.abi,
      ERC20_L1_JSON.bytecode,
      wallet_l1
    )
    Factory__ERC20_L2 = new ContractFactory(
      ERC20_L2_JSON.abi,
      ERC20_L2_JSON.bytecode,
      wallet_l2
    )

    await l1Provider.send("evm_setAutomine", [false])
    await l1Provider.send("evm_setIntervalMining", [5000])
  })

  beforeEach(async () => {
    ERC20_L2 = await Factory__ERC20_L2.deploy(
      initialAmount,
      tokenName,
      tokenDecimals,
      TokenSymbol
    )
    await ERC20_L2.deployTransaction.wait()
    ERC20_L1 = await Factory__ERC20_L1.deploy(
      initialAmount,
      tokenName,
      tokenDecimals,
      TokenSymbol
    )
    await ERC20_L1.deployTransaction.wait()

    startTime = Date.now()
  })

  afterEach(async () => {
    const duration = Date.now() - startTime
    console.log(`duration: ${duration}`)
  })

  const transfer = async (ERC20: Contract, sender: Wallet) => {
    const amount = 1
    const balance1 = await ERC20.balanceOf(sender.address)
    await (await ERC20.transfer(other.address, amount)).wait()
    const balance2 = await ERC20.balanceOf(sender.address)
    expect(balance1.sub(amount)).to.deep.equal(balance2)
  }

  it('Sequentially L1', async () => {
    for (let i = 0; i < 100; i++) {
      await transfer(ERC20_L1, wallet_l1)
    }
  })

  it('Sequentially L2', async () => {
    for (let i = 0; i < 100; i++) {
      await transfer(ERC20_L2, wallet_l2)
    }
  })
})
