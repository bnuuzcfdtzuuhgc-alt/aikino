-- Необязательно: ограничения бакета portfolio (размер и типы файлов).
-- Запустить в Supabase → SQL Editor. Повторный запуск безопасен.
update storage.buckets
set file_size_limit = 52428800,  -- 50 МБ на файл
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/avif',
      'video/mp4','video/webm','application/pdf'
    ]
where id = 'portfolio';
