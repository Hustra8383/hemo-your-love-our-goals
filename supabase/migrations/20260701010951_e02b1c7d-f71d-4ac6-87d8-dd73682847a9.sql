-- Allow couple members (uploader or their partner) to read hemo-media files
DROP POLICY IF EXISTS "hemo_media_select" ON storage.objects;
DROP POLICY IF EXISTS "hemo-media select own" ON storage.objects;
DROP POLICY IF EXISTS "hemo_media select own" ON storage.objects;

CREATE POLICY "hemo_media_select_couple"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hemo-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.couples c
        WHERE (
          (c.user_a = auth.uid() AND c.user_b::text = (storage.foldername(name))[1])
          OR (c.user_b = auth.uid() AND c.user_a::text = (storage.foldername(name))[1])
        )
      )
    )
  );