// WalletAddress.tsx

import { Button } from "solid-bootstrap"
import { Component } from "solid-js"

const WalletAddress:Component<{
  value: string,
  onClick?: () => void
}> = ({
  value,
  onClick
}) => {
    return (
      <> 
        <Button variant="" size="sm" class="rounded-pill overflow-hidden text-truncate ps-3" onClick={onClick}>
          <i class="fa fa-wallet me-2 faded d-none d-md-inline"></i>
          <span class="font-monosapace text-truncate overflow-hidden">{ (value).slice(0,10)} </span>
        </Button>
      </>
    )
}

export default WalletAddress;