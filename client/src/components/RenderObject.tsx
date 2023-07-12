import { Alert, Badge, Button, Col, ListGroup, Row, Table } from "solid-bootstrap";
import { getFunctionName, prettyName } from "../utils";

import { Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import RenderTime from "./RenderTime";
import { css } from "solid-styled";

// Render object

const RenderNumber: Component<{
  value: number
}> = (o) => {
  return (
    <code>{o.value}</code>
  )
}

const RenderString: Component<{
  value: string
}> = ({
  value
}) => {

  if(value.match(/\w{2,}\:\/\//)){
    return (
      <Button href={value} target="_blank" size="sm" class="px-3 rounded-pill text-truncate">
        <i class="fa fa-fw fa-link"/> <span>{value}</span>
      </Button>
    )
  }

  if(value.split("::").length>=3){
    if(value.match(/\<.+\>/)){
      return (
        <Alert title={value} class="py-0 font-monospace">
          {value}
        </Alert>
      )
    }
    return (
      <Alert title={value} class="py-0 font-monospace">
        {getFunctionName(value)}
      </Alert>
    )
  }

  if(value.match(/^0x/)){
    return (
      <Alert title={value} variant="info" class="py-0 font-monospace">
        {value}
      </Alert>
    )
  }

  return (
    <code class="pre">
      {value}
    </code>
  )
}


const RenderObject: Component<{
  value: any,
  depth?: number,
  path?: string[],
}> = ({value, depth, path}) => {

  if (typeof value === 'string') {
    return <RenderString value={value} />
  }else if (typeof value === 'boolean') {
    return value ? (
      <div class="text-success"><i class="fa fa-fw fa-check"/> <strong>True</strong></div>
    ) : (
      <div class="text-secondary"><i class="fa fa-fw fa-times"/> <span>False</span></div>
    );
  }else if (typeof value === 'number') {
    return <RenderNumber value={value} />
  }else if (value instanceof Date) {
    return <RenderTime value={value} />
  }else if(typeof value === 'function'){
    return (
      ((a)=><RenderObject value={a}/>)( value() )
    )
  }else if(value instanceof Node){
    return (
      value
    )
  }else if (Array.isArray(value)) {
    return (
      <div class="border-start ps-2">
        <Row class="g-3 w-100">
          { value.map((v,i) => {
            return (
              <Col sm="12">
                <Badge class="mt-n3 border text-dark bg-white"> 
                  {
                    (path && path.length > 0) && (
                      <div class="pre">{ i }</div>
                    )
                  }
                </Badge>
                <RenderObject value={v} depth={ (depth||0) + 1 }/>
              </Col>
            )
          }) }
        </Row>
      </div>
    )
  }else if( typeof value === 'object' && value !== null ){

    const catalog = objectCatalog(value);

    const longestKey = catalog.reduce( (acc, [path, v]) => {
      return Math.max(acc, path.join('.').length)
    }, 0);
    
    return (
      <>
        <Table borderless style="table-layout: fixed;">
          <tbody>
            { 
              catalog.map( ([path, v], i) => {

                let lastPath = i > 0 ? catalog[i-1][0] : [];
                let lastKeySame = true;
                let sameParts = path.map(( p, i) => {
                  if(!lastKeySame) return false;
                  return  lastKeySame = (p === lastPath[i]);
                } );

                let numSame = sameParts.filter( x => x ).length-1;

                return (
                  (Array.isArray(v)) ? (
                    <>
                      <tr 
                        title={path.join('.')}
                      >
                        <th
                          colspan={longestKey}
                        >                            
                          <div class="text-nowrap" title={path.join(".")}>
                            {prettyName(path.slice(-2).join("."))}
                          </div>
                        </th>
                      </tr>
                      <tr>
                        <td
                          colspan={longestKey}
                        >
                          <div>
                            <RenderObject value={v} depth={ (depth||0) + 1 } path={path} />
                          </div>
                        </td>
                      </tr>
                    </>
                  ):(
                    <tr>
                      <th
                        title={path.join('.')}
                        style="width:30%"
                      >
                        <div class="text-nowrap" title={path.join(".")}>
                          {prettyName(path.slice(-2).join("."))}
                        </div>
                      </th>
                      <td>
                        <RenderObject value={v} depth={ (depth||0) + 1 } />
                      </td>
                    </tr>
                  )
                )
              } ) 
            }
          </tbody>
        </Table>
      </>
    )
  }else{
    return <div class="pre">{ value }</div>
  }
}


/* 
convert
{
  this: {
    test: 2,
    is: {
      a: {}
    }
  }
}
to
[
  [['this','test'], 2],
  [['this','is','a'], {}]
]
*/
function objectCatalog(o:any):[string[],any][]{
  const catalog:any = [];


  function recurse(o:any, path:any){
    // array
    if( typeof o === 'object' && o !== null && !Array.isArray(o) ){
      Object.entries(o).forEach( ([k, v]) => {
        recurse(v, [...path, k])
      })
    }else{
      catalog.push([path, o])
    }
  }

  recurse(o, []);
  return catalog
}

export default RenderObject;