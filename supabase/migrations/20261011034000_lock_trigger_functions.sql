-- Funções usadas apenas por gatilhos: não ficam expostas como RPC pública.
revoke all on function public.handle_client_status() from public, anon, authenticated;
grant execute on function public.handle_client_status() to service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
