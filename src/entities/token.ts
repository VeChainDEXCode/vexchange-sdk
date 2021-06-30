import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'

import { ChainId, SolidityType } from '../constants'
import ERC20 from '../abis/ERC20.json'
import { validateAndParseAddress, validateSolidityTypeInstance } from '../utils'

let CACHE: { [chainId: number]: { [address: string]: number } } = {
  [ChainId.MAINNET]: {
    '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
  }
}

export class Token {
  public readonly chainId: ChainId
  public readonly address: string
  public readonly decimals: number
  public readonly symbol?: string
  public readonly name?: string

  static async fetchData(
    chainId: ChainId,
    address: string,
    provider = getDefaultProvider(getNetwork(chainId)),
    symbol?: string,
    name?: string
  ): Promise<Token> {
    const parsedDecimals =
      typeof CACHE?.[chainId]?.[address] === 'number'
        ? CACHE[chainId][address]
        : await new Contract(address, ERC20, provider).decimals().then((decimals: number): number => {
            CACHE = {
              ...CACHE,
              [chainId]: {
                ...CACHE?.[chainId],
                [address]: decimals
              }
            }
            return decimals
          })
    return new Token(chainId, address, parsedDecimals, symbol, name)
  }

  constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string) {
    validateSolidityTypeInstance(JSBI.BigInt(decimals), SolidityType.uint8)

    this.chainId = chainId
    this.address = validateAndParseAddress(address)
    this.decimals = decimals
    if (typeof symbol === 'string') this.symbol = symbol
    if (typeof name === 'string') this.name = name
  }

  equals(other: Token): boolean {
    const equal = this.chainId === other.chainId && this.address === other.address
    if (equal) {
      invariant(this.decimals === other.decimals, 'DECIMALS')
      if (this.symbol && other.symbol) invariant(this.symbol === other.symbol, 'SYMBOL')
      if (this.name && other.name) invariant(this.name === other.name, 'NAME')
    }
    return equal
  }

  sortsBefore(other: Token): boolean {
    invariant(this.chainId === other.chainId, 'CHAIN_IDS')
    invariant(this.address !== other.address, 'ADDRESSES')
    return this.address.toLowerCase() < other.address.toLowerCase()
  }
}

export const VVET = {
  [ChainId.MAINNET]: new Token(
    ChainId.MAINNET,
    '0x93e5fa8011612fab061ef58cbab9262d2e76407b',
    18,
    'WVET',
    'Wrapped VET'
  ),
  [ChainId.ROPSTEN]: new Token(
    ChainId.ROPSTEN,
    '0x93e5fa8011612fab061ef58cbab9262d2e76407b',
    18,
    'WVET',
    'Wrapped VET'
  ),
  [ChainId.RINKEBY]: new Token(
    ChainId.RINKEBY,
    '0x93e5fa8011612fab061ef58cbab9262d2e76407b',
    18,
    'WVET',
    'Wrapped VET'
  ),
  [ChainId.GÖRLI]: new Token(ChainId.GÖRLI, '0x93e5fa8011612fab061ef58cbab9262d2e76407b', 18, 'WVET', 'Wrapped Vet'),
  [ChainId.KOVAN]: new Token(ChainId.KOVAN, '0x93e5fa8011612fab061ef58cbab9262d2e76407b', 18, 'WVET', 'Wrapped Vet')
}
