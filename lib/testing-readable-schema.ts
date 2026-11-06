type Schema={type:string;properties:Record<string,unknown>;required:string[];[key:string]:unknown};
export function reportOutputSchema(source:Schema,temporary:boolean,language:'en'|'zh'):Schema{
 if(!source.properties.report_id||!source.properties[language]||!source.properties.en||!source.properties.zh)throw Error('Invalid report output schema');
 return temporary?{...source,properties:{report_id:source.properties.report_id,[language]:source.properties[language]},required:['report_id',language]}:source;
}
