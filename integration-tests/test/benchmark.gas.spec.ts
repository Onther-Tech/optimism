import { Contract, ContractFactory, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TxGasLimit, TxGasPrice } from '@eth-optimism/core-utils'
import chai, { expect } from 'chai'
import { GWEI, l1Provider, l2Provider } from './shared/utils'
import { OptimismEnv } from './shared/env'
import { solidity } from 'ethereum-waffle'
import { Direction } from './shared/watcher-utils'

import GasConsumer_L1_JSON from '../artifacts/contracts/GasConsumer.sol/GasConsumer.json'
import GasConsumer_L2_JSON from '../artifacts-ovm/contracts/GasConsumer.sol/GasConsumer.json'

chai.use(solidity)

const DEFAULT_TEST_GAS_L1 = 330_000
const DEFAULT_TEST_GAS_L2 = 1_300_000

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
  let gasConsumer_L2: Contract
  let gasConsumer_L1: Contract

  let startTime: number
  let startBlockl1: number
  let startBlockl2: number
  let users: Wallet[] = []

  const isL1 = false
  const gasLimit = 1_000_000
  const txsCount = 100

  const prepareL1Env = async (env) => {
    Factory__GasConsumer_L1 = new ContractFactory(
      GasConsumer_L1_JSON.abi,
      GasConsumer_L1_JSON.bytecode,
      wallet_l1
    )
    gasConsumer_L1 = await Factory__GasConsumer_L1.deploy()
    await gasConsumer_L1.deployTransaction.wait()
  }

  const prepareL2Env = async (env) => {
    Factory__GasConsumer_L2 = new ContractFactory(
      GasConsumer_L2_JSON.abi,
      GasConsumer_L2_JSON.bytecode,
      wallet_l2
    )
    
    gasConsumer_L2 = await Factory__GasConsumer_L2.deploy()
    await gasConsumer_L2.deployTransaction.wait()
  }

  const prepareEnv = async (env) => {
    if (isL1) {
      await prepareL1Env(env)
    } else {
      await prepareL2Env(env)
    }

    for (let i = 0; i < txsCount; i++) {
      const provider = isL1 ? l1Provider : l2Provider
      let newWallet = Wallet.createRandom().connect(provider)
      users.push(newWallet)

      if (isL1) {
        await (await wallet_l1.sendTransaction({
          to: newWallet.address,
          value: ethers.utils.parseEther("1.0")
        })).wait()
      } else {
        await env.waitForXDomainTransaction(
          env.l1Bridge.depositETHTo(newWallet.address, DEFAULT_TEST_GAS_L2, '0xFFFF', {
            value: ethers.utils.parseEther("10"),
            gasLimit: DEFAULT_TEST_GAS_L1
          }),
          Direction.L1ToL2
        )
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

  let a
  beforeEach(async () => {
    startTime = Date.now()
    const provider = isL1 ? l1Provider : l2Provider
    const startBlock = await provider.getBlockNumber()
    console.log(`startBlock: ${startBlock}`)
    a = startBlock
  })

  afterEach(async () => {
    const duration = Date.now() - startTime
    console.log(`duration: ${duration}`)

    const provider = isL1 ? l1Provider : l2Provider
    const endBlock = await provider.getBlockNumber()
    console.log(`endBlock: ${endBlock}`)

    /*for (let i = a+1; i <= endBlock; i++) {
      const block = await l1Provider.getBlock(i)
      console.log(`block: ${JSON.stringify(block)}`)
    }*/
  })

  const sendTxs = async (gasConsumer: Contract, other: Wallet) => {
    /*const testTx = await gasConsumer.connect(users[0]).consume({
      gasLimit: gasLimit
    })
    await testTx.wait()
    const receipt = await l1Provider.getTransactionReceipt(testTx.hash)
    console.log(`receipt: ${JSON.stringify(receipt)}`)*/

    /*let txs;
    if (isL1) {
      txs = users.map(async (user: Wallet) => {
        (await gasConsumer.connect(user).consume({
          gasLimit: gasLimit
        })).wait()
      })
    } else {
      txs = users.map(async (user: Wallet) => {
        (await gasConsumer.connect(user).consume({
          gasLimit: 6380000
        })).wait()
      })
    }*/

    //console.log(`txs length: ${txs.length}`)
    //await Promise.all(txs)

    const testGasLimit = isL1 ? gasLimit : 6380000
    let txs = []
    for (let i = 0; i < users.length; i++) {
      txs.push(gasConsumer.connect(users[i]).consume({
        gasLimit: testGasLimit
      }))
    }

    let txs2 = []
    for (let i = 0; i < users.length; i++) {
      txs2.push(await txs[i])
    }

    for (let i = 0; i < users.length; i++) {
      await txs2[i].wait()
    }
  }

  if (isL1) {
    it('Sequentially L1', async () => {
      await sendTxs(gasConsumer_L1, other)
    })
  } else {
    it('Sequentially L2', async () => {
      await sendTxs(gasConsumer_L2, other)
    })
  }
})
