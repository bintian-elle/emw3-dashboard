'use client';
import {useState} from 'react';
import {Dropdown,DropdownTrigger,DropdownPopover} from '@/components/base/dropdown/dropdown';
import {Button} from '@/components/base/buttons/button';
import {Input} from '@/components/base/input/input';
import {RiCloseLine} from '@remixicon/react';
import {CHART_PALETTE,validChartColor} from '@/lib/ai-dashboard-colors';
import {cx} from '@/utils/cx';
export function ChartColorMenu({label,color,open,onOpenChange,onChange,disabled=false}:{disabled?:boolean;label:string;color:string;open:boolean;onOpenChange:(open:boolean)=>void;onChange:(color:string|null)=>void}){
 const [hex,setHex]=useState('');
 return <Dropdown isOpen={open} onOpenChange={onOpenChange}>
  <DropdownTrigger isDisabled={disabled} aria-label={`Change ${label} color`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-caption-1-medium" style={{color}}><span aria-hidden className="h-1 w-4 rounded-full" style={{backgroundColor:color}}/>{label}</DropdownTrigger>
  <DropdownPopover aria-label={`${label} color`} placement="top" className="w-64 p-4" dialogClassName="gap-4">
   <div className="flex flex-col gap-4" onPointerDown={event=>event.stopPropagation()} onMouseDown={event=>event.stopPropagation()} onMouseMove={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key!=='Escape')event.stopPropagation();}}>
   <div className="flex items-center justify-between gap-2"><p className="text-body-medium text-text-primary">{label} color</p><Button iconOnly variant="ghost" size="xs" leadingIcon={RiCloseLine} aria-label="Close color picker" onClick={()=>onOpenChange(false)}/></div>
   <div className="grid grid-cols-4 gap-2" aria-label="Chart color palette">{CHART_PALETTE.map(swatch=><Button key={swatch.value} variant="ghost" size="small" aria-label={`Use ${swatch.label}`} aria-pressed={color===swatch.value} onClick={()=>onChange(swatch.value)} className={cx('size-9 rounded-lg p-1',color===swatch.value?'ring-2 ring-border-focus-ring':'')}><span className="size-7 rounded-md" style={{backgroundColor:swatch.value}}/></Button>)}</div>
   <form className="flex items-end gap-2" onSubmit={event=>{event.preventDefault();if(validChartColor(hex))onChange(hex);}}><Input className="min-w-0 flex-1" label="Hex color" aria-label="Custom hex color" placeholder="#RRGGBB" maxLength={7} value={hex} onChange={setHex}/><Button className="shrink-0" variant="secondary" size="small" type="submit" disabled={!/^#[\da-f]{6}$/i.test(hex)}>Apply</Button></form>
   <Button variant="ghost" size="small" onClick={()=>{setHex('');onChange(null);}}>Reset color</Button>
   </div>
  </DropdownPopover>
 </Dropdown>;
}
