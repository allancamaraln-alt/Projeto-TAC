# TecnicoOS — Setup em 10 minutos

## 1. Supabase (banco de dados)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New Project**, escolha um nome e senha
3. Vá em **SQL Editor** → **New query**
4. Cole o conteúdo de `supabase/schema.sql` e execute
5. Vá em **Settings → API** e copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Configurar o projeto

Edite o arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## 4. Deploy no Vercel (gratuito)

1. Crie uma conta em [vercel.com](https://vercel.com)
2. Clique em **Add New Project** → importe do GitHub
3. Na seção **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

O app ficará em `https://seu-projeto.vercel.app`

---

## Uso no celular

No celular, acesse a URL e toque em:
- **Android**: menu ⋮ → "Adicionar à tela inicial"
- **iPhone**: botão compartilhar → "Adicionar à Tela de Início"

O app vai funcionar como um app nativo instalado!
