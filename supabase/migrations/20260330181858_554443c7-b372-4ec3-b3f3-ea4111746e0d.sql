
ALTER TABLE public.payroll_calculations
  ADD COLUMN pdf_path text,
  ADD COLUMN external_results jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payroll-pdfs', 'payroll-pdfs', false);

CREATE POLICY "Allow payroll-pdfs upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payroll-pdfs');

CREATE POLICY "Allow payroll-pdfs read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payroll-pdfs');

CREATE POLICY "Allow payroll-pdfs delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payroll-pdfs');
