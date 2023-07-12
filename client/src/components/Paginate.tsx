import { Button, Col, Pagination, Row } from "solid-bootstrap";
import { Component, createEffect, createSignal } from "solid-js";

const showPages = 5;

const Paginate: Component<{
  numPages: ()=>number,
  page: ()=>number,
  setPage: (page:number)=>void
}> = ({
  numPages,
  page,
  setPage,
}) => {

  const [pages, $pages] = createSignal<number[]>([]);

  createEffect(()=>{
    // always show showPages pages
    const p = page();
    const n = numPages();
    const a = Math.max(1, Math.min(p - Math.floor(showPages/2), n-showPages+1));
    const b = Math.min(n, a+showPages-1);

    
    $pages(
      Array.from(
        {length: b-a+1},
        (_,i)=>(a+i)
      )
    )
  }, [
    page()
  ], {
    render: true
  });

  const setPage_ = (x:number) => setPage(
    Math.max(1, Math.min(numPages(), x))
  )
  
  return (
    <Pagination size="sm" class="my-2 flex-nowrap row g-1">
      {/* <Pagination.First
        onClick={ (e)=>(setPage_( 1 )) }
        disabled={ ( page() === 1) }
        class={ [( page() === 1) ? 'faded' : '', 'rounded-pill', 'col-auto'].join(" ") }
      >
        <i class="fa fa-angles-left"></i>
      </Pagination.First> */}
      
      <Pagination.Prev
        onClick={ (e)=>(setPage_( page()-1 )) }
        disabled={ ( page() <= 1) }
        class={ [( page() <= 1) ? 'faded' : '', 'col-1 text-center'].join(" ") }
      >
        <i class="fa fa-chevron-left"></i>
      </Pagination.Prev>

      <Col class="d-flex" >
        { pages()?.map( (p) => {
            return(
              <Pagination.Item 
                onClick={ (e)=>(setPage_(p)) } 
                active={ (p===page()) }
                class="flex-fill text-center overflow-hidden"
              >
                {p}
              </Pagination.Item>
            )
        } ) }
      </Col>
      
      <Pagination.Next 
        onClick={ (e)=>(setPage_(page()+1)) }
        disabled={ (page() >= numPages()) }
        class={[ (page() >= numPages()) ? 'faded' : '', 'col-1 text-center'].join(" ") }
      >
        <i class="fa fa-chevron-right"></i>
      </Pagination.Next>

      {/* <Pagination.Last 
        onClick={ (e)=>(setPage_( numPages() )) }
        disabled={ (page() >= numPages()) }
        class={ [(page() >= numPages()) ? 'faded' : '', 'col-auto'].join(" ") }
      >
        <i class="fa fa-angles-right"></i>
      </Pagination.Last> */}
    </Pagination>
  )
}

export default Paginate;
