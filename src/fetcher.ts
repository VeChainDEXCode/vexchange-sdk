import JSBI from "jsbi"
import { find } from 'lodash'
import { TokenAmount } from './entities/fractions/tokenAmount'
import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import ERC20 from './abis/ERC20'
import IVexchangeV2Pair from "./abis/IVexchangeV2Pair"
import { ChainId } from './constants'
import { Token } from './entities/token'

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  [ChainId.MAINNET]: {
    '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
  }
}

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetch information for a given token on the given chain, using the given ethers provider.
   * @param chainId chain of the token
   * @param address address of the token on the chain
   * @param connex optional name of the token
   * @param symbol optional symbol of the token
   * @param name optional name of the token
   */
  public static async fetchTokenData(
    chainId: ChainId,
    address: string,
    connex?: any,
    symbol?: string,
    name?: string,
  ): Promise<Token> {
    const abi = find(ERC20, { name: 'decimals' })
    const method = connex.thor.account(address).method(abi as any)

    const parsedDecimals =
      typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] === 'number'
        ? TOKEN_DECIMALS_CACHE[chainId][address]
        : await method.call().then(({ decoded }: any) => Number(decoded[0])).then((decimals: number) => {
            TOKEN_DECIMALS_CACHE = {
              ...TOKEN_DECIMALS_CACHE,
              [chainId]: {
                ...TOKEN_DECIMALS_CACHE?.[chainId],
                [address]: decimals
              }
            }
            return decimals

        })
    return new Token(chainId, address, parsedDecimals, symbol, name)
  }

  /**
   * Fetches information about a pair and constructs a pair from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param connex the provider to use to fetch the data
   */
  public static async fetchPairData(
    tokenA: Token,
    tokenB: Token,
    connex?: any
  ): Promise<Pair> {
    invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')
    const pairAddress = Pair.getAddress(tokenA, tokenB)

    const getReservesABI = find(IVexchangeV2Pair.abi, { name: 'getReserves' });
    const getReservesMethod = connex.thor.account(pairAddress).method(getReservesABI);

    const reserves = (await getReservesMethod.call()).decoded
    const { reserve0, reserve1 } = reserves
    const balances = tokenA.sortsBefore(tokenB) ? [reserve0, reserve1] : [reserve1, reserve0]

    const swapFeeABI = find(IVexchangeV2Pair.abi, { name: 'swapFee' })
    const method = connex.thor.account(pairAddress).method(swapFeeABI)
    const swapFee = JSBI.BigInt((await method.call()).decoded['0'])

    return new Pair(new TokenAmount(tokenA, balances[0]),
                    new TokenAmount(tokenB, balances[1]),
                    swapFee)
  }
}
