import { useTranslation } from '@pancakeswap/localization'
import { useToast } from '@pancakeswap/uikit'
import { MasterChefV3, NonfungiblePositionManager } from '@pancakeswap/v3-sdk'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useActiveChainId } from 'hooks/useActiveChainId'
import useCatchTxError from 'hooks/useCatchTxError'
import { useMasterchefV3, useV3NFTPositionManagerContract } from 'hooks/useContract'
import { useCallback } from 'react'
import { mutate } from 'swr'
import { calculateGasMargin } from 'utils'
import { viemClients } from 'utils/viem'
import { Address, hexToBigInt } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

interface FarmV3ActionContainerChildrenProps {
  attemptingTxn: boolean
  onStake: () => void
  onUnstake: () => void
  onHarvest: () => void
}

const useFarmV3Actions = ({ tokenId }: { tokenId: string }): FarmV3ActionContainerChildrenProps => {
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { address: account } = useAccount()
  const { data: signer } = useWalletClient()
  const { chainId } = useActiveChainId()
  const publicClient = viemClients[chainId as keyof typeof viemClients]

  const { loading, fetchWithCatchTxError } = useCatchTxError()

  const masterChefV3Address = useMasterchefV3()?.address as Address
  const nftPositionManagerAddress = useV3NFTPositionManagerContract()?.address

  const onUnstake = useCallback(async () => {
    const { calldata, value } = MasterChefV3.withdrawCallParameters({ tokenId, to: account })

    const txn = {
      account,
      to: masterChefV3Address,
      data: calldata,
      value: hexToBigInt(value),
      chain: signer.chain,
    }

    const resp = await fetchWithCatchTxError(() =>
      publicClient.estimateGas(txn).then((estimate) => {
        const newTxn = {
          ...txn,
          gas: calculateGasMargin(estimate),
        }

        // FIXME: wagmi
        // @ts-ignore
        return signer.sendTransaction(newTxn)
      }),
    )
    if (resp?.status) {
      toastSuccess(
        `${t('Unstaked')}!`,
        <ToastDescriptionWithTx txHash={resp.transactionHash}>
          {t('Your earnings have also been harvested to your wallet')}
        </ToastDescriptionWithTx>,
      )
    }
  }, [account, fetchWithCatchTxError, masterChefV3Address, publicClient, signer, t, toastSuccess, tokenId])

  const onStake = useCallback(async () => {
    const { calldata, value } = NonfungiblePositionManager.safeTransferFromParameters({
      tokenId,
      recipient: masterChefV3Address,
      sender: account,
    })

    const txn = {
      to: nftPositionManagerAddress,
      data: calldata,
      value: hexToBigInt(value),
      account,
      chain: signer.chain,
    }

    const resp = await fetchWithCatchTxError(() =>
      publicClient.estimateGas(txn).then((estimate) => {
        const newTxn = {
          ...txn,
          gas: calculateGasMargin(estimate),
        }

        // FIXME: wagmi
        // @ts-ignore
        return signer.sendTransaction(newTxn)
      }),
    )

    if (resp?.status) {
      toastSuccess(
        `${t('Staked')}!`,
        <ToastDescriptionWithTx txHash={resp.transactionHash}>
          {t('Your funds have been staked in the farm')}
        </ToastDescriptionWithTx>,
      )
    }
  }, [
    account,
    fetchWithCatchTxError,
    masterChefV3Address,
    nftPositionManagerAddress,
    publicClient,
    signer,
    t,
    toastSuccess,
    tokenId,
  ])

  const onHarvest = useCallback(async () => {
    const { calldata } = MasterChefV3.harvestCallParameters({ tokenId, to: account })

    const txn = {
      to: masterChefV3Address,
      data: calldata,
    }

    const resp = await fetchWithCatchTxError(() =>
      publicClient
        .estimateGas({
          account,
          ...txn,
        })
        .then((estimate) => {
          const newTxn = {
            ...txn,
            account,
            chain: signer.chain,
            gas: calculateGasMargin(estimate),
          }

          // FIXME: wagmi
          // @ts-ignore
          return signer.sendTransaction(newTxn)
        }),
    )

    if (resp?.status) {
      toastSuccess(
        `${t('Harvested')}!`,
        <ToastDescriptionWithTx txHash={resp.transactionHash}>
          {t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'CAKE' })}
        </ToastDescriptionWithTx>,
      )
      mutate((key) => Array.isArray(key) && key[0] === 'mcv3-harvest', undefined)
    }
  }, [account, fetchWithCatchTxError, masterChefV3Address, publicClient, signer, t, toastSuccess, tokenId])

  return {
    attemptingTxn: loading,
    onStake,
    onUnstake,
    onHarvest,
  }
}

export function useFarmsV3BatchHarvest() {
  const { t } = useTranslation()
  const { data: signer } = useWalletClient()
  const publicClient = usePublicClient()
  const { toastSuccess } = useToast()
  const { address: account } = useAccount()
  const { loading, fetchWithCatchTxError } = useCatchTxError()

  const masterChefV3Address = useMasterchefV3()?.address
  const onHarvestAll = useCallback(
    async (tokenIds: string[]) => {
      const { calldata, value } = MasterChefV3.batchHarvestCallParameters(
        tokenIds.map((tokenId) => ({ tokenId, to: account })),
      )

      const txn = {
        to: masterChefV3Address,
        data: calldata,
        value: hexToBigInt(value),
      }

      const resp = await fetchWithCatchTxError(() =>
        // FIXME: wagmi
        // @ts-ignore
        publicClient.estimateGas(txn).then((estimate) => {
          const newTxn = {
            ...txn,
            gas: calculateGasMargin(estimate),
          }

          // FIXME: wagmi
          // @ts-ignore
          return signer.sendTransaction(newTxn)
        }),
      )

      if (resp?.status) {
        toastSuccess(
          `${t('Harvested')}!`,
          <ToastDescriptionWithTx txHash={resp.transactionHash}>
            {t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'CAKE' })}
          </ToastDescriptionWithTx>,
        )
        mutate((key) => Array.isArray(key) && key[0] === 'mcv3-harvest', undefined)
      }
    },
    [account, fetchWithCatchTxError, masterChefV3Address, publicClient, signer, t, toastSuccess],
  )

  return {
    onHarvestAll,
    harvesting: loading,
  }
}

export default useFarmV3Actions
