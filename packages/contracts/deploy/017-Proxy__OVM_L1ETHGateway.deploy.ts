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

  const result = await deploy('Proxy__OVM_L1ERC20Gateway', {
    contract: 'Lib_ResolvedDelegateProxy',
    from: deployer,
    args: [Lib_AddressManager.address, 'OVM_L1ERC20Gateway'],
    log: true,
  })

  if (!result.newlyDeployed) {
    return
  }

  const Proxy__OVM_L1ERC20Gateway = await getDeployedContract(
    hre,
    'Proxy__OVM_L1ERC20Gateway',
    {
      signerOrProvider: deployer,
      iface: 'OVM_L1ERC20Gateway',
    }
  )

  /*const l1CrossDomainMessenger = await getDeployedContract(hre, 'OVM_L1CrossDomainMessenger', {
    signerOrProvider: deployer,
  })*/
  const l1CrossDomainMessenger = await getDeployedContract(hre, 'Proxy__OVM_L1CrossDomainMessenger', {
    signerOrProvider: deployer,
  })

  const feeTokenAddress = await Lib_AddressManager.getAddress(
    'FeeToken'
  )

  console.log(`feeTokenAddress: ${feeTokenAddress}`)
  console.log(`predeploys.OVM_ETH: ${predeploys.OVM_ETH}`)
  console.log(`l1CrossDomainMessenger.address: ${l1CrossDomainMessenger.address}`)

  await Proxy__OVM_L1ERC20Gateway.initialize(
    feeTokenAddress,
    predeploys.OVM_ETH,
    l1CrossDomainMessenger.address
  )

  /*const libAddressManager = await Proxy__OVM_L1ERC20Gateway.libAddressManager()
  if (libAddressManager !== Lib_AddressManager.address) {
    throw new Error(
      `\n**FATAL ERROR. THIS SHOULD NEVER HAPPEN. CHECK YOUR DEPLOYMENT.**:\n` +
        `Proxy__OVM_L1ERC20Gateway could not be succesfully initialized.\n` +
        `Attempted to set Lib_AddressManager to: ${Lib_AddressManager.address}\n` +
        `Actual address after initialization: ${libAddressManager}\n` +
        `This could indicate a compromised deployment.`
    )
  }*/

  await Lib_AddressManager.setAddress('Proxy__OVM_L1ERC20Gateway', result.address)
}

deployFn.dependencies = ['Lib_AddressManager', 'OVM_L1ERC20Gateway']
deployFn.tags = ['Proxy__OVM_L1ERC20Gateway']

export default deployFn
