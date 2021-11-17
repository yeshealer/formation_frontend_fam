// import { ethers } from "ethers";
import { useCallback, useContext, useEffect, useState } from "react";
import Button from "COMPONENTS/Button";
import Modal from "COMPONENTS/Modal";
import TransactionModal from "CONTAINERS/TransactionModal";
import SelectTokenWithInput from "CONTAINERS/SelectTokenWithInput";
import SwapperButton from "CONTAINERS/SwapperButton";
import Header from "./components/Header";
import ConfirmModal from "./components/ConfirmModal";
import ExchangeRate from "./components/ExchangeRate";
import Footer from "./components/Footer";
import { getChainIds, getTokens } from "../../constants";
import { useWeb3React } from "@web3-react/core";
import { ToastContext } from "CONTEXT/toast-context";
import { useContract } from "hooks/useContract";
import { CONTRACTS_TYPE } from "utils/contracts";
import { convertToUnit, parseFromUnit } from "utils/formatters";
import { useTokenApproval } from "hooks/useTokenApprove";
import { TRANSACTION_ACTIONS, TRANSACTION_STATUS } from "UTILS/constants";
import { useInterval } from "hooks/useInterval";

const SwapTab = () => {
  const { notify } = useContext(ToastContext);
  const { chainId = 4, account } = useWeb3React();
  const stableCoinContract = useContract(CONTRACTS_TYPE.STABLE_TOKEN);
  const stableVaultContract = useContract(CONTRACTS_TYPE.STABLE_VAULT);
  const {
    handleApproval: handleStableApproval,
    currentAllowance: currentStableAllowance,
    transactionStatus: approvalTransactionStatus,
  } = useTokenApproval(CONTRACTS_TYPE.STABLE_TOKEN, CONTRACTS_TYPE.STABLE_VAULT);

  const [userStableBalance, setUserStableBalance] = useState(0);
  const [decimals, setDecimals] = useState(18);

  const [swap, setSwap] = useState({
    from: { value: 0, token: { name: null, icon: null } },
    to: { value: 0, token: { name: null, icon: null } },
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [swapInfo, setSwapInfo] = useState({
    fee: null,
    gas: null,
    maxSwapAmount: {
      src: null,
      dest: null,
    },
    minSwapAmount: {
      src: null,
      dest: null,
    },
  });
  const [transactionStatus, setTransactionStatus] = useState({
    status: null,
    type: null,
  });

  const getSwapInfo = useCallback(async () => {
    console.log('Getting swap info');
    if (chainId) {
      const { src, dest } = getChainIds(chainId);
      const data = await fetch(`https://xuv7hnj6j7.execute-api.eu-west-1.amazonaws.com/testnet/swap/info/${src}/${dest}`);
      const res = await data.json();
      setSwapInfo(res);
    }
  }, [chainId, transactionStatus]);

  useEffect(() => {
    getSwapInfo();
  }, [getSwapInfo]);


  useEffect(() => {
    const getUserBalance = async () => {
      if (account && stableCoinContract) {
        setDecimals(await stableCoinContract.decimals());
        setUserStableBalance(await stableCoinContract.balanceOf(account));
      }
    };

    getUserBalance();

    const { from, to } = getTokens(chainId);
    setSwap({
      from: { value: 0, token: from },
      to: { value: 0, token: to },
    });
  }, [account, chainId, stableCoinContract, transactionStatus]);


  useInterval(() => {
    getSwapInfo();
  }, 15000);

  const changeNetwork = async (chainId) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId }],
          });
          return;
        } catch (addError) {
          notify(
            "Error",
            "Something is wrong",
            "Could not add network. Try again."
          );
          return;
        }
      }
      notify(
        "Error",
        "Something is wrong",
        "Could not change network. Try again."
      );
    }
  };

  const handleCoinChange = async () => {
    try {
      let desiredNetworkIdHex;
      if (chainId === 1) {
        desiredNetworkIdHex = (56).toString(16);
      } else if (chainId === 56) {
        desiredNetworkIdHex = (1).toString(16);
      } else if (chainId === 4) {
        desiredNetworkIdHex = (97).toString(16);
      } else if (chainId === 97) {
        desiredNetworkIdHex = (4).toString(16);
      }
      await changeNetwork(`0x${desiredNetworkIdHex}`);
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    if (value < 0) {
      return;
    }
    const parsedValue = value ?? 0;
    const swapValue = parsedValue * 1;
    setSwap(() => ({
      from: { ...swap.from, value: parseFloat(parsedValue) },
      to: { ...swap.to, value: swapValue * (1-swapInfo?.fee) },
    }));
  };

  const handleInputChangeMax = (_, value) => {
    const swapValue = value ?? 0;
    const maxSwapValue = swapValue > swapInfo.maxSwapAmount.src ? swapInfo?.maxSwapAmount?.src : swapValue;
    setSwap(() => ({
      from: { ...swap.from, value: parseFloat(maxSwapValue) },
      to: { ...swap.to, value: maxSwapValue * (1-swapInfo?.fee) },
    }));
  };

  const toggleConfirmModal = () =>
    setShowConfirmModal((prevState) => !prevState);


  const canSwap = () => {
    return swapInfo.fee && swapInfo.maxSwapAmount?.src && swapInfo.minSwapAmount?.src && approvalTransactionStatus.status !== TRANSACTION_STATUS.SUBMITTED && transactionStatus.status !== TRANSACTION_STATUS.SUBMITTED;
  }

  const handleAction = async () => {
    if (!currentStableAllowance || currentStableAllowance < swapInfo.maxSwapAmount) {
      return handleStableApproval({ successMessage: `${swap.from.token.name} enabled!`});
    }
    return toggleConfirmModal();
  }

  const buttonTitle = () => {
    if (!currentStableAllowance || currentStableAllowance < swapInfo.maxSwapAmount) {
      if (approvalTransactionStatus.status === TRANSACTION_STATUS.SUBMITTED) {
        return `Enabling ${swap.from.token.name}...`;
      }
      return `Enable ${swap.from.token.name}`;
    }
    if (!swap.from.value) {
      return 'Please enter an amount';
    }
    if (transactionStatus.status === TRANSACTION_STATUS.SUBMITTED) {
      return "Swapping...";
    }
    if (swap.from.value < swapInfo.minSwapAmount.src) {
      return 'Amount must exceed minimum value';
    }
    if (swap.from.value > swapInfo.maxSwapAmount.src) {
      return 'Amount must not exceed maximum value';
    }
    return "Swap";
  };

  const handleSwap = async () => {
    try {
      setTransactionStatus({
        type: TRANSACTION_ACTIONS.SEND,
        status: TRANSACTION_STATUS.SUBMITTED,
      });
      const transaction = await stableVaultContract.swapIn(account, convertToUnit(swap.from.value, decimals), convertToUnit(swap.from.value*swapInfo.fee, decimals));
      notify('info', 'Deposit in progress', 'Transaction submitted');
      toggleConfirmModal();
      await transaction.wait();
      notify('success', 'Deposited!', 'Funds were deposited successfully');
      setTransactionStatus({
        type: TRANSACTION_ACTIONS.SEND,
        status: TRANSACTION_STATUS.SUCCESS,
      });
      setSwap(() => ({
        from: { ...swap.from, value: 0 },
        to: { ...swap.to, value: 0 },
      }));
    } catch (error) {
      setTransactionStatus({
        type: TRANSACTION_ACTIONS.SEND,
        status: TRANSACTION_STATUS.FAILED,
      });
      toggleConfirmModal();
      if (error?.data?.message?.includes('Exceed maximum swap amount')) {
        notify('error', 'Something is wrong!', 'Maximum swap amount is exceeded!');
      } else {
        notify('error', 'Something is wrong!', 'Please try again later!');
      }
    } 
  } 

  return (
    <>
      <div className="swap-tab">
        <Header />
        <div className="swapper">
          <SelectTokenWithInput
            selectedValue={swap.from.token.name}
            icon={swap.from.token.icon}
            inputValue={swap.from.value}
            note="Swap From"
            displaySelect={false}
            tokenToName="tokenFrom"
            inputToName="inputFrom"
            handleInputChange={handleInputChange}
            handleInputChangeMax={handleInputChangeMax}
            withMaxIcon={true}
            leftSideMaxIcon={true}
            withBalance={true}
            disabled={!canSwap()}
            userTokenBalance={parseFromUnit(userStableBalance, decimals)}
            formPrice={1}
          />
          <SwapperButton
            onClick={handleCoinChange}
            btnClasses="button-swapper__button--bg-dark button-swapper__button--border-green"
          />
          <SelectTokenWithInput
            selectedValue={swap.to.token.name}
            icon={swap.to.token.icon}
            inputValue={swap.to.value}
            note="Swap To"
            displaySelect={false}
            tokenToName="tokenTo"
            inputToName="inputTo"
            withBalance={false}
            classes="pt-0--mobile"
            handleInputChange={() => {}}
          />
          <Button
            type="button"
            text={buttonTitle()}
            disabled={!currentStableAllowance ? false : !canSwap() || (!swap.from.value || swap.from.value <= 0) || !(swapInfo.maxSwapAmount.src >= swap.from.value) || (swap.from.value < swapInfo.minSwapAmount.src)}
            wide
            green
            classes="swap-tab__submit"
            onClick={handleAction}
          />
          <ExchangeRate />
          <Footer swapFee={swapInfo?.fee} maxSwapAmount={swapInfo?.maxSwapAmount?.src} minimumSwapAmount={swapInfo?.minSwapAmount?.src} fromToken={swap.from.token} />
        </div>
      </div>
      <Modal show={showConfirmModal} onCancel={toggleConfirmModal}>
        <ConfirmModal handleSwap={handleSwap} onCancel={toggleConfirmModal} srcSwapAmount={swap.from.value} fee={swap.from.value*swapInfo.fee} destSwapAmount={swap.to.value} />
      </Modal>
      {/* <Modal show={showTransactionModal} onCancel={toggleTransactionModal}>
        <TransactionModal
          info="Supplying 381.885 FORM and Supplying 818.28 USDT"
          onCancel={toggleTransactionModal}
        />
      </Modal> */}
    </>
  );
};

export default SwapTab;
