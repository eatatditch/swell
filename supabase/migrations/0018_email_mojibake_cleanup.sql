-- Clean up double-encoded em dashes ("Ã¢Â€Â”") in stored email subjects,
-- bodies, and snippets. The pattern was introduced by send paths prior to
-- the RFC 2047 subject-encoding fix; the recipient's mail client
-- re-encoded the raw UTF-8 bytes as CP1252 → UTF-8, leaving a 6-character
-- sequence in place of one em dash.
--
-- Idempotent: rows without the pattern are skipped by the WHERE filter.

update public.email_messages
set subject = replace(subject, E'Ã¢Â€Â”', '—')
where subject like '%' || E'Ã¢Â€Â”' || '%';

update public.email_messages
set body_text = replace(body_text, E'Ã¢Â€Â”', '—')
where body_text like '%' || E'Ã¢Â€Â”' || '%';

update public.email_messages
set body_html = replace(body_html, E'Ã¢Â€Â”', '—')
where body_html like '%' || E'Ã¢Â€Â”' || '%';

update public.email_messages
set snippet = replace(snippet, E'Ã¢Â€Â”', '—')
where snippet like '%' || E'Ã¢Â€Â”' || '%';
