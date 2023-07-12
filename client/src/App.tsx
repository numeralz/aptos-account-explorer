import axios from 'axios';
import { Alert, Badge, Button, Card, Col, Container, Form, FormControl, InputGroup, ListGroup, Pagination, Row, Table } from 'solid-bootstrap';
import { For, Show, createSignal, type Component, createResource, createEffect } from 'solid-js';

import {
  useNavigate,
  useParams,
  useSearchParams
} from "@solidjs/router";
import RenderObject from './components/RenderObject';
import Paginate from './components/Paginate';
import RenderTime from './components/RenderTime';
import { getFunctionName, prettyName } from './utils';
import WalletAddress from './components/WalletAddress';

const PAGINATE_SIZE = 100;

function totalFee(txn:any){
  return txn.raw.gas_used * txn.raw.gas_unit_price;
}

const App: Component = () => {
  
  const navigate = useNavigate();
  const params = useParams();

  const [
    query, $query
  ] = useSearchParams<{
    page?: string;
  }>();

  // const pageNum = () => Number(query.page) || 1;

  const [loading, $loading] = createSignal<boolean>(false);
  
  const [activeItem, $activeItem] = createSignal<any>();
  const [activeAccount, $activeAccount] = createSignal<any>();
  const [numPages, $numPages] = createSignal<number>(1);

  const [page, $page] = createSignal<number>(
    Number(query.page) || 1
  );

  async function fetchAccount(account:string) {
    try{
      const {
        data,
      } = await axios.request( {
        method : "GET",
        url    : `/api/accounts/${account}`,
      } );
      console.log({
        account: data
      });
      return data;    
    }
    catch( error:any ){
      console.error( error );
    }
  }

  async function fetchTransaction(txn:any) {
    try{
      const {
        data,
      } = await axios.request( {
        method : "GET",
        url    : `/api/txns/${txn.hash}`,
      } );
      console.log({
        txn: data
      });
      return data as any;
    }
    catch( error:any ){
      console.error( error );
    }
  }
  
  async function fetchTransactions(account:string, page:number=1) {
    $loading(true);

    try{
      const {
        data,
      } = await axios.request( {
        method : "GET",
        url    : `/api/accounts/${account}/txns`,
        params : {
          page,
          limit: PAGINATE_SIZE,
        }
      } );
  
      const {
        items,
        totalItems,
        limit
      } = data;
      
      $page(
        Math.max(1, Math.min(page, Math.ceil(totalItems/limit)))
      );
      $numPages( Math.ceil(totalItems/limit) );
  
      return (items as any[]).map(x=>{
  
        const funcParts = (x.raw?.payload?.function||"").split("::");
        // const typeParts = (x.raw?.payload?.type_arguments||"").split("::");
  
        let netAmount = 0;
  
        x.raw?.events?.forEach((event:any) => {
          const amt = Number(event.data.amount);
  
          if( event.type === "0x1::coin::WithdrawEvent" ){
            netAmount -= amt;
          }
          else if( event.type === "0x1::coin::DepositEvent" ){
            netAmount += amt;
          }
        })
  
        return {
          ...x,
          _type: funcParts[1]+"::"+funcParts[2],
          _currency: funcParts[1],
          _netAmount: netAmount,
        }
      })
    }
    catch( error:any ){
      console.error( error );
    }
    
    $loading(false);
  }

  let addressEl: typeof FormControl.prototype;

  const [transactions, {
    mutate: $transactions,
    refetch: $refetchTransactions
  }] = createResource(async ()=>{
    console.log("=fetch transactions")
    return await fetchTransactions(params.address, page());
  });

  const [account, {
    mutate: $account,
    refetch: $refetchAccount
  }] = createResource(async ()=>{
    console.log("=fetch account")
    return await fetchAccount(params.address);
  });

  createEffect(async ()=>{
    $query({
      page: page().toString()
    });

    $refetchTransactions();
  }, [
    page(),
  ], {
    render: true,
  })

  createEffect(async ()=>{
    $activeItem(undefined);
    $transactions([]);
    $refetchAccount();
  }, [
    params.address
  ],{
    render: true,
  });
  
  createEffect(async ()=>{
    $page(
      Number(query.page)
    );
    // $refetchTransactions();
  }, [
    query.page
  ],{
    // render: true,
  });

  
  // createEffect(async ()=>{
  //   $refetchTransactions();
  // }, [
  //   query.page
  // ],{
  //   render: true,
  // });



  return (
    <div class="grid-h">
      <div class="menu">
        <Show when={!!transactions()?.length} fallback={
          <div class="d-flex align-items-center justify-content-center h-100 bg-light">
            <Alert>
              Enter a valid address to view transactions
            </Alert>
          </div>
        }>
          <div class="grid-v">
            <div class="menu p-2">
              <Paginate numPages={numPages} page={page} setPage={$page} />
            </div>
            <div class="main">
              <Table variant='hover' size="sm" class="w-100 bg-light cursor-pointer">
                <thead class="sticky-top">
                  <tr class="border-bottom border-top table-light text-center">
                    <th class="w-0">#</th>
                    <th>Version</th>
                    <th>Timestamp</th>
                    {/* <th>From</th> */}
                  </tr>
                </thead>
                <tbody>
                  <For each={transactions()}>{ item => 
                    <tr 
                      onClick={ async ()=>{
                        $activeItem( await fetchTransaction(item) );
                      }}
                      class={ ( activeItem()?.sequence === item?.sequence) ? 'table-primary' : '' }
                    >
                      <td>
                        <Badge class="rounded-pill bg-light text-dark border">
                          { item.sequence }
                        </Badge>
                      </td>
                      <td>
                        <code>{ item.version }</code>
                      </td>
                      <td><RenderTime value={ new Date( Number(item.timestamp)/1000 ) }/></td>
                      {/* <td><WalletAddress value={ item.sender }/></td> */}
                    </tr>
                  }</For>
                </tbody>
              </Table>
            </div>
          </div>
        </Show>
      </div>

      <div class="main bg-light">
        <Container class="py-4">
          <Row class="g-3 h-100">
            <Col xs="12" class="sticky-top z-top">
              <Form
                class="py-2 w-100 bg-light"
                onSubmit={
                  async (e) => {
                    e.preventDefault();
                    const _address = addressEl.value;
                    navigate(`/${_address}`);
                  }
                }
              >
                <InputGroup
                  class="rounded-4 shadow-sm input-group-lg"
                >
                  <Form.Control
                    placeholder="Address"
                    value={params.address||''}
                    ref={addressEl}
                  />
                  {/* <Button variant="secondary" type="submit">
                    <i class="fa fa-search"></i>
                  </Button> */}
                  {
                    activeItem() && (
                      <Button target="_blank" href={`https://aptoscan.com/version/${activeItem().version}`}>Reference <i class="fa fa-external-link"></i></Button>
                    )
                  }
                </InputGroup>
              </Form>
            </Col>

            <Show when={!!activeItem()}>
              <Col xs="12">
                <h3 class="sticky-top bg-light py-2 border-bottom" style="top: 4rem;">Transaction <sup>#</sup>{ activeItem().sequence} &middot; { activeItem().version }</h3>
                <ListGroup >
                  {/* <ListGroup.Item class="p-3 bg-light">
                    <code>
                      { activeItem().hash }
                    </code>
                  </ListGroup.Item> */}
                  <ListGroup.Item class="p-3">
                    { ((a)=><RenderObject value={ {
                      version: a.version,
                      hash: a.hash,
                      sequence: a.sequence,
                      block_height: a.block_height,
                      tx_type: prettyName(a.raw.type),
                      status: (
                        a.raw.success ? (
                          ()=><Badge class="bg-success rounded-pill py-2"><i class="fa fa-fw fa-circle-check text-white"/> Success</Badge>
                        ) : (
                          ()=><i class="fa fa-circle-exclamation text-secondary"></i>
                        )
                      ),
                    } }/>)( activeItem() ) }
                  </ListGroup.Item>
                  <ListGroup.Item class="p-3">
                    { ((a)=><RenderObject value={ {
                      tx_action: ()=>(
                        <strong class="text-uppercase">{
                          getFunctionName(a.raw?.payload?.function)
                        }</strong>
                      ),
                      fee: totalFee(a),
                      sequence: a.sequence,
                    } }/>)( activeItem() ) }

                  </ListGroup.Item>
                  <ListGroup.Item class="p-3">
                    <h6>VM Status</h6>
                    { ((a)=><RenderObject value={ {
                      root_hash: a.raw.event_root_hash,
                      state_change_hash: a.raw.state_change_hash,
                      state_checkpoint_hash: a.raw.state_checkpoint_hash,
                      accumulator_root_hash: a.raw.accumulator_root_hash,
                      vm_status: a.raw.vm_status,
                    } }/>)( activeItem() ) }
                  </ListGroup.Item>
                  <ListGroup.Item class="p-3">
                    <h6>Gas</h6>
                    { ((a)=><RenderObject value={ {
                      used: a.raw.gas_used,
                      max: a.raw.max_gas_amount,
                      unit_price: a.raw.gas_unit_price,
                      fee: a.raw.gas_used * a.raw.gas_unit_price,
                    } }/>)( activeItem() ) }
                  </ListGroup.Item>
                  <ListGroup.Item class="p-3">
                    <h6>Signature</h6>
                    { ((sig)=><RenderObject value={ sig }/>)( activeItem().raw?.signature ) }
                  </ListGroup.Item>
                </ListGroup>
              </Col>
              <Col xs="12">
                <h5 class="sticky-top bg-light py-2 border-bottom" style="top: 4rem;">Events</h5>
                <For each={activeItem().raw?.events}>{ event =>
                  <ListGroup class="mb-3">
                    <ListGroup.Item class="bg-light">
                      <h5 class="m-0">{(event.type).match(/^.+?::(.+?::.+?)\b/i)?.[1]}</h5>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <RenderObject value={event} />
                    </ListGroup.Item>
                  </ListGroup>
                }</For>
              </Col>

              <Col xs="12">
                <h5 class="sticky-top bg-light py-2 border-bottom" style="top: 4rem;">Changes</h5>
                <ListGroup class="mb-3">
                  <For each={activeItem().raw?.changes }>{ change =>
                    <ListGroup.Item>
                      <RenderObject value={change} />
                    </ListGroup.Item>
                  }</For>
                </ListGroup>
              </Col>
              
              {/* <Col xs="12">
                <h5 class="sticky-top bg-light py-2 border-bottom" style="top: 4rem;">Raw</h5>
                <RenderObject value={ {
                  ...activeItem().raw,
                } }/>
              </Col> */}
            </Show>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default App;
