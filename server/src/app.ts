import express, { json }  from 'express';

import { historyRouter } from './modules/history';

const app = express();

(async function main(){
  
  app.use(json());

  app.use("/api", await historyRouter());
  

    
  app.listen(3000, () => {
    console.log('listening on port 3000');
  });

})().then(( ...args:any )=>{ 
  console.log(...args);
}).catch(( err )=>{
  console.error(err);
});

