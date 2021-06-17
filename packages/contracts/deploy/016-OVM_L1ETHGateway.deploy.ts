/* Imports: External */
import { DeployFunction } from 'hardhat-deploy/dist/types'

/* Imports: Internal */
import { getDeployedContract } from '../src/hardhat-deploy-ethers'
import { predeploys } from '../src/predeploys'

const deployFn: DeployFunction = async (hre) => {
  const { deploy } = hre.deployments
  const { deployer } = await hre.getNamedAccounts()

  const Lib_AddressManager = await getDeployedContract(
    hre,
    'Lib_AddressManager',
    {
      signerOrProvider: deployer,
    }
  )

  const l1CrossDomainMessenger = await getDeployedContract(hre, 'OVM_L1CrossDomainMessenger', {
    signerOrProvider: deployer,
  })

  const feeTokenAddress = await Lib_AddressManager.getAddress(
    'FeeToken'
  )

  console.log(`feeTokenAddress: ${feeTokenAddress}`)

  const result = await deploy('OVM_L1ERC20Gateway', {
    from: deployer,
    args: [feeTokenAddress, predeploys.OVM_ETH, l1CrossDomainMessenger.address],
    log: true,
  })

  if (!result.newlyDeployed) {
    return
  }

  const OVM_L1ERC20Gateway = await getDeployedContract(hre, 'OVM_L1ERC20Gateway', {
    signerOrProvider: deployer,
  })

  // NOTE: this initialization is *not* technically required (we only need to initialize the proxy)
  // but it feels safer to initialize this anyway. Otherwise someone else could come along and
  // initialize this.
  /*await OVM_L1ERC20Gateway.initialize(
    feeTokenAddress,
    predeploys.OVM_ETH,
    l1CrossDomainMessenger.address
  )*/

  /*const libAddressManager = await OVM_L1ERC20Gateway.libAddressManager()
  if (libAddressManager !== Lib_AddressManager.address) {
    throw new Error(
      `\n**FATAL ERROR. THIS SHOULD NEVER HAPPEN. CHECK YOUR DEPLOYMENT.**:\n` +
        `OVM_L1ERC20Gateway could not be succesfully initialized.\n` +
        `Attempted to set Lib_AddressManager to: ${Lib_AddressManager.address}\n` +
        `Actual address after initialization: ${libAddressManager}\n` +
        `This could indicate a compromised deployment.`
    )
  }*/

  await Lib_AddressManager.setAddress('OVM_L1ERC20Gateway', result.address)
}

deployFn.dependencies = ['Lib_AddressManager']
deployFn.tags = ['OVM_L1ERC20Gateway']

export default deployFn
