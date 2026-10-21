-- Promote the latest successful Social analysis and its existing Chinese translation.
-- Dated records remain as audit history; the app uses only the singleton key.
begin;
insert into public.testing_ai_readout_cache
(cache_key,readout_type,period_label,period_start,period_end,comparison_label,comparison_start,comparison_end,prompt_version,payload,generated_at,updated_at)
select 'period:social-lifetime',readout_type,period_label,period_start,period_end,comparison_label,comparison_start,comparison_end,prompt_version,payload,generated_at,updated_at
from public.testing_ai_readout_cache where cache_key like 'period:social-lifetime:%'
order by period_end desc,generated_at desc limit 1
on conflict(cache_key) do nothing;
insert into public.testing_ai_readout_translations(cache_key,language,source_hash,payload,generated_at)
select 'period:social-lifetime',t.language,t.source_hash,t.payload,t.generated_at
from public.testing_ai_readout_translations t join public.testing_ai_readout_cache c on c.cache_key=t.cache_key
where c.cache_key=(select cache_key from public.testing_ai_readout_cache where cache_key like 'period:social-lifetime:%' order by period_end desc,generated_at desc limit 1)
on conflict(cache_key,language) do nothing;
commit;
