import {isStagingReviewer} from '@/lib/staging-review-policy';
import {Suspense} from 'react';
import {StagingReviewButton} from './review-button';
export function StagingReviewLink({email,language}:{email:string;language:string}){
 if(process.env.DEPLOYMENT_ENV==='staging'||!isStagingReviewer(email))return null;
 return <div className="fixed bottom-4 left-4 z-50"><Suspense fallback={null}><StagingReviewButton language={language}/></Suspense></div>;
}
