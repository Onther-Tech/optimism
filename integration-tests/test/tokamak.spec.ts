//import { getContractFactory } from '@eth-optimism/contracts'
import { getContractFactory } from '../../packages/contracts'
import { expect } from 'chai'

/* Imports: External */
import { Wallet, Contract, ContractFactory, utils, constants, BigNumber } from 'ethers'
import { Direction } from './shared/watcher-utils'
import { Watcher } from '@eth-optimism/watcher'

//import * as PlasmaEvmContracts from "../../../plasma-evm-contracts/deployed.optimism.json'

/* Imports: Internal */
import l1SimpleStorageJson from '../artifacts/contracts/SimpleStorage.sol/SimpleStorage.json'
import l2SimpleStorageJson from '../artifacts-ovm/contracts/SimpleStorage.sol/SimpleStorage.json'
import { OptimismEnv } from './shared/env'

import * as PlasmaEvmContracts from '../../plasma-evm-contracts/deployed.optimism.json'

import * as Def__MyL2DepositedERC20 from '../../packages/contracts/artifacts-ovm/contracts/optimistic-ethereum/OVM/bridge/tokens/OVM_L2DepositedERC20.sol/OVM_L2DepositedERC20.json'


export const deployTONGateway = async (
    l1Wallet: Wallet,
    l2Wallet: Wallet,
    l1ERC20: string,
    l1MessengerAddress: string,
    l2MessengerAddress: string,
): Promise<{
    OVM_L1ERC20Gateway: Contract,
    OVM_L2DepositedERC20: Contract,
}> => {
    let OVM_L1ERC20Gateway
    let OVM_L2DepositedERC20

    // Deploy L2 ERC20 Gateway
    const Factory__OVM_L2DepositedERC20 = new ContractFactory(Def__MyL2DepositedERC20.abi, Def__MyL2DepositedERC20.bytecode, l2Wallet)
    OVM_L2DepositedERC20 = await Factory__OVM_L2DepositedERC20.deploy(
        l2MessengerAddress,
        'TON',
        'TON'
    )
    await OVM_L2DepositedERC20.deployTransaction.wait()
    //console.log('OVM_L2DepositedERC20 deployed to:', OVM_L2DepositedERC20.address)

    // Deploy L1 ERC20 Gateway
    const Factory__OVM_L1ERC20Gateway = getContractFactory('OVM_L1ERC20Gateway')
    OVM_L1ERC20Gateway = await Factory__OVM_L1ERC20Gateway.connect(l1Wallet).deploy(
        l1ERC20,
        OVM_L2DepositedERC20.address,
        l1MessengerAddress
    )
    await OVM_L1ERC20Gateway.deployTransaction.wait()
    //console.log('OVM_L1ERC20Gateway deployed to:', OVM_L1ERC20Gateway.address)

    // Init L2 ERC20 Gateway
    //console.log('Connecting L2 WETH with L1 Deposit contract...')
    const initTx = await OVM_L2DepositedERC20.init(OVM_L1ERC20Gateway.address)
    await initTx.wait()

    return {
        OVM_L1ERC20Gateway,
        OVM_L2DepositedERC20
    }
}

describe('BondManager for Tokamak Network', async () => {
  let env: OptimismEnv

  let bondManager: Contract
  let seigManager: Contract
  let layer2Registry: Contract
  let l1Wallet: Wallet
  let l2Wallet: Wallet
  let l1ton: Contract
  let l2ton: Contract
  let rewardVault: Contract
  let l1TONGateway: Contract
  let watcher: Watcher

  before(async () => {
    env = await OptimismEnv.new()
    l1Wallet = env.l1Wallet
    l2Wallet = env.l2Wallet
    const addressManager = env.addressManager

    const bondManagerAddress = await addressManager.getAddress(
      'OVM_BondManager'
    )
    bondManager = getContractFactory('OVM_BondManager')
      .connect(l1Wallet)
      .attach(bondManagerAddress)

    /*const def__BondManager = require('../../packages/contracts/artifacts/contracts/optimistic-ethereum/mockOVM/verification/mockOVM_BondManager.sol/mockOVM_BondManager.json')
    bondManager = new Contract(
      bondManagerAddress,
      def__BondManager.abi,
      l1Wallet.provider
    ).connect(l1Wallet)*/

    const def__Layer2Registry = require('../../plasma-evm-contracts/build/contracts/Layer2Registry.json')

    layer2Registry = new Contract(
      PlasmaEvmContracts.Layer2Registry,
      def__Layer2Registry.abi,
      l1Wallet.provider
    ).connect(l1Wallet)

    const def__SeigManager = require('../../plasma-evm-contracts/build/contracts/SeigManager.json')
    seigManager = new Contract(
      PlasmaEvmContracts.SeigManager,
      def__SeigManager.abi,
      l1Wallet.provider
    ).connect(l1Wallet)

    const def__TON = require('../../plasma-evm-contracts/build/contracts/TON.json')
    l1ton = new Contract(
      PlasmaEvmContracts.TON,
      def__TON.abi,
      l1Wallet.provider
    ).connect(l1Wallet)

    const def__RewardVault = require('../../plasma-evm-contracts/build/contracts/RewardVault.json')
    rewardVault = new Contract(
      PlasmaEvmContracts.RewardVault,
      def__RewardVault.abi,
      l1Wallet.provider
    ).connect(l1Wallet)

    //let tx = await bondManager.claim(PlasmaEvmContracts.SeigManager)
    //await tx.wait()

    //let tx = await bondManager.claimChallengeReward(PlasmaEvmContracts.SeigManager)
    //await tx.wait()

    let tx = await bondManager.setSeigManager(PlasmaEvmContracts.SeigManager)
    await tx.wait()

    tx = await bondManager.setRewardVault(PlasmaEvmContracts.RewardVault)
    await tx.wait()

    const seigManagerAddress = await bondManager.seigManager()

    let registered = await isRegisteredLayer2(bondManagerAddress)
    if (!registered) {
      tx = await layer2Registry.registerAndDeployCoinage(
        bondManagerAddress,
        PlasmaEvmContracts.SeigManager
      )
      await tx.wait()
    }

    // deploy gateway contracts
    const l1MessengerAddress = await addressManager.getAddress(
      'Proxy__OVM_L1CrossDomainMessenger'
    )
    const l2MessengerAddress = await addressManager.getAddress(
      'OVM_L2CrossDomainMessenger'
    )
    const newGateway = await deployTONGateway(l1Wallet, l2Wallet, PlasmaEvmContracts.TON, l1MessengerAddress, l2MessengerAddress)
    l2ton = newGateway.OVM_L2DepositedERC20
    l1TONGateway = newGateway.OVM_L1ERC20Gateway

    await rewardVault.claim(l1Wallet.address, BigNumber.from("1000000000000"))

    watcher = new Watcher({
      l1: {
        provider: l1Wallet.provider,
        messengerAddress: l1MessengerAddress
      },
      l2: {
        provider: l2Wallet.provider,
        messengerAddress: l2MessengerAddress
      }
    })

  })

  beforeEach(async () => {
    //let bondManager: Contract
  })

  async function isRegisteredLayer2(layer2Address: string) {
    let result = await layer2Registry.layer2s(layer2Address)
    return result
  }

  it('Checking environment', async () => {
    const seigManagerAddress = await bondManager.seigManager()
    expect(seigManagerAddress).to.equal(PlasmaEvmContracts.SeigManager)
    expect(seigManagerAddress).to.not.equal(constants.AddressZero)

    const coinageAddress = await seigManager.coinages(bondManager.address)
    expect(await seigManager.coinages(bondManager.address)).to.not.equal(constants.AddressZero)

    expect(await isRegisteredLayer2(bondManager.address)).to.equal(true)
  })

  it('deposit', async () => {
    const l1Balance = await l1ton.balanceOf(l1Wallet.address)
    //console.log(`l1Balance: ${l1Balance}`)

    const l2Balance = await l2ton.balanceOf(l2Wallet.address)
    //console.log(`l2Balance: ${l2Balance}`)

    const l1BalanceInVault = await l1ton.balanceOf(PlasmaEvmContracts.RewardVault)
    //console.log(`l1BalanceInVault: ${l1BalanceInVault}`)

    //const l2Balance = await ton.balanceOf(l1Wallet.address)
    //console.log(`l2Balance: ${l1Balance}`)

    const testAmount = BigNumber.from("10")

    await (await l1ton.approve(l1TONGateway.address, testAmount)).wait()
    let depositTx = await l1TONGateway.deposit(testAmount)
    await depositTx.wait()

    const [l1ToL2msgHash] = await watcher.getMessageHashesFromL1Tx(depositTx.hash)
    const l2Receipt = await watcher.getL2TransactionReceipt(l1ToL2msgHash)

    const l1Balance_2 = await l1ton.balanceOf(l1Wallet.address)
    //console.log(`l1Balance: ${l1Balance_2}`)

    const l2Balance_2 = await l2ton.balanceOf(l2Wallet.address)
    //console.log(`l2Balance: ${l2Balance_2}`)

    expect(l1Balance.sub(l1Balance_2)).to.deep.equal(testAmount)
    expect(l2Balance_2.sub(l2Balance)).to.deep.equal(testAmount)
  })

  it('check relayer', async () => {
    const relayer = await env.addressManager.getAddress(
      'OVM_L2MessageRelayer'
    )
    console.log(`relayer: ${relayer}`)
    console.log(`l1wallet: ${l1Wallet.address}`)
  })
})
