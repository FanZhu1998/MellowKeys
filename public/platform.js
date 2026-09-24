// Runtime details are declared by the host; music and workspace data stay shared.
export const isDesktop = document.querySelector('meta[name="mellow-runtime"]')?.content === 'desktop';
export const saveLocation = isDesktop ? 'on this computer' : 'online';
export async function printScore() {
  if (isDesktop && window.mellowDesktop) return window.mellowDesktop.savePDF();
  window.print();
}
