## Instant Watermark Studio

AI tool that lets you either add or remove watermarks from images. Live preview [here](https://patiens.vercel.app)

![Instant Watermark Studio](/src/assets/thumbnail.png)

## Features

-   [x] Add watermark to images
-   [x] Remove watermark from images
-   [x] Download modified images
-   [x] Customize watermark

## Getting Started

Follow these steps to set up the project locally on your machine.

Prerequisites

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- [pnpm](https://pnpm.io//) 

**Cloning the Repository**

```bash
git clone https://github.com/thecybermaniac/instant-watermark-studio.git
cd instant-watermark-studio
```

**Installation**

```bash
pnpm install
```

**Setup Environment Variables**

This application was built with [Supabase](https://supabase.com) and to make sure it works properly, you need to register and create a project on Supabase to get the necessary keys. Then, create a new file named `.env` in the root of your project and add the following content:

```ini
VITE_SUPABASE_PROJECT_ID=YOUR_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
```

Replace the placeholder values with your actual Appwrite credentials.

**Running the Project**

```bash
pnpm run dev
```

Open [http://localhost:8000](http://localhost:8000) in your browser to view the project.