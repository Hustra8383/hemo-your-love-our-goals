
create policy "hemo-media read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'hemo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hemo-media insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'hemo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hemo-media update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'hemo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hemo-media delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hemo-media' and (storage.foldername(name))[1] = auth.uid()::text);
