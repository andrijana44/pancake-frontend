import { BOOSTED_FARM_GAS_LIMIT } from 'config' // TODO: check v3 BCake gas limit with Chef Snoopy later
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'
import useCatchTxError from 'hooks/useCatchTxError'
import { useBCakeFarmBoosterV3Contract } from 'hooks/useContract'
import { useCallback } from 'react'

export const useBoosterFarmV3Handlers = (tokenId: string, onDone: () => void) => {
  const farmBoosterV3Contract = useBCakeFarmBoosterV3Contract()
  const { fetchWithCatchTxError, loading: isConfirming } = useCatchTxError()
  const { callWithGasPrice } = useCallWithGasPrice()

  const activate = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return callWithGasPrice(farmBoosterV3Contract, 'activate', [tokenId], { gasLimit: BOOSTED_FARM_GAS_LIMIT })
    })

    if (receipt?.status && onDone) {
      onDone()
    }
  }, [tokenId, farmBoosterV3Contract, callWithGasPrice, fetchWithCatchTxError, onDone])

  const deactivate = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return callWithGasPrice(farmBoosterV3Contract, 'deactive', [tokenId], { gasLimit: BOOSTED_FARM_GAS_LIMIT })
    })

    if (receipt?.status && onDone) {
      onDone()
    }
  }, [tokenId, farmBoosterV3Contract, callWithGasPrice, fetchWithCatchTxError, onDone])

  return { activate, deactivate, isConfirming }
}