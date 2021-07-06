import { Contract, ContractFactory, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TxGasLimit, TxGasPrice } from '@eth-optimism/core-utils'
import chai, { expect } from 'chai'
import { GWEI, l1Provider, l2Provider } from './shared/utils'
import { OptimismEnv } from './shared/env'
import { solidity } from 'ethereum-waffle'
import { Direction } from './shared/watcher-utils'

import CONSUMER_L1_JSON from '../artifacts/contracts/GasConsumer.sol/GasConsumer.json'
import CONSUMER_L2_JSON from '../artifacts-ovm/contracts/GasConsumer.sol/GasConsumer.json'

chai.use(solidity)

const DEFAULT_TEST_GAS_L1 = 330_000

describe('Basic GasConsumer interactions', async () => {
  const initialAmount = 1000000
  const tokenName = 'OVM Test'
  const tokenDecimals = 8
  const TokenSymbol = 'OVM'

  let wallet_l2: Wallet
  let wallet_l1: Wallet
  let other: Wallet
  let Factory__GasConsumer_L1: ContractFactory
  let Factory__GasConsumer_L2: ContractFactory
  let GasConsumer_L2: Contract
  let GasConsumer_L1: Contract

  let startTime: number
  let startBlockl1: number
  let startBlockl2: number
  let users: Wallet[] = []

  before(async () => {
    const env = await OptimismEnv.new()
    wallet_l2 = env.l2Wallet
    wallet_l1 = env.l1Wallet
    other = Wallet.createRandom().connect(ethers.provider)
    Factory__GasConsumer_L1 = new ContractFactory(
      CONSUMER_L1_JSON.abi,
      CONSUMER_L1_JSON.bytecode,
      wallet_l1
    )
    Factory__GasConsumer_L2 = new ContractFactory(
      CONSUMER_L2_JSON.abi,
      CONSUMER_L2_JSON.bytecode,
      wallet_l2
    )
    
    GasConsumer_L2 = await Factory__GasConsumer_L2.deploy()
    await GasConsumer_L2.deployTransaction.wait()
    GasConsumer_L1 = await Factory__GasConsumer_L1.deploy()
    await GasConsumer_L1.deployTransaction.wait()

    for (let i = 0; i < 300; i++) {
      let newWallet = Wallet.createRandom().connect(l1Provider)
      users.push(newWallet)

      await (await wallet_l1.sendTransaction({
        to: newWallet.address,
        value: ethers.utils.parseEther("1.0")
      })).wait()

      await env.ovmEth.transfer(newWallet.address, ethers.utils.parseEther("1.0"))
    }

    await l1Provider.send("evm_setAutomine", [false])
    await l1Provider.send("evm_setIntervalMining", [1000])
  })

  beforeEach(async () => {
    startTime = Date.now()
    startBlockl1 = await l1Provider.getBlockNumber()
    startBlockl2 = await l2Provider.getBlockNumber()
  })

  afterEach(async () => {
    const duration = Date.now() - startTime
    console.log(`duration: ${duration}`)

    const endBlockl1 = await l1Provider.getBlockNumber()
    const endBlockl2 = await l2Provider.getBlockNumber()

    let txCount = 0
    for (let i = startBlockl1 + 1; i < endBlockl1; i++) {
      const block = await l1Provider.getBlock(i)
      txCount += block.transactions.length
    }
  })

  const sendTx = async (GasConsumer: Contract, other: Wallet) => {
    const gasLimit = 1_000_000

    const txs = users.map(async (user: Wallet) => {
      (await GasConsumer.connect(user).consume({
        gasLimit: gasLimit
      })).wait()
    })
    await Promise.all(txs)
  }

  it('Sequentially L1', async () => {
    await sendTx(GasConsumer_L1, other)
  })

  /*it('Sequentially L2', async () => {
    await sendTx(GasConsumer_L2, other)
  })*/
})
