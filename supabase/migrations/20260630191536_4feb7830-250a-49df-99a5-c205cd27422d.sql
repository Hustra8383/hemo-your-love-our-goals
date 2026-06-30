
-- Pin search_path on remaining function
create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Restrict EXECUTE on SECURITY DEFINER helpers
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_couple_member(uuid, uuid) from public, anon;
-- authenticated must keep EXECUTE on is_couple_member because RLS policies invoke it
grant execute on function public.is_couple_member(uuid, uuid) to authenticated;

-- Tighten invite redemption
drop policy if exists "invite update authed" on public.invite_codes;
create policy "invite redeem once" on public.invite_codes for update to authenticated
  using (used = false and expires_at > now())
  with check (used = true);

-- Tighten couple update: allow joining via valid unused invite, otherwise members only
drop policy if exists "couples members update" on public.couples;
create policy "couples update member or join" on public.couples for update to authenticated
  using (
    auth.uid() = user_a
    or auth.uid() = user_b
    or (
      user_b is null
      and exists (
        select 1 from public.invite_codes ic
        where ic.couple_id = couples.id
          and ic.used = false
          and ic.expires_at > now()
      )
    )
  )
  with check (auth.uid() = user_a or auth.uid() = user_b);
