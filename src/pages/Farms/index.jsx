import Box from './Box';
import { useContext } from 'react';
import { ThemeContext } from 'CONTEXT/theme-context';
import Title from 'COMPONENTS/Title';
import Pill from 'COMPONENTS/Pill';
import { useWeb3React } from '@web3-react/core';
import { usdFormatter } from 'utils/formatters';
import useFetch from 'use-http';
import {
	COIN_GECKO_URL,
	FORM_TOKEN_DEFAULT_PRICE,
} from 'UTILS/constants';
import { active_farms } from './constants';
import { Divider } from 'components/Divider';
import Button from 'COMPONENTS/Button';
import Migration from './components/Migration';
import MigrationReminder from 'components/MigrationReminder';

const Farms = () => {
	const { theme } = useContext(ThemeContext);
	const { data } = useFetch(COIN_GECKO_URL, {}, []);
	const { chainId = 1 } = useWeb3React();

	const formTokenPrice =
		data?.market_data?.current_price?.usd ?? FORM_TOKEN_DEFAULT_PRICE;

	const box = active_farms(theme, chainId);

	return (
		<>
			<div className='farms space-h'>
				<Title title='farms' />
				<Pill
					title='$Form price'
					value={usdFormatter.format(formTokenPrice)}
					small
					classes='pill__small__light pill-desktop-layout farms__value-pill'
				/>
				<div className='farms__boxes'>
					<p className='font-size-20 font-weight-800 txt-italic txt-uppercase'>
						Pure returns, low risk. Stake
						<br />
						and earn with high APR.
					</p>

					<Box
						key={`${box[0].coin_1.name}-${box[0].coin_2.name}-${0}`}
						formTokenPrice={formTokenPrice}
						box={box[0]}
						isFarmActive={box[0].active}
						farmType={box[0].type}
						farmName={box[0].name}
					/>
					<Migration />
					<Box
						key={`${box[1].coin_1.name}-${box[1].coin_2.name}-${1}`}
						formTokenPrice={formTokenPrice}
						box={box[1]}
						isFarmActive={box[1].active}
						farmType={box[1].type}
						farmName={box[1].name}
					/>
				</div>
				<MigrationReminder />
			</div>
		</>
	);
};

export default Farms;