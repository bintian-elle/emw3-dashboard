export const monitoredTasks={
 'emw3-content-testing-reports.service':'Content Testing AI 报告',
 'emw3-testing-data-refresh.service':'Content Testing 数据刷新',
 'emw3-testing-google-refresh.service':'Google Testing 数据刷新',
 'emw3-testing-social-refresh.service':'Social Media 数据刷新',
 'emw3-concluded-tests.service':'已结束测试快照',
 'emw3-ai-insights-refresh.service':'EDM AI Insights',
 'emw3-website-tracking-cache.service':'Website Tracking 数据刷新',
};

export function failureAlreadyReported(service,state,startedAt=0){
 const afterStart=value=>!!value&&(!startedAt||Date.parse(value)>=startedAt);
 if(service==='emw3-content-testing-reports.service'||service==='emw3-concluded-tests.service')return !!state.error&&afterStart(state.failureSent);
 if(service==='emw3-testing-data-refresh.service'||service==='emw3-testing-google-refresh.service'){
  const failed=Object.entries(state.items??{}).filter(([,item])=>item.error&&!item.success);
  return failed.length>0&&failed.every(([key])=>afterStart(state.notifiedKeys?.[key]));
 }
 return false;
}

export function failureMessage(service,result){
 if(!Object.hasOwn(monitoredTasks,service))throw Error('Unknown scheduled task');
 const status=['exit-code','timeout','signal','core-dump','watchdog','resources','protocol','start-limit-hit'].includes(result)?result:'failed';
 return `Dashboard 定时任务失败：${monitoredTasks[service]}\n状态：${status}\n已有数据和报告会保留，请检查任务日志。\nhttps://emw3-dashboard.win/bluevua/testing`;
}
