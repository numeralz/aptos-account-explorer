// format snake_case to Title Case
export function prettyName(name: string) {
  if(!name) return "";

  return String(name)
      .split(/[_-\s\.]+/)
      .map((word) => {
        return word[0].toUpperCase() + word.slice(1);
      })
      .join(' ');
}

export function getFunctionName(func:string){
  const [address, module, args] = func.match(/^(\w+)::(\w+::\w+)(\<[\w\W]+\>)?$/)?.slice(1) || [];
  return module;
}

export function getAddress(txn:any){
  const func = txn.raw?.payload?.function;
  const name = func?.split?.("::")[0] || "";
  return name;
}
