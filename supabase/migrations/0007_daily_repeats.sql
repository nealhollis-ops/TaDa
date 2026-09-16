-- Daily repeats: every day, or weekdays only (Mon - Fri).
alter type public.repeat_t add value if not exists 'daily';
alter type public.repeat_t add value if not exists 'weekdays';
