import type { Product } from './types';

/** Isolated preview illustrations and prices, NEVER real merchandise or stock. */
function illustrativeArtwork(primary: string, secondary: string, motif: 'arch' | 'circle' | 'lines' | 'vase'): string {
  let drawing = '';
  if (motif === 'arch') drawing = '<path d="M146 650V309c0-135 108-243 241-243s241 108 241 243v341" fill="none" stroke="'+secondary+'" stroke-width="3"/><path d="M220 620V328c0-91 74-165 166-165s166 74 166 165v292" fill="'+secondary+'" opacity=".3"/>';
  if (motif === 'circle') drawing = '<circle cx="405" cy="346" r="217" fill="'+secondary+'" opacity=".8"/><path d="M87 634c175-240 433-207 635-47" stroke="'+primary+'" stroke-width="8" fill="none"/>';
  if (motif === 'lines') drawing = Array.from({length:15}, (_,i) => '<path d="M'+(145+i*30)+' 80 C '+(260+i*9)+' 315 '+(70+i*37)+' 465 '+(200+i*23)+' 740" stroke="'+secondary+'" stroke-width="3" fill="none" opacity=".7"/>').join('');
  if (motif === 'vase') drawing = '<path d="M302 212h202c-60 143-25 191 15 268 72 151-9 270-115 270S202 631 275 480c40-77 76-125 27-268Z" fill="'+secondary+'" opacity=".85"/><ellipse cx="403" cy="211" rx="101" ry="20" fill="'+primary+'"/><path d="M405 211c-100-95-69-145-8-182" stroke="'+secondary+'" stroke-width="5" fill="none"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="'+primary+'"/><rect x="55" y="55" width="690" height="890" fill="none" stroke="'+secondary+'" stroke-width="1" opacity=".5"/>'+drawing+'<text x="400" y="912" text-anchor="middle" font-size="19" font-family="serif" letter-spacing="7" fill="'+secondary+'">PREVIEW STUDY</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}
export const previewProducts: Product[] = [
 { id:'demo-study-01', name:'Study No. 01 — Arch', description:'Illustrative artwork for the isolated design preview. Not a real catalog item or available for purchase.', category:'Art Print / Preview', price:45, stock:0, product_type:'1-piece', sizes:[{label:'12 × 16 in',price:45},{label:'18 × 24 in',price:70},{label:'24 × 32 in',price:100}], image_url:illustrativeArtwork('#DCD2C3','#806959','arch') },
 { id:'demo-study-02', name:'Study No. 02 — Stillness', description:'Illustrative artwork for the isolated design preview. Not a real catalog item or available for purchase.', category:'Art Print / Preview', price:45, stock:0, product_type:'1-piece', sizes:[{label:'12 × 16 in',price:45},{label:'18 × 24 in',price:70}], image_url:illustrativeArtwork('#D4C4AF','#886B59','circle') },
 { id:'demo-study-03', name:'Study No. 03 — Movement', description:'Illustrative artwork for the isolated design preview. Not a real catalog item or available for purchase.', category:'Art Print / Preview', price:45, stock:0, product_type:'2-piece', sizes:[{label:'12 × 16 in',price:85},{label:'18 × 24 in',price:135}], image_url:illustrativeArtwork('#E9E0D4','#857F70','lines') },
 { id:'demo-study-04', name:'Study No. 04 — Form', description:'Illustrative artwork for the isolated design preview. Not a real catalog item or available for purchase.', category:'Art Print / Preview', price:45, stock:0, product_type:'3-piece', sizes:[{label:'12 × 16 in',price:120},{label:'18 × 24 in',price:180}], image_url:illustrativeArtwork('#B9AA95','#66574C','vase') },
];
export const isIsolatedPreview = process.env.VERCEL_ENV === 'preview';
