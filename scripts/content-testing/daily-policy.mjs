export function dailyPresets(weekday,hasExactWeeklyReport){
 return [...(weekday===2||!hasExactWeeklyReport?['lastWeek']:[]),'wtd','mtd'];
}
