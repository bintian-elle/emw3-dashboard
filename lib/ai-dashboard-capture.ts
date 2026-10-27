'use client';
/** Capture the live dashboard DOM: no second renderer, restyling or reflow. */
export async function captureDashboardPdf(element:HTMLElement,title:string):Promise<Uint8Array>{
 const [{toPng},{PDFDocument}]=await Promise.all([import('html-to-image'),import('pdf-lib')]);
 await document.fonts.ready;
 await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 const width=element.getBoundingClientRect().width,height=element.scrollHeight;
 if(width<=0||height<=0)throw Error('The dashboard is not ready to export.');
 let ancestor:HTMLElement|null=element,backgroundColor='';
 while(ancestor){const color=getComputedStyle(ancestor).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){backgroundColor=color;break;}ancestor=ancestor.parentElement;}
 const png=await toPng(element,{width,height,pixelRatio:2,backgroundColor:backgroundColor||getComputedStyle(document.body).backgroundColor,filter:node=>!(node instanceof Element&&node.hasAttribute('data-dashboard-control'))});
 const pdf=await PDFDocument.create();pdf.setTitle(title);pdf.setCreator('EMW3 Dashboard Builder');
 const image=await pdf.embedPng(png);
 // One canvas-sized page preserves exact placement and avoids arbitrary page cuts.
 const page=pdf.addPage([width*.75,height*.75]);page.drawImage(image,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 return pdf.save();
}
