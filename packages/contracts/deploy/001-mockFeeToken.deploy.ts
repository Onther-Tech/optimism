/* Imports: External */
import { DeployFunction } from 'hardhat-deploy/dist/types'

/* Imports: Internal */
import { getDeployedContract } from '../src/hardhat-deploy-ethers'

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

  let feeTokenAddress = (hre as any).deployConfig.feeTokenAddress
  const usingFeeToken = (hre as any).deployConfig.usingFeeToken
  if (usingFeeToken === false) {
    return
  }

  if (feeTokenAddress === '0x0000000000000000000000000000000000000000') {
    const result = await deploy('mockFeeToken', {
      from: deployer,
      args: [],
      log: true,
    })

    if (!result.newlyDeployed) {
      return
    }

    feeTokenAddress = result.address
  }

  await Lib_AddressManager.setAddress('FeeToken', feeTokenAddress)
}

deployFn.dependencies = ['Lib_AddressManager']
deployFn.tags = ['mockFeeToken']

export default deployFn
