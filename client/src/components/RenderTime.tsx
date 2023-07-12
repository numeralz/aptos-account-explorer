// RenderTime.tsx

import { Badge, Button, Card, Col, Container, Form, FormControl, InputGroup, ListGroup, Pagination, Row, Table } from 'solid-bootstrap';
import { For, Show, createSignal, type Component, createResource, createEffect } from 'solid-js';


const RenderTime: Component<{
  value: Date|string
}> = ({
  value
}) => {

  const dateString = new Date(value)?.toLocaleString();

  return (
    (dateString !== "Invalid Date")?(
      <Badge class="bg-light text-dark text-truncate text-nowrap d-inline">
        <i class="far fa-clock me-2 faded"></i>
        <span class="font-monospace">{ dateString }</span>
      </Badge>
    ):(
      <></>
    )
  )
}

export default RenderTime;