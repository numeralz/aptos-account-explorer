// import { AptosAccount, AptosClient, CoinClient, FaucetClient } from "aptos";

import { AptosClient } from 'aptos';

const CHAIN_URL = 'https://fullnode.mainnet.aptoslabs.com/v1';
const client = new AptosClient(CHAIN_URL, {
});


export async function getAccountInfo(address:string){
  return await client.getAccount(address);
}

export function CLAMP(value:number, min:number, max:number){
  return Math.min(Math.max(value, min), max);
}

export function setInverval2 (callback: (...args: any[]) => void, delay: number, ...args: any[]) {
  callback(...args);
  return setInterval(callback, delay, ...args);
}