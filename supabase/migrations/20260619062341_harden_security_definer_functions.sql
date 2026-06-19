-- Trigger functions do not need to be callable through the Data API.
-- Fix the function search path and remove inherited EXECUTE privileges.

alter function public.handle_new_user()
  set search_path = '';

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
