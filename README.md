# Web de actividades para pareja

Esta carpeta contiene una web simple para guardar actividades y elegir opciones para hacer juntos.

## Qué incluye
- Agregar actividades
- Filtrar por categoría, presupuesto y estado
- Marcar favoritas o hechas
- Elegir una actividad al azar
- Modo local (solo en ese dispositivo)
- Modo compartido con Supabase (ambos ven la misma lista)

## Cómo probarla rápido
Solo abre `index.html` en tu navegador.

## Cómo publicarla gratis
### Opción recomendada: GitHub Pages o Netlify
1. Sube estos archivos a un repositorio de GitHub.
2. Activa GitHub Pages o arrastra la carpeta en Netlify.
3. Comparte el link con tu esposa.

## Cómo hacer que ambos vean la misma información
La página ya está lista para usar Supabase.

### 1) Crea un proyecto en Supabase
### 2) En SQL Editor, pega esto:

```sql
create extension if not exists pgcrypto;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null,
  budget text not null,
  duration text not null,
  status text not null,
  energy text not null,
  notes text
);

alter table public.activities enable row level security;

create policy "Allow anon read"
on public.activities
for select
to anon
using (true);

create policy "Allow anon insert"
on public.activities
for insert
to anon
with check (true);

create policy "Allow anon update"
on public.activities
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete"
on public.activities
for delete
to anon
using (true);
```

### 3) Copia estos datos desde Supabase
- Project URL
- anon public key

### 4) Abre la web y pégalos en “Configuración para compartir entre ambos”

## Siguiente mejora sugerida
- Login para cada uno
- Calendario
- Subir fotos
- Votación tipo “sí / no / tal vez”
- Mapa con lugares cercanos
