import {isStagingReviewer} from '@/lib/staging-review-policy';
import {ButtonLink} from '@/components/base/buttons/button';
export function StagingReviewLink({email,language}:{email:string;language:string}){
 if(process.env.DEPLOYMENT_ENV==='staging'||!isStagingReviewer(email))return null;
 return <div className="fixed bottom-4 left-4 z-50"><ButtonLink href="/staging-review" variant="secondary" size="small">{language==='zh'?'查看测试环境':'Review staging'}</ButtonLink></div>;
}
