export function safeLocal(url) {
  return typeof url==='string' && !/\s/.test(url) && /^(home|list|ranks|stamps|play)\.html(\?[^#\s]*)?(#\S*)?$/.test(url) ? url : null;
}
export function currentLocal({pathname='',search='',hash=''}) {
  return (pathname.split('/').pop()||'home.html')+search+hash;
}
