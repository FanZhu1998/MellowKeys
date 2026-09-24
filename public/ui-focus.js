// Remember semantic identity across small, dynamic control rerenders.
const attributes=['data-world','data-color','data-length','data-audition','data-pin','data-edit','data-idea','data-pick','data-select-open'];
export function rememberFocus() {
  const element=document.activeElement;
  if (!element || element===document.body) return () => {};
  const attribute=attributes.find(name=>element.hasAttribute(name));
  const selector=element.id ? '#'+CSS.escape(element.id) : attribute ? '['+attribute+'="'+CSS.escape(element.getAttribute(attribute))+'"]' : null;
  return () => { if(!element.isConnected && selector)document.querySelector(selector)?.focus({preventScroll:true}); };
}
