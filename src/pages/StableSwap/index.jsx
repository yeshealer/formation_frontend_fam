import { useState } from 'react';
import Title from 'COMPONENTS/Title';
import ButtonSwitcher from 'CONTAINERS/ButtonSwitcher';
import LiquidityTab from './components/LiquidityTab';
import SwapTab from './components/SwapTab';
import { TAB_NAMES } from './constants';
import { useWeb3React } from '@web3-react/core';
import { CONTRACTS_TYPE } from 'utils/contracts';
import { useContract } from 'hooks/useContract';
import NewFeature from "./components/NewFeature";

const Swap = () => {
	// data
	const { account, chainId } = useWeb3React();
	const stableToken = useContract(CONTRACTS_TYPE.STABLE_TOKEN);
	
	// state
	const [currentTab, setCurrentTab] = useState(TAB_NAMES.SWAP);

	const toggleTabSwitch = (id) => setCurrentTab(id);

	return (
		<div className='swap space-h' style={{display: 'block'}}>
			<div className='pt-5--mobile-large'>
				<NewFeature />
			</div>
			<Title title='stable swap' />
			<div className='swap__box'>
				<div className='swap__box__container'>
					<div>
						<ButtonSwitcher
							firstButtonName={TAB_NAMES.SWAP}
							secondButtonName={TAB_NAMES.LIQUID}
							firstButtonTitle='Swap'
							secondButtonTitle='Liquidity'
							activeBtn={currentTab}
							setActiveBtn={toggleTabSwitch}
						/>
					</div>
					{currentTab === TAB_NAMES.SWAP ? (
						<SwapTab
							account={account}
						/>
					) : (
						<LiquidityTab
							account={account}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default Swap;
