import { CLAMP, setInverval2 } from '../lib';
import { Request, Response, Router, json } from 'express';

import { AptosClient } from 'aptos';
import { Client } from 'pg';
import { inspect } from 'util';

const WATCHED_ACCOUNTS:Map<string, WatchedAddress> = new Map();

export interface WatchedAddress {
  address: string;
  last_sequence: number;
  isBusy?: boolean;
}

// const POLL_INTERVAL = 1000 * 60 * 60 * 4; // 4 hours
const POLL_INTERVAL = 1000 * 60 // 1 minute
const POLL_LIMIT = 1000;

/* Blockchain */
const CHAIN_URL = 'https://fullnode.mainnet.aptoslabs.com/v1';
const aptosClient = new AptosClient(CHAIN_URL, {
});

/* Database */
const pg = new Client({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  user: 'postgres',
  password: 'y37ctyn5487thfyn4857hv78543yn',
  database: 'wallet'
});


async function updateAccount(wa:WatchedAddress){
  if(wa.isBusy){
    return;
  }

  try{

    const max = Number((await aptosClient.getAccount(wa.address)).sequence_number);

    let lastSequenceNumber = CLAMP((wa.last_sequence || 0), max - 1000, max);

    console.log(`Expecting ${max} transactions for ${wa.address}`);

    if(lastSequenceNumber < max){
      console.log(`Getting new transactions for ${wa.address}`);

      wa.isBusy = true;

      for(let i = lastSequenceNumber; i < max; i+=POLL_LIMIT){
        const txns = await aptosClient.getAccountTransactions(wa.address, {
          limit: POLL_LIMIT,
          start: i,
        });


        console.log(`Got ${txns.length} new transactions for ${wa.address}`);
        
        for(const txn of (txns as any[])){

          if(!txn.sequence_number){
            continue;
          }

          const block = await aptosClient.getBlockByVersion(Number(txn.version), false);

          await pg.query(`
            INSERT INTO txns (raw, hash,  version, sender, type, sequence, timestamp, block, block_height)
            VALUES ($1::json, $2::text, $3::text, $4::text, $5::text, $6::bigint, $7::bigint, $8::json, $9::bigint)
          `, [
            JSON.stringify(txn),
            txn.hash,
            Number(txn.version),
            txn.sender,
            txn.type,
            Number(txn.sequence_number),
            Number(txn.timestamp),
            block,
            block.block_height
          ]);

          wa.last_sequence = Number(txn.sequence_number);
          console.log(`Inserted transaction ${txn.sequence_number}`);
        }

        // update last sequence number  
      }
      await pg.query(`
        UPDATE accounts 
        SET last_sequence = $1::int 
        WHERE address = $2::text
      `, [wa.last_sequence, wa.address]);
    }
  }catch(err){
    console.log(err)
  }
  wa.isBusy = false;
}

export async function historyRouter(){


  try{
    await pg.connect();
  } catch (error) {
    console.error(error);
  }
  
  // delete all tables
  await pg.query(`
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS txns;
  `);

  // create tables
  await pg.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      address TEXT PRIMARY KEY,
      is_busy BOOLEAN DEFAULT FALSE,
      last_sequence INT
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS txns (
      version TEXT PRIMARY KEY,
      raw JSON,
      hash TEXT,
      sender TEXT,
      timestamp BIGINT,
      type TEXT,
      sequence BIGINT,
      amount BIGINT,
      block JSON,
      block_height BIGINT
    );
  `);

  await pg.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_txns_account_sequence ON txns (sender, sequence);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_txns_hash ON txns (hash);
    CREATE INDEX IF NOT EXISTS idx_txns_sender ON txns (sender);
    CREATE INDEX IF NOT EXISTS idx_txns_version ON txns (version);
  `);

  
  const { rows } = await pg.query('SELECT * FROM accounts');
  rows.forEach((wa:WatchedAddress)=>{
    WATCHED_ACCOUNTS.set(wa.address, wa);
  })

  console.log(`Watching ${WATCHED_ACCOUNTS.size} accounts`);
    
  // every 4 hours, check for new transactions on all watched accounts
  setInverval2(async ()=>{
    console.log("Checking for new transactions");
    
    for(const wa of WATCHED_ACCOUNTS.values()){
      await updateAccount(wa);
    }
  }, POLL_INTERVAL);

  

  const router = Router();

  
  /*
  -------------------------------------
  Accounts
  -------------------------------------
  */

  router.get('/accounts', async (req: Request, res: Response) => {

    // list watched accounts
    const { rows } = await pg.query('SELECT * FROM accounts');
    res.json(rows);
  });

  /*
  -------------------------------------
  Account
  -------------------------------------
  */
  router.get('/accounts/:address', async (req: Request, res: Response) => {

    const address = req.params.address;
    if(!address){
      return res.status(400).json({error: "Address is required"});
    }

    if(!WATCHED_ACCOUNTS.has(address) || !WATCHED_ACCOUNTS.get(address).isBusy){
      await ensureAccount(address);
      res
        .setHeader("Retry-After", "10")
        .sendStatus(202);
      return;
    }
    
    const { rows } = await pg.query(`
      SELECT * FROM accounts WHERE address = $1::text LIMIT 1
    `, [address]);

    res.json(rows[0]);
  });
  
  /*
  -------------------------------------
  Account/Resources
  -------------------------------------
  */
  router.get('/accounts/:address/resources', async (req: Request, res: Response) => {

    const address = req.params.address;
    if(!address){
      return res.status(400).json({error: "Address is required"});
    }
    
    await ensureAccount(address);
    const accountResources = await aptosClient.getAccountResources(address);

    res.json(accountResources);
  });

  /*
  -------------------------------------
  Account/Txns
  -------------------------------------
  */
  router.get('/accounts/:address/txns', async (req: Request, res: Response) => {

    const address = req.params.address;
    const limit = Number(req.query.limit) || 100;
    const page = Math.max(1, Number(req.query.page) || 1);

    if(!address){
      return res.status(400).json({error: "Address is required"});
    }
    
    await ensureAccount(address);

    console.log(`Getting transactions for ${address}`);


    const totalItems = await pg.query(`
      SELECT COUNT(*) FROM txns WHERE sender = $1::text
    `, [address]);
    
    const { rows } = await pg.query(`
      SELECT
        version,
        timestamp,
        hash,
        sequence,
        sender
      FROM txns WHERE sender = $1::text 
      ORDER BY sequence DESC LIMIT $2::int OFFSET $3::int
    `, [address, limit, (page - 1) * limit]);

    res.json({
      items: rows,
      limit,
      totalItems: Number(totalItems.rows[0].count),
    });
  });

  /*
  -------------------------------------
  Txn
  -------------------------------------
  */
  router.get('/txns/:hash', async (req: Request, res: Response) => {

    const hash = req.params.hash;

    console.log(`Getting transaction ${hash}`);

    if(!hash){
      return res.sendStatus(400);
    }

    const { rows } = await pg.query(`
      SELECT * FROM txns WHERE hash = $1::text LIMIT 1
    `, [hash]);

    const item = rows[0];

    const changes = (item.raw as any).changes.reduce((acc, change)=>{
      const type = change.data?.type;
      const amt = Number(change.data?.data?.coin?.value) || 0;
      if(!amt || !type){
        return acc;
      }
      acc[type] = Number(acc[type] || 0) + amt;
      return acc;
    }, {});
    
    item.amounts = changes;

    res.json(item);

  });


  return router;
}


export async function ensureAccount(address:string){
  
  // check if account exists
  const { rows: [account] } = await pg.query(`
    SELECT * FROM accounts WHERE address = $1::text LIMIT 1
  `, [address]);

  if(account){
    console.log("Account already exists");
    return;
  }

  const wa = {
    address,
    last_sequence: 0,
  };
  
  WATCHED_ACCOUNTS.set(wa.address, wa);

  try{
    const { rows } = await pg.query(`
      INSERT INTO accounts (address, last_sequence) 
      VALUES ($1::text, $2::int)
    `, [
      wa.address,
      wa.last_sequence
    ]);
    
    console.log(`Added account ${address} to watched accounts.`);
  }catch(err){
    // console.log(err);
  }
  await updateAccount(wa);
}

