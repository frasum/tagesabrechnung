
Lasse reaktivieren via UPDATE auf staff-Tabelle.

```sql
UPDATE public.staff SET is_active = true WHERE LOWER(name) = 'lasse';
```

Login `lasse@admin.local` / `FB2026!` mit Admin-Rechten ist dann wieder aktiv.
