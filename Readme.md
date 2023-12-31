# A simple Aptos Transaction explorer


## Tech Stack

- [Docker](https://docs.docker.com/)
- [Node.js](https://nodejs.org/en/)
  - [Postgres](https://www.npmjs.com/package/pg)
  - [Express](https://expressjs.com/)
- [SolidJS](https://www.solidjs.com/)
  - [Bootstrap](https://getbootstrap.com/)
- [Aptos](https://aptos.dev/sdks/ts-sdk/index/)


## Local Development
```sh
# Server
cd ./server && yarn && yarn dev

# Client
cd ./client && yarn && yarn dev

# Postgres
docker compose up db
# or run a local postgres 
```

## Testing

#### Run with Docker

  ```sh
  docker compose up --build
  ```

#### Open the client in your browser

<http://localhost:3001>
<http://127.0.0.1:3001>


#### Paste an Aptos address into the text bar at the top

  ![Alt text](image-2.png)

#### Transactions should begin showing up

  - The backend will begin fetching transactions in batches from `https://fullnode.mainnet.aptoslabs.com/v1` and store them in the database
  - The server will send a 202 with Retry-After 10 seconds
  - Client will re-request after 10 seconds
  - Subsequent requests will return data from the database

  ![Alt text](image-3.png)


<!-- <style>
img {
  width: 100%;
  height: auto;
}
</style> -->