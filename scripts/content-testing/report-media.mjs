/** Preserve downloaded evidence in its native browser-supported format. */
export function reportMediaType(file,body){
 if(!/^[-\w]+\.(webp|png|jpe?g|gif|mp4|webm|avif)$/i.test(file))throw Error('Invalid media filename');
 const extension=file.split('.').at(-1).toLowerCase(),hex=body.subarray(0,8).toString('hex');
 if(['jpg','jpeg'].includes(extension)&&hex.startsWith('ffd8ff'))return 'image/jpeg';
 if(extension==='png'&&hex==='89504e470d0a1a0a')return 'image/png';
 if(extension==='webp'&&body.subarray(0,4).toString()==='RIFF'&&body.subarray(8,12).toString()==='WEBP')return 'image/webp';
 if(extension==='gif'&&['GIF87a','GIF89a'].includes(body.subarray(0,6).toString()))return 'image/gif';
 if(extension==='mp4'&&body.subarray(4,8).toString()==='ftyp')return 'video/mp4';
 if(extension==='webm'&&hex.startsWith('1a45dfa3'))return 'video/webm';
 if(extension==='avif'&&body.subarray(4,8).toString()==='ftyp'&&['avif','avis'].includes(body.subarray(8,12).toString()))return 'image/avif';
 throw Error('Media content does not match its format');
}
