// import { PayableOverrides } from 'ethers'
// import { TransactionResponse } from '@ethersproject/providers'
import { SendTransactionResult } from '@wagmi/core'
import { Abi } from 'abitype'
import { useContract } from 'hooks/useContract'
import { calculateGasMargin } from 'utils'
import { Address } from 'wagmi'
import { getContract } from 'wagmi/actions'

/**
 * Estimate the gas needed to call a function, and add a 10% margin
 * @param contract Used to perform the call
 * @param methodName The name of the method called
 * @param gasMarginPer10000 The gasMargin per 10000 (i.e. 10% -> 1000)
 * @param args An array of arguments to pass to the method
 * @returns https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
 */
export const estimateGas = async <T extends ReturnType<typeof getContract>>(
  contract: T,
  methodName: string,
  methodArgs: any,
  overrides: PayableOverrides = {},
  gasMarginPer10000: bigint,
) => {
  if (!contract[methodName]) {
    throw new Error(`Method ${methodName} doesn't exist on ${contract.address}`)
  }
  const rawGasEstimation = await contract.estimateGas[methodName]([methodArgs], overrides)
  // By convention, BigNumber values are multiplied by 1000 to avoid dealing with real numbers
  const gasEstimation = calculateGasMargin(rawGasEstimation, gasMarginPer10000)
  return gasEstimation
}

/**
 * Perform a contract call with a gas value returned from estimateGas
 * @param contract Used to perform the call
 * @param methodName The name of the method called
 * @param methodArgs An array of arguments to pass to the method
 * @param overrides An overrides object to pass to the method
 * @returns https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
 */
export const callWithEstimateGas = async <T extends ReturnType<typeof useContract>>(
  contract: T,
  methodName: any,
  methodArgs: any,
  overrides: PayableOverrides = {},
  gasMarginPer10000 = 1000n,
): Promise<SendTransactionResult> => {
  const gasEstimation = await estimateGas(contract, methodName, methodArgs, overrides, gasMarginPer10000)
  const tx = await contract[methodName](...methodArgs, {
    gasLimit: gasEstimation,
    ...overrides,
  })
  return tx
}
