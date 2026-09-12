-- Complete the documented defaults without changing the already-applied 0002.
-- These settings do not activate future features or their editing interfaces.
insert into public.app_settings (key, value, description) values
('metrics.min_results_for_verdict', '10', 'PRD section 24 minimum conversions before a verdict. Phase 11.'),
('metrics.cohort_maturity_days', '14', 'PRD section 24 cohort maturity in days. Future quality metrics.'),
('experiments.min_duration_days', '3', 'PRD section 27 experiment review minimum duration. Phase 5.'),
('jobs.max_batch', '500', 'PRD section 21 bounded batch size. Phase 7.'),
('jobs.max_attempts', '5', 'PRD section 21 retry limit. Phase 7.'),
('follow_up.mql_workdays', '2', 'PRD section 19.7 MQL follow-up SLA in workdays. Phase 9.'),
('follow_up.sql_workdays', '3', 'PRD section 19.7 SQL follow-up SLA in workdays. Phase 9.');
