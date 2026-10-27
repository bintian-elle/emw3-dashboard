import type {Widget} from './ai-dashboard.ts';
export type GridLines='none'|'horizontal'|'vertical'|'both';
export type ComponentAppearance={chartData?:boolean;caption?:string|null;legend?:boolean;grid?:GridLines;dataLabels?:'show'|'hide';tableLines?:GridLines;stripedRows?:boolean;density?:'compact'|'comfortable';tableHeader?:boolean};
export type Appearance=Record<string,ComponentAppearance>;
type Component=Pick<Widget,'id'|'kind'>;
const keys=['chartData','caption','legend','grid','dataLabels','tableLines','stripedRows','density','tableHeader'];
const lines=['none','horizontal','vertical','both'];
const defaults:Record<string,unknown>={chartData:true,legend:true,grid:'horizontal',dataLabels:'auto',tableLines:'horizontal',stripedRows:true,density:'comfortable',tableHeader:true};
function object(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid component appearance.');return value as Record<string,unknown>;}
function validateStyle(value:unknown,widget:Component):ComponentAppearance{
 const raw=object(value);if(Object.keys(raw).some(key=>!keys.includes(key)))throw Error('Unsupported appearance field.');
 const chart=widget.kind==='line'||widget.kind==='bar',table=chart||widget.kind==='table';const entries:Array<[string,unknown]>=[];
 for(const [key,value]of Object.entries(raw)){
  if(['chartData','legend','grid','dataLabels'].includes(key)&&!chart)throw Error('Choose a chart for this appearance change.');
  if(['tableLines','stripedRows','density','tableHeader'].includes(key)&&!table)throw Error('Choose a table or chart data table.');
  if(key==='caption'){if(widget.kind!=='metric'||value!==null&&(typeof value!=='string'||!value.trim()||value.length>300))throw Error('Invalid metric caption.');}
  else if(['chartData','legend','stripedRows','tableHeader'].includes(key)){if(typeof value!=='boolean')throw Error('Appearance visibility must be a boolean.');}
  else if(['grid','tableLines'].includes(key)){if(!lines.includes(String(value)))throw Error('Invalid auxiliary line style.');}
  else if(key==='dataLabels'){if(!['show','hide','auto'].includes(String(value)))throw Error('Invalid data label setting.');}
  else if(key==='density'){if(!['compact','comfortable'].includes(String(value)))throw Error('Invalid table density.');}
  if(value!==defaults[key])entries.push([key,key==='caption'&&typeof value==='string'?value.trim():value]);
 }
 return Object.fromEntries(entries) as ComponentAppearance;
}
export function validateAppearance(value:unknown,widgets:Component[]):Appearance{
 if(value===undefined)return{};const raw=object(value),known=new Map(widgets.map(widget=>[widget.id,widget]));const result:Array<[string,ComponentAppearance]>=[];
 for(const [id,style]of Object.entries(raw)){const widget=known.get(id);if(!widget)throw Error('Unknown appearance component.');const valid=validateStyle(style,widget);if(Object.keys(valid).length)result.push([id,valid]);}
 return Object.fromEntries(result);
}
export function applyAppearanceStyle(before:Appearance,widget:Component,value:unknown):Appearance{
 const patch=object(value);if(Object.keys(patch).some(key=>!keys.includes(key)))throw Error('Unsupported appearance field.');
 const style:Record<string,unknown>={...(Object.hasOwn(before,widget.id)?before[widget.id]:{})};
 for(const [key,value]of Object.entries(patch)){
  if(value===null)continue;
  if(key==='caption'){
   const caption=object(value);if(Object.keys(caption).some(key=>!['mode','text'].includes(key)))throw Error('Invalid caption fields.');
   if(caption.mode==='default'&&caption.text===null)delete style.caption;
   else if(caption.mode==='hidden'&&caption.text===null)style.caption=null;
   else if(caption.mode==='custom'&&typeof caption.text==='string')style.caption=caption.text;
   else throw Error('Invalid caption mode.');
   if(widget.kind!=='metric')throw Error('Choose a metric card for a caption change.');
  }else style[key]=value;
 }
 const valid=validateStyle(style,widget),result={...before};if(Object.keys(valid).length)result[widget.id]=valid;else delete result[widget.id];return result;
}
export function reconcileAppearance(appearance:Appearance,widgets:Component[]):Appearance{
 const entries=widgets.flatMap(widget=>{const original=Object.hasOwn(appearance,widget.id)?appearance[widget.id]:{};const chart=widget.kind==='line'||widget.kind==='bar',table=chart||widget.kind==='table';const style=Object.fromEntries(Object.entries(original).filter(([key])=>key==='caption'?widget.kind==='metric':['chartData','legend','grid','dataLabels'].includes(key)?chart:table));return Object.keys(style).length?[[widget.id,style] as const]:[];});return validateAppearance(Object.fromEntries(entries),widgets);
}
const nullableBool={type:['boolean','null']};const nullableEnum=(values:string[])=>({type:['string','null'],enum:[...values,null]});
export const APPEARANCE_SCHEMA={type:'object',additionalProperties:false,properties:{chartData:nullableBool,caption:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:['default','hidden','custom']},text:{type:['string','null']}},required:['mode','text']}]},legend:nullableBool,grid:nullableEnum(lines),dataLabels:nullableEnum(['auto','show','hide']),tableLines:nullableEnum(lines),stripedRows:nullableBool,density:nullableEnum(['compact','comfortable']),tableHeader:nullableBool},required:keys};
