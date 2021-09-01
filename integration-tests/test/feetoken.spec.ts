//import { predeploys, getContractInterface, getContractFactory } from '@eth-optimism/contracts'
import {
  predeploys,
  getContractInterface,
  getContractFactory,
} from '../../packages/contracts/dist'
//import { getContractFactory } from '@eth-optimism/contracts'

import { expect } from 'chai'
import { Contract, Wallet, utils, BigNumber } from 'ethers'
import { Direction } from './shared/watcher-utils'

import {
  expectApprox,
  fundUser,
  PROXY_SEQUENCER_ENTRYPOINT_ADDRESS,
} from './shared/utils'
import { OptimismEnv } from './shared/env'

const DEFAULT_TEST_GAS_L1 = 330_000
const DEFAULT_TEST_GAS_L2 = 1_300_000
// TX size enforced by CTC:
const MAX_ROLLUP_TX_SIZE = 50_000

describe('FeeToken Integration Tests', async () => {
  let env: OptimismEnv
  let l1Bob: Wallet
  let l2Bob: Wallet
  let l1FeeToken: Contract
  let l2FeeToken: Contract

  const getBalances = async (_env: OptimismEnv) => {
    const l1UserBalance = await l1FeeToken.balanceOf(_env.l1Wallet.address)
    const l2UserBalance = await l2FeeToken.balanceOf(_env.l2Wallet.address)

    const l1BobBalance = await l1FeeToken.balanceOf(l1Bob.address)
    const l2BobBalance = await l2FeeToken.balanceOf(l2Bob.address)

    const sequencerBalance = await l2FeeToken.balanceOf(
      PROXY_SEQUENCER_ENTRYPOINT_ADDRESS
    )
    const l1BridgeBalance = await l1FeeToken.balanceOf(_env.l1Bridge.address)

    return {
      l1UserBalance,
      l2UserBalance,
      l1BobBalance,
      l2BobBalance,
      l1BridgeBalance,
      sequencerBalance,
    }
  }

  before(async () => {
    env = await OptimismEnv.new()
    l1Bob = Wallet.createRandom().connect(env.l1Wallet.provider)
    l2Bob = l1Bob.connect(env.l2Wallet.provider)

    const addressManager = env.addressManager
    const l1feeTokenAddress = await addressManager.getAddress('FeeToken')
    l1FeeToken = new Contract(
      l1feeTokenAddress,
      getContractInterface('mockFeeToken'),
      env.l1Wallet
    )

    l2FeeToken = new Contract(
      predeploys.OVM_FeeToken,
      getContractInterface('OVM_FeeToken'),
      env.l2Wallet
    )
  })

  it('fee token informations', async () => {
    const addressManager = env.addressManager
    const ctcAdress = await addressManager.getAddress(
      'OVM_CanonicalTransactionChain'
    )
    const ctc = getContractFactory('iOVM_Tokamak')
      .connect(env.l1Wallet)
      .attach(ctcAdress)
    expect(await ctc.version()).to.equal('Natasha optimism')
    expect(await ctc.usingFeeToken()).to.equal(true)
    expect(await ctc.feeToken()).to.equal(l1FeeToken.address)
  })

  it('depositERC20', async () => {
    const depositAmount = utils.parseEther('100')
    const preBalances = await getBalances(env)
    await l1FeeToken.approve(env.l1Bridge.address, depositAmount)
    const { tx, receipt } = await env.waitForXDomainTransaction(
      env.l1Bridge.depositERC20(
        l1FeeToken.address,
        l2FeeToken.address,
        depositAmount,
        DEFAULT_TEST_GAS_L2,
        '0xFFFF',
        {
          gasLimit: DEFAULT_TEST_GAS_L1,
        }
      ),
      Direction.L1ToL2
    )

    const postBalances = await getBalances(env)
    expect(postBalances.l1BridgeBalance).to.deep.eq(
      preBalances.l1BridgeBalance.add(depositAmount)
    )
    expect(postBalances.l2UserBalance).to.deep.eq(
      preBalances.l2UserBalance.add(depositAmount)
    )
    expect(postBalances.l1UserBalance).to.deep.eq(
      preBalances.l1UserBalance.sub(depositAmount)
    )
  })

  it('depositERC20To', async () => {
    const depositAmount = 10
    const preBalances = await getBalances(env)
    await l1FeeToken.approve(env.l1Bridge.address, depositAmount)
    const { tx, receipt } = await env.waitForXDomainTransaction(
      env.l1Bridge.depositERC20To(
        l1FeeToken.address,
        l2FeeToken.address,
        l2Bob.address,
        depositAmount,
        DEFAULT_TEST_GAS_L2,
        '0xFFFF',
        {
          gasLimit: DEFAULT_TEST_GAS_L1,
        }
      ),
      Direction.L1ToL2
    )

    const postBalances = await getBalances(env)
    expect(postBalances.l1BridgeBalance).to.deep.eq(
      preBalances.l1BridgeBalance.add(depositAmount)
    )
    expect(postBalances.l2BobBalance).to.deep.eq(
      preBalances.l2BobBalance.add(depositAmount)
    )
    expect(postBalances.l1UserBalance).to.deep.eq(
      preBalances.l1UserBalance.sub(depositAmount)
    )
  })

  it('deposit passes with a large data argument', async () => {
    const ASSUMED_L2_GAS_LIMIT = 8_000_000
    const depositAmount = 10
    const preBalances = await getBalances(env)

    // Set data length slightly less than MAX_ROLLUP_TX_SIZE
    // to allow for encoding and other arguments
    const data = `0x` + 'ab'.repeat(MAX_ROLLUP_TX_SIZE - 500)
    await l1FeeToken.approve(env.l1Bridge.address, depositAmount)
    const { tx, receipt } = await env.waitForXDomainTransaction(
      env.l1Bridge.depositERC20(
        l1FeeToken.address,
        l2FeeToken.address,
        depositAmount,
        ASSUMED_L2_GAS_LIMIT,
        data,
        {
          gasLimit: 4_000_000,
        }
      ),
      Direction.L1ToL2
    )

    const postBalances = await getBalances(env)
    expect(postBalances.l1BridgeBalance).to.deep.eq(
      preBalances.l1BridgeBalance.add(depositAmount)
    )
    expect(postBalances.l2UserBalance).to.deep.eq(
      preBalances.l2UserBalance.add(depositAmount)
    )
    expect(postBalances.l1UserBalance).to.deep.eq(
      preBalances.l1UserBalance.sub(depositAmount)
    )
  })

  it('depositERC20 fails with a TOO large data argument', async () => {
    const depositAmount = 10

    const data = `0x` + 'ab'.repeat(MAX_ROLLUP_TX_SIZE + 1)
    await l1FeeToken.approve(env.l1Bridge.address, depositAmount)
    await expect(
      env.l1Bridge.depositERC20(
        l1FeeToken.address,
        l2FeeToken.address,
        depositAmount,
        DEFAULT_TEST_GAS_L2,
        data,
        {
          gasLimit: 4_000_000,
        }
      )
    ).to.be.revertedWith(
      'Transaction data size exceeds maximum for rollup transaction.'
    )
  })

  it('withdraw', async () => {
    const withdrawAmount = BigNumber.from(3)
    const preBalances = await getBalances(env)
    expect(
      preBalances.l2UserBalance.gt(0),
      'Cannot run withdrawal test before any deposits...'
    )

    const receipts = await env.waitForXDomainTransaction(
      env.l2Bridge.withdraw(
        predeploys.OVM_FeeToken,
        withdrawAmount,
        DEFAULT_TEST_GAS_L2,
        '0xFFFF'
      ),
      Direction.L2ToL1
    )
    const fee = receipts.tx.gasLimit.mul(receipts.tx.gasPrice)

    const postBalances = await getBalances(env)

    expect(postBalances.l1BridgeBalance).to.deep.eq(
      preBalances.l1BridgeBalance.sub(withdrawAmount)
    )
    expect(postBalances.l2UserBalance).to.deep.eq(
      preBalances.l2UserBalance.sub(withdrawAmount.add(fee))
    )
    expect(postBalances.l1UserBalance).to.deep.eq(
      preBalances.l1UserBalance.add(withdrawAmount)
    )
  })

  it('withdrawTo', async () => {
    const withdrawAmount = BigNumber.from(3)

    const preBalances = await getBalances(env)

    expect(
      preBalances.l2UserBalance.gt(0),
      'Cannot run withdrawal test before any deposits...'
    )

    const receipts = await env.waitForXDomainTransaction(
      env.l2Bridge.withdrawTo(
        predeploys.OVM_FeeToken,
        l1Bob.address,
        withdrawAmount,
        DEFAULT_TEST_GAS_L2,
        '0xFFFF'
      ),
      Direction.L2ToL1
    )
    const fee = receipts.tx.gasLimit.mul(receipts.tx.gasPrice)

    const postBalances = await getBalances(env)

    expect(postBalances.l1BridgeBalance).to.deep.eq(
      preBalances.l1BridgeBalance.sub(withdrawAmount)
    )
    expect(postBalances.l2UserBalance).to.deep.eq(
      preBalances.l2UserBalance.sub(withdrawAmount.add(fee))
    )
    expect(postBalances.l1BobBalance).to.deep.eq(
      preBalances.l1BobBalance.add(withdrawAmount)
    )
  })

  it('deposit, transfer, withdraw', async () => {
    // 1. deposit
    const amount = utils.parseEther('1000')
    await l1FeeToken.approve(env.l1Bridge.address, amount)
    await env.waitForXDomainTransaction(
      env.l1Bridge.depositERC20(
        l1FeeToken.address,
        l2FeeToken.address,
        amount,
        DEFAULT_TEST_GAS_L2,
        '0xFFFF',
        {
          gasLimit: DEFAULT_TEST_GAS_L1,
        }
      ),
      Direction.L1ToL2
    )

    // 2. trnsfer to another address
    const other = Wallet.createRandom().connect(env.l2Wallet.provider)
    const tx = await l2FeeToken.transfer(other.address, utils.parseEther('100'))
    await tx.wait()

    const l1BalanceBefore = await l1FeeToken.balanceOf(other.address)
    const l2BalanceBefore = await l2FeeToken.balanceOf(other.address)

    const tmp1 = await l2FeeToken.balanceOf(other.address)

    // 3. do withdrawal
    const withdrawnAmount = 10
    const receipts = await env.waitForXDomainTransaction(
      env.l2Bridge
        .connect(other)
        .withdraw(
          predeploys.OVM_FeeToken,
          withdrawnAmount,
          DEFAULT_TEST_GAS_L1,
          '0xFFFF'
        ),
      Direction.L2ToL1
    )

    // check that correct amount was withdrawn and that fee was charged
    const fee = receipts.tx.gasLimit.mul(receipts.tx.gasPrice)
    const l1BalanceAfter = await l1FeeToken.balanceOf(other.address)
    const l2BalanceAfter = await l2FeeToken.balanceOf(other.address)
    expect(l1BalanceAfter).to.deep.eq(l1BalanceBefore.add(withdrawnAmount))
    expect(l2BalanceAfter).to.deep.eq(
      l2BalanceBefore.sub(withdrawnAmount).sub(fee)
    )
  })
})
