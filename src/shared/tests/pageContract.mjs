// Shared page contract for browser QA scripts (DS U3): the page renders PageContainer + PageHeader.
// `pageContractScript` is evaluated in the page (CDP Runtime.evaluate) and returns the measurements;
// `pageContractProblems` compares them with the expected title, breadcrumbs and header actions.
//
// Contract: one <main> and one <h1>; h1 32px/40px (24px/30px at ≤640px) bold; the heading labels a
// <section> with max-width 1280px; the h1 is aligned with the container's content box; no card
// (shadow or white surface) wraps the header; breadcrumbs exact with 24px gap; header margin 24px;
// header actions inside the header; no horizontal overflow.

export const pageContractScript = `(()=>{
  const h1s=[...document.querySelectorAll('h1')], h1=h1s[0];
  if(!h1)return {h1s:0,mains:document.querySelectorAll('main').length};
  const s=getComputedStyle(h1), header=h1.closest('header'), container=h1.closest('section[aria-labelledby]');
  const client=document.documentElement.clientWidth;
  let wrapped=false;
  for(let el=h1.parentElement;el&&el.tagName!=='MAIN'&&el!==document.body;el=el.parentElement){
    const c=getComputedStyle(el);if(c.boxShadow!=='none'||c.backgroundColor==='rgb(255, 255, 255)')wrapped=true}
  const nav=container?.querySelector('nav[aria-label="Ruta de navegación"]')??document.querySelector('main nav[aria-label="Ruta de navegación"]');
  const cs=container?getComputedStyle(container):null, cr=container?.getBoundingClientRect();
  const actionTexts=header?[...header.querySelectorAll('a,button')].map(el=>el.textContent.trim()):[];
  return {mains:document.querySelectorAll('main').length,h1s:h1s.length,title:h1.textContent.trim(),
    size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,
    maxWidth:cs?.maxWidth??null,labelled:container?.getAttribute('aria-labelledby')===h1.id&&!!h1.id,
    alignment:cr?Math.abs(h1.getBoundingClientRect().left-(cr.left+parseFloat(cs.paddingLeft))):null,
    containerWidth:cr?Math.round(cr.width):null,client,wrapped,
    crumbs:nav?[...nav.querySelectorAll('li')].map(li=>li.textContent.trim()):[],
    breadcrumbGap:nav?getComputedStyle(nav).marginBottom:null,headerGap:header?getComputedStyle(header).marginBottom:null,
    actionTexts,overflow:document.documentElement.scrollWidth>client+1};
})()`

export function pageContractProblems(page, { width, title, crumbs = [], actions = [] }) {
  if (!page.h1s) return [`sin h1 (${page.mains} main)`]
  const problems = []
  if (page.mains !== 1 || page.h1s !== 1) problems.push(`main/h1 ${page.mains}/${page.h1s}`)
  if (title !== undefined && page.title !== title) problems.push(`título «${page.title}»`)
  const phone = width <= 640
  if (page.size !== (phone ? '24px' : '32px') || page.weight !== '700' || page.lineHeight !== (phone ? '30px' : '40px'))
    problems.push(`h1 ${page.size}/${page.weight}/${page.lineHeight}`)
  if (page.maxWidth !== '1280px' || !page.labelled) problems.push(`contenedor ${page.maxWidth} etiquetado=${page.labelled}`)
  if (page.containerWidth !== null && Math.abs(page.containerWidth - Math.min(page.client, 1280)) > 1)
    problems.push(`ancho del contenedor ${page.containerWidth}/${Math.min(page.client, 1280)}`)
  if (page.alignment === null || page.alignment > 1) problems.push(`h1 desalineado ${page.alignment}`)
  if (page.wrapped) problems.push('cabecera dentro de una tarjeta')
  if (JSON.stringify(page.crumbs) !== JSON.stringify(crumbs)) problems.push('migas ' + JSON.stringify(page.crumbs))
  if (crumbs.length && page.breadcrumbGap !== '24px') problems.push('separación de migas ' + page.breadcrumbGap)
  if (page.headerGap !== '24px') problems.push('separación de cabecera ' + page.headerGap)
  const missing = actions.filter((action) => !page.actionTexts.includes(action))
  if (missing.length) problems.push('acciones fuera de la cabecera ' + JSON.stringify(missing))
  if (page.overflow) problems.push('desbordamiento horizontal')
  return problems
}
